import time
import os
import threading
import requests
import json
import cv2
import hmac
import hashlib
from dotenv import load_dotenv

from threat_state import ThreatState
from cctv_inference import CCTVInference
from input_monitor import InputMonitor
from clip_extractor import ClipExtractor
from stream_server import FrameHolder, start_stream_server

load_dotenv()

API_URL = "http://localhost:5000/api/v1/incidents"
HEARTBEAT_URL = "http://localhost:5000/api/v1/heartbeat"
API_SECRET_KEY = os.getenv("EDGE_API_SECRET", "sadrs-secret-key-12345")
ATM_ID = "atm-sim-webcam-01"

class MainController:
    def __init__(self):
        self.state        = ThreatState()
        self.frame_holder = FrameHolder()
        # draw_dashboard passed as overlay callback so CCTVInference can apply
        # the SADRS status banner on every frame inside the capture loop.
        self.cctv         = CCTVInference(
            self.state, self.frame_holder,
            draw_overlay_fn=self.draw_dashboard,
        )
        self.input_monitor = InputMonitor(self.state)
        self.extractor     = ClipExtractor()
        self.latitude, self.longitude, self.location_name = self.get_geo_location()

    def get_geo_location(self):
        """Fetches real-world lat/lng for this device via IP geolocation."""
        try:
            resp = requests.get("http://ip-api.com/json/", timeout=5)
            data = resp.json()
            if data.get('status') == 'success':
                lat = data['lat']
                lng = data['lon']
                city = data.get('city', 'Unknown')
                region = data.get('regionName', '')
                loc_name = f"{city}, {region}"
                print(f"[GEO] Location detected: {loc_name} ({lat}, {lng})")
                return lat, lng, loc_name
        except Exception as e:
            print(f"[GEO] Could not fetch location: {e}")
        print("[GEO] Falling back to default location.")
        return 28.6139, 77.2090, "New Delhi (Default)"  # Neutral India default

    def generate_signature(self, payload):
        payload_str = json.dumps(payload, sort_keys=True)
        return hmac.new(API_SECRET_KEY.encode(), payload_str.encode(), hashlib.sha256).hexdigest()

    def send_incident_to_cloud(self, payload):
        headers = {
            "Content-Type": "application/json",
            "X-Signature": self.generate_signature(payload)
        }
        try:
            resp = requests.post(API_URL, json=payload, headers=headers, timeout=15)
            if resp.status_code in (200, 201):
                print(f"[CLOUD] Successfully uploaded incident: {payload['threat_class']}")
            else:
                 print(f"[CLOUD] Failed to upload incident: {resp.status_code} - {resp.text}")
        except Exception as e:
            print(f"[CLOUD] Error communicating with backend: {e}")

    def send_heartbeat(self):
        while True:
            payload = {
                "atm_id": ATM_ID,
                "status": self.state.system_status,
                "latitude": self.latitude,
                "longitude": self.longitude,
                "location_name": self.location_name
            }
            headers = {
                "Content-Type": "application/json",
                "X-Signature": self.generate_signature(payload)
            }
            try:
                requests.post(HEARTBEAT_URL, json=payload, headers=headers, timeout=5)
                print(f"[HEARTBEAT] Sent | Status: {self.state.system_status} | Loc: {self.location_name}")
            except Exception as e:
                print(f"[HEARTBEAT] Failed: {e}")
            time.sleep(60)  # Then repeat every 60s

    def alert_manager_loop(self):
        """Continuously checks the ThreatState to dispatch confirmed alerts"""
        while True:
            is_new_alert = False
            snapshot = None
            payload = None
            
            with self.state.lock:
                if self.state.system_status == "ONLINE":
                    
                    # 1. Did the CLI trigger a panic pin?
                    if self.state.active_alert:
                        payload = self.state.active_alert
                        is_new_alert = True
                        
                    # 2. Is there a corroborated ML threat?
                    elif self.state.check_corroboration():
                        snapshot = self.state._get_snapshot()
                        payload = {
                            "trigger_type": "ml_cctv",
                            "threat_class": self.state.ml_threat_class,
                            "confidence_score": self.state.ml_confidence,
                            "sensor_snapshot": snapshot
                        }
                        is_new_alert = True
                        
                    if is_new_alert:
                        self.state.system_status = "INCIDENT"
                        self.state.cooldown_until = time.time() + 120 # 2 minute cooldown
                        payload['atm_id'] = ATM_ID
                        payload['timestamp'] = time.time()
            
            if is_new_alert and payload:
                print(f"[ALERT_MANAGER] CONFIRMED THREAT! Initiating response for: {payload['threat_class']}")
                # Extract clip
                buffer = self.cctv.get_buffer()
                threading.Thread(target=self.extractor.extract_clip, args=(
                    buffer, self.cctv.fps, payload['threat_class'], payload['confidence_score'], snapshot, "Claude API Summary Processing..."
                )).start()
                
                # Send to cloud via API
                threading.Thread(target=self.send_incident_to_cloud, args=(payload,)).start()
                
            time.sleep(0.5)

    def draw_dashboard(self, frame):
        """Draws the SADRS overlay on the OpenCV window"""
        if frame is None:
            return None
            
        display = frame.copy()
        
        # Threat Bar
        with self.state.lock:
             status = self.state.system_status
             ml_class = self.state.ml_threat_class
             ml_conf = self.state.ml_confidence
             cooldown = int(self.state.cooldown_until - time.time())
             pir = self.state.sensor_pir_active
        
        text_color = (0, 255, 0)
        bg_color = (0, 50, 0)
        
        if status == "INCIDENT":
             text_color = (0, 0, 255)
             bg_color = (0, 0, 100)
             cv2.putText(display, "!!! LOCKDOWN ACTIVE !!!", (150, 240), cv2.FONT_HERSHEY_SIMPLEX, 1, text_color, 3)
             
        elif pir or ml_class != "NORMAL":
             text_color = (0, 165, 255) # Orange
             bg_color = (0, 50, 100)
             
        # Top banner
        cv2.rectangle(display, (0, 0), (640, 40), bg_color, -1)
        cv2.putText(display, f"SADRS | SYS: {status} | ML: {ml_class} ({int(ml_conf*100)}%)", (10, 25), cv2.FONT_HERSHEY_SIMPLEX, 0.6, text_color, 2)
        
        # Debug/Hotkeys
        cv2.putText(display, "Hotkeys: [P]anic [T]amper [M]otion [R]eset", (10, 460), cv2.FONT_HERSHEY_SIMPLEX, 0.5, (200, 200, 200), 1)
        
        return display

    def run(self):
        print("====== SADRS WEBCAM SIMULATION ======")

        # Start MJPEG stream server first — browser may already be waiting
        start_stream_server(self.frame_holder, port=8080)

        # Background threads
        threading.Thread(target=self.send_heartbeat, daemon=True).start()
        threading.Thread(target=self.alert_manager_loop, daemon=True).start()

        # CCTV thread — capture loop updates frame_holder directly (no middleman)
        cctv_thread = threading.Thread(target=self.cctv.start, daemon=True)
        cctv_thread.start()

        self.input_monitor.start()  # pynput hotkey listener (non-blocking)

        # Keep the main thread alive (daemon threads die when main exits)
        print("[MAIN] All systems started. Press Ctrl+C to stop.")
        while True:
            time.sleep(1)

        self.cctv.stop()
        self.input_monitor.stop()

if __name__ == "__main__":
    controller = MainController()
    controller.run()
