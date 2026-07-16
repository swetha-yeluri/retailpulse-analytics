
from typing import Optional
from pydantic import BaseModel, Field


class CategoryCreate(BaseModel):
    name: str = Field(..., min_length=1)
    description: Optional[str] = None
    status: str = "Active"


class CategoryUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None


class CategoryOut(BaseModel):
    id: int
    name: str
    description: Optional[str] = None
    status: str
    product_count: int = 0

    class Config:
        from_attributes = True