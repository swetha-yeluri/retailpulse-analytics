
from datetime import datetime

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String

from src.config.database import Base


class InventoryMovement(Base):
    __tablename__ = "inventory_movements"

    id = Column(Integer, primary_key=True, index=True)
    inventory_id = Column(Integer, ForeignKey("inventory.id"), nullable=False)
    movement_type = Column(String, nullable=False)
    quantity_changed = Column(Integer, default=0)
    previous_quantity = Column(Integer, default=0)
    updated_quantity = Column(Integer, default=0)
    reason = Column(String, nullable=True)
    remarks = Column(String, nullable=True)
    performed_by = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)