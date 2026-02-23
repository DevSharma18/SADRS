import os
import shutil
from ultralytics import YOLO

if __name__ == "__main__":
    print("Initializing YOLOv8 models...")
    # This will download yolov8n.pt automatically if not present
    _ = YOLO('yolov8n.pt')
    
    weapon_model_dir = "weapon_model"
    weapon_model_path = os.path.join(weapon_model_dir, "best.pt")
    
    # Placeholder for weapon model download
    os.makedirs(weapon_model_dir, exist_ok=True)
    if not os.path.exists(weapon_model_path):
        print(f"No specific weapon model found at {weapon_model_path}.")
        print("For prototype purposes, falling back to yolov8n.pt for weapon detection shell.")
        shutil.copy('yolov8n.pt', weapon_model_path)
    
    print("Setup complete.")
