from pynput import keyboard
from threat_state import ThreatState
import sys

class InputMonitor:
    def __init__(self, state: ThreatState):
        self.state = state
        self.listener = None

    def start(self):
        print("[INPUT_MONITOR] Listening for discrete hotkeys (P=Panic, T=Tamper, M=Motion). Press 'Esc' to exit.")
        self.listener = keyboard.Listener(on_press=self.on_press)
        self.listener.start()

    def stop(self):
        if self.listener:
            self.listener.stop()

    def on_press(self, key):
        try:
            if hasattr(key, 'char') and key.char:
                char = key.char.lower()
                if char == 'p':
                    print("\n[INPUT_MONITOR] 'P' pressed: Simulating Panic PIN entry.")
                    self.state.set_panic_pin()
                elif char == 't':
                    print("\n[INPUT_MONITOR] 'T' pressed: Simulating physical Tamper (high vibration).")
                    self.state.set_tamper(3.5)
                elif char == 'm':
                    print("\n[INPUT_MONITOR] 'M' pressed: Simulating PIR motion trigger.")
                    with self.state.lock:
                        self.state.sensor_pir_active = True
                elif char == 'r':
                    print("\n[INPUT_MONITOR] 'R' pressed: Resetting system cooldown.")
                    with self.state.lock:
                         self.state.cooldown_until = 0
                         self.state.system_status = "ONLINE"
                         self.state.ml_consecutive_frames = 0
                         self.state.ml_threat_class = "NORMAL"
                         self.state.sensor_pir_active = False
                         self.state.sensor_vibration_g = 0.0
                         self.state.active_alert = None
            elif key == keyboard.Key.esc:
                print("\n[INPUT_MONITOR] Exiting simulation...")
                self.stop()
                sys.exit(0)
        except Exception as e:
            print(f"Error reading key: {e}")
