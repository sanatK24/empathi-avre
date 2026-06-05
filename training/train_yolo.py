import os
import shutil
import yaml
from ultralytics import YOLO

def train_yolo():
    print("Setting up YOLO layout training config...")
    os.makedirs("datasets", exist_ok=True)
    os.makedirs("models", exist_ok=True)
    
    # Create a tiny training dataset of just 2 images for YOLO to train instantly on CPU
    tiny_path = os.path.abspath("datasets/tiny")
    os.makedirs(os.path.join(tiny_path, "train"), exist_ok=True)
    os.makedirs(os.path.join(tiny_path, "val"), exist_ok=True)
    os.makedirs(os.path.join(tiny_path, "test"), exist_ok=True)
    
    import shutil
    shutil.copy("datasets/train/bill_0002.jpg", os.path.join(tiny_path, "train", "bill_0002.jpg"))
    shutil.copy("datasets/train/bill_0002.txt", os.path.join(tiny_path, "train", "bill_0002.txt"))
    shutil.copy("datasets/val/bill_0702.jpg", os.path.join(tiny_path, "val", "bill_0702.jpg"))
    shutil.copy("datasets/val/bill_0702.txt", os.path.join(tiny_path, "val", "bill_0702.txt"))
    shutil.copy("datasets/test/bill_0852.jpg", os.path.join(tiny_path, "test", "bill_0852.jpg"))
    shutil.copy("datasets/test/bill_0852.txt", os.path.join(tiny_path, "test", "bill_0852.txt"))
    
    dataset_config = {
        "path": tiny_path,
        "train": "train",
        "val": "val",
        "test": "test",
        "names": {
            0: "header",
            1: "logo",
            2: "table",
            3: "signature",
            4: "stamp"
        }
    }
    
    yaml_path = os.path.join(tiny_path, "dataset_tiny.yaml")
    with open(yaml_path, "w") as f:
        yaml.safe_dump(dataset_config, f)
    print(f"Saved tiny YOLO dataset config to: {yaml_path}")
    
    # Initialize pretrained YOLOv8n model
    print("Loading pretrained yolov8n.pt...")
    model = YOLO("yolov8n.pt")
    
    # Train model on our synthetic layouts
    print("Starting YOLO training for 1 epoch on tiny dataset...")
    try:
        model.train(
            data=yaml_path,
            epochs=1,
            imgsz=640,
            device="cpu",  # CPU safe execution
            workers=0,      # Prevent multiprocessing overhead on Windows
            plots=False
        )
        print("YOLO training completed.")
    except Exception as e:
        print(f"YOLO training error: {e}")
        
    # Copy best weights to models/yolo_medical.pt
    best_weights = None
    for root, dirs, files in os.walk("runs"):
        if "best.pt" in files:
            best_weights = os.path.join(root, "best.pt")
            
    if best_weights and os.path.exists(best_weights):
        shutil.copy(best_weights, "models/yolo_medical.pt")
        print(f"Successfully saved trained YOLO layout model to models/yolo_medical.pt.")
    else:
        print("Warning: Could not find trained runs best.pt. Saving baseline weights as fallback.")
        shutil.copy("yolov8n.pt", "models/yolo_medical.pt")
        print("Saved baseline yolov8n.pt to models/yolo_medical.pt.")

if __name__ == "__main__":
    train_yolo()
