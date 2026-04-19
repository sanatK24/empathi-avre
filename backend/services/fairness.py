from models import Vendor

class FairnessManager:
    @staticmethod
    def calculate_fairness_boost(vendor: Vendor) -> float:
        """
        Calculates a boost or penalty to ensure fair exposure.
        If a vendor's 'fairness_penalty' is high (meaning they have been picked many times recently),
        this returns a negative value.
        """
        # Simple implementation: subtract a small fraction of their penalty
        # Higher penalty = lower score boost
        boost = 1.0 / (1.0 + vendor.fairness_penalty)
        return boost

    @staticmethod
    def update_penalty(vendor: Vendor, increment: float = 0.1):
        """
        Called when a vendor is selected or shown top-1.
        """
        vendor.fairness_penalty += increment
