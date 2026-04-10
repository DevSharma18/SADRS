import threading
import time

class ThreatState:
    def __init__(self):
        self.lock = threading.Lock()
        
        # Detection flags (from CCTV and Sensors)
        self.ml_threat_class = "NORMAL"
        self.ml_confidence = 0.0
        self.ml_consecutive_frames = 0
        
        # Corroboration flags
        self.sensor_pir_active = False
        self.sensor_vibration_g = 0.0
        self.sensor_tilt_x = 0.0
        self.sensor_tilt_y = 0.0
        self.sensor_temperature_c = 25.0
        
        # System State
        self.system_status = "ONLINE" # ONLINE, INCIDENT, COOLDOWN
        self.cooldown_until = 0
        self.last_ml_flag_time = 0
        
        # Active Alert Payload for Manager
        self.active_alert = None
        
    def check_corroboration(self):
        """For Hackathon: ML Vision triggers bypass hardware sensor corroboration"""
        with self.lock:
            # Panic PIN bypasses everything
            if self.active_alert and self.active_alert.get('trigger_type') == 'panic_pin':
                return True
                
            # If no ML threat or expired, false
            if self.ml_threat_class == "NORMAL" or time.time() - self.last_ml_flag_time > 10:
                return False
                
            # Direct trigger from ML CCTV
            return True

    def update_ml_detection(self, threat_class, conf):
        with self.lock:
            if threat_class != "NORMAL":
                self.ml_consecutive_frames += 1
                
                # Check 3-frame confirmation logic
                # Night mode drops confidence requirement from 0.55 to 0.45
                current_hour = time.localtime().tm_hour
                conf_threshold = 0.45 if (current_hour >= 23 or current_hour <= 5) else 0.55
                
                if self.ml_consecutive_frames >= 3 and conf >= conf_threshold:
                    self.ml_threat_class = threat_class
                    self.ml_confidence = conf
                    self.last_ml_flag_time = time.time()
            else:
                self.ml_consecutive_frames = 0
                
    def set_panic_pin(self):
        with self.lock:
            self.active_alert = {
                "trigger_type": "panic_pin",
                "threat_class": "COVERT_DURESS",
                "confidence_score": 1.0,
                "sensor_snapshot": self._get_snapshot()
            }
            
    def set_tamper(self, vibration):
        with self.lock:
            self.sensor_vibration_g = vibration
            self.last_ml_flag_time = time.time() # allow checking

    def _get_snapshot(self):
        return {
            "vibration_g": round(self.sensor_vibration_g, 4),
            "tilt_x": round(self.sensor_tilt_x, 2),
            "tilt_y": round(self.sensor_tilt_y, 2),
            "temperature_c": round(self.sensor_temperature_c, 2),
            "pir_triggered": self.sensor_pir_active
        }
