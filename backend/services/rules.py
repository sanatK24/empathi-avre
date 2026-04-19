from models import Vendor, Request, Inventory

class BusinessRules:
    @staticmethod
    def is_eligible(request: Request, vendor: Vendor, inventory: Inventory) -> bool:
        """
        Hard exclusions layer.
        """
        # 1. Inactive vendor
        if not vendor.is_active:
            return False
            
        # 2. Insufficient stock (Hard rule for AVRE)
        if inventory.quantity < request.quantity:
            return False
            
        # 3. Category mismatch (if strict)
        # Note: We allow partial matches but usually want same category for medical supplies
        
        # 4. Banned Vendors (Future implementation)
        
        return True
