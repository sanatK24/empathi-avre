from typing import List
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session
from database import get_db
from models import User, Vendor
from schemas import InventoryCreate, InventoryUpdate, InventoryResponse
from api.deps import get_active_user
from services.inventory_service import InventoryService
from repositories.vendor_repo import vendor_repo
from repositories.inventory_repo import inventory_repo
from core.exceptions import NotFoundException

router = APIRouter()

@router.post("", response_model=InventoryResponse)
def add_inventory(
    data: InventoryCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    if not vendor:
        raise NotFoundException("Vendor profile")
    return InventoryService.add_or_update_item(db, vendor, data)

@router.get("", response_model=List[InventoryResponse])
def get_my_inventory(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    if not vendor:
        raise NotFoundException("Vendor profile")
    return inventory_repo.get_by_vendor(db, vendor.id)

@router.put("/{inventory_id}", response_model=InventoryResponse)
def update_inventory_item(
    inventory_id: int,
    update_data: InventoryUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    # Security check: ensure item belongs to current vendor
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    item = inventory_repo.get(db, inventory_id)
    if not item or not vendor or item.vendor_id != vendor.id:
        raise NotFoundException("Inventory item")
    
    # Only update provided fields
    if update_data.quantity is not None:
        item.quantity = update_data.quantity
    if update_data.price is not None:
        item.price = update_data.price
    if update_data.description is not None:
        item.description = update_data.description
    if update_data.reorder_level is not None:
        item.reorder_level = update_data.reorder_level
    
    db.commit()
    db.refresh(item)
    return item

@router.delete("/{inventory_id}")
def delete_inventory_item(
    inventory_id: int,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_active_user)
):
    vendor = vendor_repo.get_by_user_id(db, current_user.id)
    item = inventory_repo.get(db, inventory_id)
    if not item or not vendor or item.vendor_id != vendor.id:
        raise NotFoundException("Inventory item")
        
    InventoryService.delete_item(db, inventory_id)
    return {"message": "Item deleted successully"}
