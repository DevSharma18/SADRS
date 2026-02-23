import os
import random
from datetime import datetime
from ultralytics import YOLO

# Load models
coco_model = YOLO('yolov8n.pt')

weapon_model_path = os.path.join('weapon_model', 'best.pt')
if os.path.exists(weapon_model_path):
    weapon_model = YOLO(weapon_model_path)
else:
    weapon_model = coco_model

def evaluate_threat(coco_results, weapon_results, camera_id, atm_id):
    threat_level = 'safe'
    label = 'Area clear'
    confidence = 0.0
    detected_objects = []
    weapons_detected = []
    person_count = 0
    
    # Parse COCO results
    for box in coco_results.boxes:
        cls_id = int(box.cls[0])
        conf = float(box.conf[0])
        class_name = coco_model.names[cls_id]
        
        if class_name == 'person':
            person_count += 1
            if conf > confidence:
                confidence = conf
        elif class_name in ['backpack', 'handbag', 'suitcase']:
            detected_objects.append(class_name)
        elif class_name == 'knife':
            weapons_detected.append('knife')
            threat_level = 'critical'
            label = 'Weapon threat'
            if conf > confidence:
                confidence = conf
    
    # Parse Weapon results
    if weapon_model != coco_model:
        for box in weapon_results.boxes:
            cls_id = int(box.cls[0])
            conf = float(box.conf[0])
            class_name = weapon_model.names[cls_id]
            
            if class_name.lower() in ['gun', 'pistol', 'rifle', 'weapon', 'knife', 'firearm']:
                weapons_detected.append(class_name)
                threat_level = 'critical'
                label = 'Weapon threat'
                if conf > confidence:
                    confidence = conf

    # Rule evaluation if no critical weapon threat
    if threat_level != 'critical':
        if person_count >= 3:
            threat_level = 'suspicious'
            label = 'Crowd accumulation'
            confidence = max(confidence, 0.75)
        elif person_count >= 2:
            threat_level = 'high'
            label = 'Shoulder surfing'
            confidence = max(confidence, 0.82)
        elif person_count == 1 and len(detected_objects) > 0:
            threat_level = 'suspicious'
            label = 'Suspicious object'
            confidence = max(confidence, 0.65)
        elif person_count == 1:
            hour = datetime.now().hour
            if hour >= 23 or hour <= 5:
                threat_level = 'medium'
                label = 'Off-hours access'
                confidence = max(confidence, 0.88)
            else:
                threat_level = 'safe'
                label = 'Normal activity'
                confidence = max(confidence, 0.95)
        else:
            threat_level = 'safe'
            label = 'Area clear'
            confidence = 0.99

    # Add random jitter to confidence
    confidence = min(0.99, confidence + (random.random() * 0.05))

    return {
        'threat_level': threat_level,
        'label': label,
        'confidence': round(confidence * 100, 1),
        'detected_objects': detected_objects,
        'weapons_detected': weapons_detected,
        'person_count': person_count,
        'timestamp': datetime.now().isoformat()
    }

def analyze_frame(image_path, camera_id, atm_id):
    try:
        coco_res = coco_model(image_path)[0]
        weapon_res = weapon_model(image_path)[0]
        
        threat = evaluate_threat(coco_res, weapon_res, camera_id, atm_id)
        return threat
    except Exception as e:
        print(f"Error analyzing frame: {e}")
        return {
            'threat_level': 'safe',
            'label': 'Analysis failed',
            'confidence': 0,
            'detected_objects': [],
            'weapons_detected': [],
            'person_count': 0,
            'timestamp': datetime.now().isoformat()
        }
