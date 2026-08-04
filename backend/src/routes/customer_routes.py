from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from src.config.database import get_db
from src.services import customer_service
from src.types.customer_schema import CustomerCreate, CustomerUpdate, CustomerOut
from src.utils.deps import require_active_user

router = APIRouter(prefix="/api/customers", tags=["Customers"])


@router.get("", response_model=list[CustomerOut])          
def list_customers(search: str = "", segment: str = "", status: str = "",
                   db: Session = Depends(get_db), user=Depends(require_active_user)):
    return customer_service.list_customers(db, user, search, segment, status)


@router.post("", response_model=CustomerOut)               
def create_customer(payload: CustomerCreate, db: Session = Depends(get_db),
                    user=Depends(require_active_user)):
    return customer_service.create_customer(db, user, payload)


@router.get("/{customer_id}", response_model=CustomerOut)  
def get_customer(customer_id: int, db: Session = Depends(get_db),
                 user=Depends(require_active_user)):
    return customer_service.get_customer(db, user, customer_id)


@router.put("/{customer_id}", response_model=CustomerOut)  
def update_customer(customer_id: int, payload: CustomerUpdate,
                    db: Session = Depends(get_db), user=Depends(require_active_user)):
    return customer_service.update_customer(db, user, customer_id, payload)


@router.delete("/{customer_id}")                           
def delete_customer(customer_id: int, db: Session = Depends(get_db),
                    user=Depends(require_active_user)):
    return customer_service.delete_customer(db, user, customer_id)