import time
import random

class SensorMonitor:
    def __init__(self):
        self.vibration_g = 0.0
        self.tilt_x = 0.0
        self.tilt_y = 0.0
        self.temperature_c = 25.0
        self.pir_triggered = False

    def poll_sensors(self):
        """Mock sensor polling. Normally this would read from Arduino via Serial."""
        # Baseline environmental noise
        self.vibration_g = random.uniform(0.01, 0.05)
        self.tilt_x = random.uniform(-0.5, 0.5)
        self.tilt_y = random.uniform(-0.5, 0.5)
        self.temperature_c = 25.0 + random.uniform(-0.5, 0.5)
        self.pir_triggered = False # Reset

    def trigger_tamper_event(self):
        """Simulate a physical attack on the ATM"""
        self.vibration_g = random.uniform(2.5, 4.0)
        self.tilt_x = random.uniform(15.0, 30.0)
        self.pir_triggered = True

    def get_snapshot(self):
        return {
            "vibration_g": round(self.vibration_g, 4),
            "tilt_x": round(self.tilt_x, 2),
            "tilt_y": round(self.tilt_y, 2),
            "temperature_c": round(self.temperature_c, 2),
            "pir_triggered": self.pir_triggered
        }

    def is_tampered(self):
        # Trigger if vibration > 1.5g and tilt > 10 degrees
        return self.vibration_g > 1.5 or abs(self.tilt_x) > 10.0 or abs(self.tilt_y) > 10.0
