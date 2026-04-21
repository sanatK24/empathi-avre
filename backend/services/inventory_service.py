from typing import List, Optional
from sqlalchemy.orm import Session
from models import Vendor, Inventory
from schemas import InventoryCreate
from repositories.inventory_repo import inventory_repo
from core.exceptions import NotFoundException, ValidationException
from services.audit import AuditService

class InventoryService:
    @staticmethod
    def add_or_update_item(db: Session, vendor: Vendor, data: InventoryCreate) -> Inventory:
        existing_item = inventory_repo.get_by_resource(db, vendor.id, data.resource_name)
        
        if existing_item:
            # Atomic increase to handle double-entry scenarios
            existing_item.quantity += data.quantity
            if data.price:
                existing_item.price = data.price
            item = existing_item
            AuditService.log(db, "inventory_replenished", user_id=vendor.user_id, resource_id=item.id, resource_type="inventory")
        else:
            # Create new entry
            item = Inventory(vendor_id=vendor.id, **data.dict())
            db.add(item)
            AuditService.log(db, "inventory_item_added", user_id=vendor.user_id, resource_id=item.id, resource_type="inventory")
            
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def update_stock(db: Session, inventory_id: int, quantity: int, price: Optional[float] = None) -> Inventory:
        item = inventory_repo.get(db, inventory_id)
        if not item:
            raise NotFoundException("Inventory item")
            
        item.quantity = quantity
        if price is not None:
            item.price = price
            
        db.commit()
        db.refresh(item)
        return item

    @staticmethod
    def delete_item(db: Session, inventory_id: int):
        item = inventory_repo.get(db, inventory_id)
        if not item:
            raise NotFoundException("Inventory item")
        db.delete(item)
        db.commit()
