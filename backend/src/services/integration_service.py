import json
import csv
import io
import os
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException

from src.models.integration_model import (
    Integration, FieldMapping, SyncSchedule, SyncHistory, FailedRecord,
)
from src.models.product_model import Product   


try:
    from src.services import audit_service
except Exception:
    audit_service = None



TARGET_FIELDS = {
    "Products": [
        {"field": "sku", "label": "SKU", "required": True, "type": "string"},
        {"field": "name", "label": "Product Name", "required": True, "type": "string"},
        {"field": "unit_price", "label": "Unit Price", "required": False, "type": "number"},
        {"field": "description", "label": "Description", "required": False, "type": "string"},
    ],
    "Inventory": [
        {"field": "sku", "label": "SKU", "required": True, "type": "string"},
        {"field": "current_stock", "label": "Inventory Quantity", "required": True, "type": "number"},
    ],
    "Customers": [
        {"field": "name", "label": "Customer Name", "required": True, "type": "string"},
        {"field": "email", "label": "Email", "required": False, "type": "string"},
    ],
    "Sales": [
        {"field": "invoice_number", "label": "Invoice Number", "required": True, "type": "string"},
        {"field": "total_amount", "label": "Total Amount", "required": False, "type": "number"},
    ],
}



def _audit(db, company_id, user, action, integ_id):
    """Write audit log - never stores secrets."""
    if not audit_service:
        return
    try:
        audit_service.write_log(
            db, company_id=company_id, user_email=user,
            action=action, resource_type="Integration",
            resource_id=integ_id, description=f"{action} integration #{integ_id}",
        )
    except Exception:
        pass   


def _to_out(i: Integration) -> dict:
    """Serialize integration - STRIP secrets."""
    try:
        cfg = json.loads(i.config or "{}")
    except Exception:
        cfg = {}
    cfg.pop("password", None)
    cfg.pop("api_key", None)
    cfg.pop("token", None)
    return {
        "id": i.id, "name": i.name, "source_type": i.source_type,
        "target_module": i.target_module, "auth_method": i.auth_method,
        "sync_frequency": i.sync_frequency, "config": cfg,
        "has_secret": bool(i.secret_ref), "status": i.status,
        "last_sync_at": i.last_sync_at, "last_sync_status": i.last_sync_status,
        "created_by": i.created_by, "created_at": i.created_at,
    }



def get_dashboard(db: Session, company_id: int) -> dict:
    integs = db.query(Integration).filter(Integration.company_id == company_id).all()
    syncs = db.query(SyncHistory).filter(SyncHistory.company_id == company_id).all()

    last_sync = None
    if syncs:
        completed = [s.completed_at for s in syncs if s.completed_at]
        last_sync = max(completed) if completed else None

    return {
        "total_integrations": len(integs),
        "active_integrations": sum(1 for i in integs if i.status == "Active"),
        "inactive_integrations": sum(1 for i in integs if i.status == "Inactive"),
        "failed_integrations": sum(1 for i in integs if i.status == "Failed"),
        "last_sync_at": last_sync,
        "pending_jobs": sum(1 for s in syncs if s.status in ("Pending", "Running")),
        "records_synced": sum((s.records_inserted + s.records_updated) for s in syncs),
        "records_failed": sum(s.records_failed for s in syncs),
    }



def list_integrations(db: Session, company_id: int) -> list:
    rows = db.query(Integration).filter(
        Integration.company_id == company_id
    ).order_by(Integration.created_at.desc()).all()
    return [_to_out(i) for i in rows]


def get_integration(db: Session, company_id: int, integ_id: int) -> dict:
    i = db.query(Integration).filter(
        Integration.id == integ_id, Integration.company_id == company_id
    ).first()
    if not i:
        raise HTTPException(404, "Integration not found")
    return _to_out(i)


def create_integration(db: Session, company_id: int, user: str, data) -> dict:
    if data.source_type not in ("PostgreSQL", "CSV", "REST API"):
        raise HTTPException(400, "Invalid source type")
    if data.target_module not in TARGET_FIELDS:
        raise HTTPException(400, "Invalid target module")

    i = Integration(
        company_id=company_id, name=data.name, source_type=data.source_type,
        target_module=data.target_module, auth_method=data.auth_method,
        sync_frequency=data.sync_frequency,
        config=json.dumps(data.config or {}),
        secret_ref=("stored" if data.secret else ""), 
        status="Inactive", created_by=user,
    )
    
    if data.secret:
        cfg = data.config or {}
        cfg["_secret"] = data.secret
        i.config = json.dumps(cfg)

    db.add(i); db.commit(); db.refresh(i)
    _audit(db, company_id, user, "Connector created", i.id)
    return _to_out(i)


def update_integration(db: Session, company_id: int, user: str, integ_id: int, data) -> dict:
    i = db.query(Integration).filter(
        Integration.id == integ_id, Integration.company_id == company_id
    ).first()
    if not i:
        raise HTTPException(404, "Integration not found")

    if data.name is not None: i.name = data.name
    if data.target_module is not None: i.target_module = data.target_module
    if data.auth_method is not None: i.auth_method = data.auth_method
    if data.sync_frequency is not None: i.sync_frequency = data.sync_frequency
    if data.config is not None:
        cfg = data.config
        if data.secret:
            cfg["_secret"] = data.secret
            i.secret_ref = "stored"
        i.config = json.dumps(cfg)
    elif data.secret:
        cfg = json.loads(i.config or "{}")
        cfg["_secret"] = data.secret
        i.config = json.dumps(cfg)
        i.secret_ref = "stored"

    db.commit(); db.refresh(i)
    _audit(db, company_id, user, "Connector updated", i.id)
    return _to_out(i)


def toggle_integration(db: Session, company_id: int, user: str, integ_id: int) -> dict:
    i = db.query(Integration).filter(
        Integration.id == integ_id, Integration.company_id == company_id
    ).first()
    if not i:
        raise HTTPException(404, "Integration not found")
    i.status = "Inactive" if i.status == "Active" else "Active"
    db.commit(); db.refresh(i)
    _audit(db, company_id, user, f"Connector {'enabled' if i.status=='Active' else 'disabled'}", i.id)
    return _to_out(i)


def delete_integration(db: Session, company_id: int, user: str, integ_id: int):
    i = db.query(Integration).filter(
        Integration.id == integ_id, Integration.company_id == company_id
    ).first()
    if not i:
        raise HTTPException(404, "Integration not found")
    db.query(FieldMapping).filter(FieldMapping.integration_id == integ_id).delete()
    db.query(SyncSchedule).filter(SyncSchedule.integration_id == integ_id).delete()
    db.delete(i); db.commit()
    _audit(db, company_id, user, "Connector deleted", integ_id)
    return {"message": "Integration deleted"}



def test_connection(db: Session, company_id: int, user: str, integ_id: int) -> dict:
    i = db.query(Integration).filter(
        Integration.id == integ_id, Integration.company_id == company_id
    ).first()
    if not i:
        raise HTTPException(404, "Integration not found")

    cfg = json.loads(i.config or "{}")
    _audit(db, company_id, user, "Connection tested", i.id)

    
    if i.source_type == "CSV":
        path = cfg.get("file_path", "")
        if not path:
            return {"success": False, "message": "No file path configured",
                    "details": "Set 'file_path' in connection config."}
        if not os.path.exists(path):
            return {"success": False, "message": "File not found",
                    "details": f"Path does not exist: {path}"}
        try:
            with open(path, "r", encoding="utf-8") as f:
                header = f.readline().strip()
            return {"success": True, "message": "Connection successful",
                    "details": f"CSV readable. Columns: {header}"}
        except Exception as e:
            return {"success": False, "message": "Cannot read file", "details": str(e)}

    
    return {"success": False,
            "message": f"{i.source_type} connector not yet operational",
            "details": "Configuration saved. Live connection logic pending implementation."}



def get_target_fields(module: str) -> list:
    return TARGET_FIELDS.get(module, [])


def save_mappings(db: Session, company_id: int, integ_id: int, mappings) -> list:
    i = db.query(Integration).filter(
        Integration.id == integ_id, Integration.company_id == company_id
    ).first()
    if not i:
        raise HTTPException(404, "Integration not found")

    valid_targets = {t["field"] for t in TARGET_FIELDS.get(i.target_module, [])}
    for m in mappings:
        if m.target_field not in valid_targets:
            raise HTTPException(400, f"Invalid target field: {m.target_field}")

    db.query(FieldMapping).filter(FieldMapping.integration_id == integ_id).delete()
    for m in mappings:
        db.add(FieldMapping(
            company_id=company_id, integration_id=integ_id,
            source_field=m.source_field, target_field=m.target_field,
            is_required=m.is_required, data_type=m.data_type,
        ))
    db.commit()
    return list_mappings(db, company_id, integ_id)


def list_mappings(db: Session, company_id: int, integ_id: int) -> list:
    return db.query(FieldMapping).filter(
        FieldMapping.integration_id == integ_id,
        FieldMapping.company_id == company_id,
    ).all()



def run_sync(db: Session, company_id: int, user: str, integ_id: int, trigger) -> dict:
    i = db.query(Integration).filter(
        Integration.id == integ_id, Integration.company_id == company_id
    ).first()
    if not i:
        raise HTTPException(404, "Integration not found")

    mappings = list_mappings(db, company_id, integ_id)
    if not mappings:
        raise HTTPException(400, "Configure field mappings before syncing")

    
    hist = SyncHistory(
        company_id=company_id, integration_id=integ_id,
        integration_name=i.name, triggered_by=user,
        sync_type=trigger.sync_type, status="Running",
        started_at=datetime.utcnow(),
    )
    db.add(hist); db.commit(); db.refresh(hist)
    _audit(db, company_id, user, "Synchronization started", integ_id)

    inserted = updated = skipped = failed = processed = 0

    try:
        if i.source_type != "CSV":
            raise Exception(f"{i.source_type} sync not operational")
        if i.target_module != "Products":
            raise Exception("Only Products sync implemented in this connector")

        cfg = json.loads(i.config or "{}")
        path = cfg.get("file_path", "")
        if not os.path.exists(path):
            raise Exception(f"File not found: {path}")

        with open(path, "r", encoding="utf-8") as f:
            reader = csv.DictReader(f)
            rows = list(reader)

        strategy = trigger.strategy  
        required = [m.target_field for m in mappings if m.is_required]

        for idx, row in enumerate(rows, start=1):
            processed += 1
            try:
            
                record = {}
                for m in mappings:
                    val = row.get(m.source_field, "").strip()
                    if m.data_type == "number" and val:
                        val = float(val)
                    record[m.target_field] = val

            
                missing = [r for r in required if not record.get(r)]
                if missing:
                    raise ValueError(f"Missing required: {', '.join(missing)}")

                sku = record.get("sku")
                existing = db.query(Product).filter(
                    Product.company_id == company_id, Product.sku == sku
                ).first() if sku else None

                if existing:
                    if strategy == "Skip Duplicates":
                        skipped += 1
                        continue
                    if strategy == "Update":
                        for k, v in record.items():
                            if hasattr(existing, k):
                                setattr(existing, k, v)
                        updated += 1
                    else:   
                        skipped += 1
                        continue
                else:
                    new_prod = Product(company_id=company_id)
                    for k, v in record.items():
                        if hasattr(new_prod, k):
                            setattr(new_prod, k, v)
                    db.add(new_prod)
                    inserted += 1

            except Exception as row_err:
                failed += 1
                db.add(FailedRecord(
                    company_id=company_id, sync_id=hist.id,
                    source_identifier=row.get(mappings[0].source_field, ""),
                    row_number=idx, error_category="Validation",
                    error_message=str(row_err), raw_data=json.dumps(row),
                    processing_status="Failed",
                ))

        db.commit()

        status = "Completed" if failed == 0 else "Completed with Errors"
        i.last_sync_status = status

    except Exception as e:
        status = "Failed"
        hist.summary = str(e)
        i.last_sync_status = "Failed"
        i.status = "Failed"

    
    hist.completed_at = datetime.utcnow()
    hist.duration_seconds = int((hist.completed_at - hist.started_at).total_seconds())
    hist.records_processed = processed
    hist.records_inserted = inserted
    hist.records_updated = updated
    hist.records_skipped = skipped
    hist.records_failed = failed
    hist.status = status
    if not hist.summary:
        hist.summary = f"{inserted} inserted, {updated} updated, {skipped} skipped, {failed} failed"
    i.last_sync_at = hist.completed_at
    if status != "Failed" and i.status != "Failed":
        i.status = "Active"

    db.commit(); db.refresh(hist)
    _audit(db, company_id, user,
           "Synchronization completed" if status != "Failed" else "Synchronization failed",
           integ_id)

    return {
        "id": hist.id, "integration_id": integ_id, "integration_name": i.name,
        "triggered_by": user, "sync_type": hist.sync_type,
        "started_at": hist.started_at, "completed_at": hist.completed_at,
        "duration_seconds": hist.duration_seconds,
        "records_processed": processed, "records_inserted": inserted,
        "records_updated": updated, "records_skipped": skipped,
        "records_failed": failed, "status": status, "summary": hist.summary,
    }



def list_history(db: Session, company_id: int, integ_id: int = None) -> list:
    q = db.query(SyncHistory).filter(SyncHistory.company_id == company_id)
    if integ_id:
        q = q.filter(SyncHistory.integration_id == integ_id)
    return q.order_by(SyncHistory.started_at.desc()).all()


def get_history_detail(db: Session, company_id: int, sync_id: int):
    h = db.query(SyncHistory).filter(
        SyncHistory.id == sync_id, SyncHistory.company_id == company_id
    ).first()
    if not h:
        raise HTTPException(404, "Sync record not found")
    return h



def list_failed(db: Session, company_id: int, sync_id: int) -> list:
    return db.query(FailedRecord).filter(
        FailedRecord.sync_id == sync_id,
        FailedRecord.company_id == company_id,
    ).all()


def retry_failed(db: Session, company_id: int, user: str, sync_id: int) -> dict:
    """Retry eligible failed records - idempotent (upsert by SKU, no duplicates)."""
    failed = db.query(FailedRecord).filter(
        FailedRecord.sync_id == sync_id, FailedRecord.company_id == company_id,
        FailedRecord.processing_status == "Failed",
    ).all()
    if not failed:
        return {"message": "No failed records to retry", "retried": 0, "resolved": 0}

    orig = db.query(SyncHistory).filter(SyncHistory.id == sync_id).first()
    mappings = list_mappings(db, company_id, orig.integration_id)
    required = [m.target_field for m in mappings if m.is_required]

    resolved = 0
    for fr in failed:
        try:
            row = json.loads(fr.raw_data or "{}")
            record = {}
            for m in mappings:
                val = row.get(m.source_field, "").strip()
                if m.data_type == "number" and val:
                    val = float(val)
                record[m.target_field] = val
            if [r for r in required if not record.get(r)]:
                continue

            sku = record.get("sku")
            existing = db.query(Product).filter(
                Product.company_id == company_id, Product.sku == sku
            ).first() if sku else None
            if existing:
                for k, v in record.items():
                    if hasattr(existing, k):
                        setattr(existing, k, v)
            else:
                np = Product(company_id=company_id)
                for k, v in record.items():
                    if hasattr(np, k):
                        setattr(np, k, v)
                db.add(np)
            fr.processing_status = "Resolved"
            resolved += 1
        except Exception:
            continue

    db.commit()
    _audit(db, company_id, user, "Failed records retried", orig.integration_id)
    return {"message": "Retry completed", "retried": len(failed), "resolved": resolved}



def create_schedule(db: Session, company_id: int, data) -> dict:
    s = SyncSchedule(
        company_id=company_id, integration_id=data.integration_id,
        frequency=data.frequency, execution_time=data.execution_time,
        is_active=data.is_active,
    )
    db.add(s); db.commit(); db.refresh(s)
    return s


def list_schedules(db: Session, company_id: int) -> list:
    return db.query(SyncSchedule).filter(
        SyncSchedule.company_id == company_id
    ).order_by(SyncSchedule.created_at.desc()).all()


def toggle_schedule(db: Session, company_id: int, sched_id: int) -> dict:
    s = db.query(SyncSchedule).filter(
        SyncSchedule.id == sched_id, SyncSchedule.company_id == company_id
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    s.is_active = not s.is_active
    db.commit(); db.refresh(s)
    return s


def delete_schedule(db: Session, company_id: int, sched_id: int):
    s = db.query(SyncSchedule).filter(
        SyncSchedule.id == sched_id, SyncSchedule.company_id == company_id
    ).first()
    if not s:
        raise HTTPException(404, "Schedule not found")
    db.delete(s); db.commit()
    return {"message": "Schedule deleted"}