import os
import sys
import pandas as pd
import numpy as np
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from typing import Tuple, List

# Add backend directory to path so we can import config, database, models, services
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from config import settings
from models import Match, Request, Vendor, Inventory, MatchStatus
from services.feature_store import FeatureStore

class RankingDataset:
    def __init__(self, db_url: str = None):
        if db_url is None:
            # Fallback handling to resolve exact absolute path for SQLite
            db_url = settings.DATABASE_URL
            if db_url.startswith("sqlite:///"):
                # Handle relative paths properly
                db_path = db_url.replace("sqlite:///", "")
                if not os.path.isabs(db_path):
                    # Try finding in root and backend directories
                    possible_paths = [
                        os.path.join(os.getcwd(), db_path),
                        os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), db_path)
                    ]
                    for p in possible_paths:
                        if os.path.exists(p):
                            db_url = f"sqlite:///{os.path.abspath(p)}"
                            break
        
        self.engine = create_engine(db_url)
        self.Session = sessionmaker(bind=self.engine)

    def get_training_data(self) -> Tuple[pd.DataFrame, np.ndarray, np.ndarray]:
        """
        Builds a high-fidelity list-wise ranking dataset directly from active database matches.
        Uses FeatureStore to build exactly the 11 standardized features for full train-serving parity.
        """
        session = self.Session()
        try:
            matches = session.query(Match).order_by(Match.request_id).all()
            if not matches:
                return pd.DataFrame(), np.array([]), np.array([])
                
            features_list = []
            labels = []
            group_ids = []
            
            # Map MatchStatus to high-fidelity LTR relevance grades
            label_map = {
                MatchStatus.COMPLETED: 3,
                MatchStatus.ACCEPTED_BY_REQUESTER: 2,
                MatchStatus.ACCEPTED_BY_VENDOR: 2,
                MatchStatus.PENDING: 1,
                MatchStatus.REJECTED_BY_VENDOR: 0,
                MatchStatus.CANCELLED_BY_REQUESTER: 0
            }
            
            for m in matches:
                req = m.request
                vendor = m.vendor
                if not req or not vendor:
                    continue
                    
                # Get matching inventory item
                inv = session.query(Inventory).filter(
                    Inventory.vendor_id == vendor.id,
                    Inventory.category == req.category
                ).first()
                
                # Build exact 11 standardized features
                features = FeatureStore.build_request_features(req, vendor, inv)
                
                # Determine LTR relevance label
                label = label_map.get(m.status, 1)
                if m.selected_flag:
                    label = max(label, 2)
                    
                features_list.append(features)
                labels.append(label)
                group_ids.append(req.id)
                
            if not features_list:
                return pd.DataFrame(), np.array([]), np.array([])
                
            X = pd.DataFrame(features_list)
            y = np.array(labels)
            groups = np.array(group_ids)
            
            return X, y, groups
        finally:
            session.close()

    @staticmethod
    def get_group_sizes(groups: np.ndarray) -> List[int]:
        if len(groups) == 0:
            return []
        
        # Count consecutive identical group_ids for list-wise query ranking
        sizes = []
        current_group = groups[0]
        count = 0
        for group in groups:
            if group == current_group:
                count += 1
            else:
                sizes.append(count)
                current_group = group
                count = 1
        sizes.append(count)
        return sizes
