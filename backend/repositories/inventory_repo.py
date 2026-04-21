from typing import List, Optional
from sqlalchemy.orm import Session
from models import Inventory
from repositories.base_repo import BaseRepo

class InventoryRepo(BaseRepo[Inventory]):
    def __init__(self):
        super().__init__(Inventory)

    def get_by_vendor(self, db: Session, vendor_id: int) -> List[Inventory]:
        return db.query(Inventory).filter(Inventory.vendor_id == vendor_id).all()

    def get_by_resource(self, db: Session, vendor_id: int, resource_name: str) -> Optional[Inventory]:
        return db.query(Inventory).filter(
            Inventory.vendor_id == vendor_id,
            Inventory.resource_name == resource_name
        ).first()

    def get_low_stock(self, db: Session, vendor_id: int) -> List[Inventory]:
        return db.query(Inventory).filter(
            Inventory.vendor_id == vendor_id,
            Inventory.quantity <= Inventory.reorder_level
        ).all()

    def reserve_stock(self, db: Session, inventory_id: int, amount: int) -> bool:
        inventory = self.get(db, inventory_id)
        if inventory and (inventory.quantity - inventory.reserved_quantity) >= amount:
            inventory.reserved_quantity += amount
            db.commit()
            return True
        return False

    def release_stock(self, db: Session, inventory_id: int, amount: int):
        inventory = self.get(db, inventory_id)
        if inventory:
            inventory.reserved_quantity = max(0, inventory.reserved_quantity - amount)
            db.commit()

inventory_repo = InventoryRepo()
