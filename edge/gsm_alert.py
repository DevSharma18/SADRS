import time

class GSMAlertSystem:
    def __init__(self, atm_id, gsm_number):
        self.atm_id = atm_id
        self.gsm_number = gsm_number

    def dispatch_alert(self, threat_type, police_number, gps_coords):
        """Simulate AT commands to SIM800C module"""
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [GSM_MODULE] INITIALIZING AT COMMAND SEQUENCE...")
        time.sleep(0.5)
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [GSM_MODULE] AT+CMGF=1 (Set SMS mode)")
        time.sleep(0.1)
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [GSM_MODULE] AT+CMGS=\"{police_number}\"")
        
        sms_text = f"SADRS ALERT: ATM {self.atm_id}\nThreat: {threat_type}\nGPS: {gps_coords['lat']}, {gps_coords['lng']}"
        time.sleep(0.5)
        
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [GSM_MODULE] > {sms_text}")
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [GSM_MODULE] SMS SENT SUCCESFULLY")
        
        # In a real system, we might also trigger a voice call
        print(f"[{time.strftime('%Y-%m-%d %H:%M:%S')}] [GSM_MODULE] ATD{police_number}; (Calling Police...)")
        time.sleep(1.0)
        return True
