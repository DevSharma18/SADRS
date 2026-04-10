import os
from anthropic import Anthropic

class ClaudeAnalyst:
    def __init__(self):
        self.api_key = os.getenv("ANTHROPIC_API_KEY")
        if self.api_key:
            self.client = Anthropic(api_key=self.api_key)
        else:
            self.client = None
            print("WARNING: ANTHROPIC_API_KEY not found. Using mock responses for Claude.")

    def generate_incident_summary(self, atm_id, trigger_type, threat_class, conf, snapshot):
        prompt = f"""
        System: You are a security incident analyst for a bank's ATM security system. Generate a concise, factual incident report suitable for law enforcement.
        
        User: ATM: {atm_id}
        Trigger: {trigger_type} | ML Class: {threat_class} (confidence: {conf})
        Sensors: Vibration={snapshot.get('vibration_g', 0)}g | Tilt=({snapshot.get('tilt_x', 0)},{snapshot.get('tilt_y', 0)})° | PIR={snapshot.get('pir_triggered', False)} | Temp={snapshot.get('temperature_c', 0)}°C
        
        Write a 3-sentence incident summary. Include: what was detected, when, and recommended immediate action. DO NOT INCLUDE ANY PREAMBLE OR FOLLOW-UP TEXT, JUST THE 3 SENTENCES.
        """
        
        if not self.client:
            # Return MOCK response if no API key is set
            return f"A {threat_class} threat was detected at ATM {atm_id} triggered via {trigger_type} with {conf} confidence. Sensor telemetry indicates vibration at {snapshot.get('vibration_g', 0)}g and pir status as {snapshot.get('pir_triggered', False)}. Immediate dispatch of law enforcement and watchman is recommended."

        try:
            response = self.client.messages.create(
                model="claude-3-5-sonnet-20241022",
                max_tokens=256,
                temperature=0.2,
                system="You are a clear, objective security analyst.",
                messages=[
                    {"role": "user", "content": prompt}
                ]
            )
            return response.content[0].text
        except Exception as e:
            print(f"Error calling Claude: {e}")
            return f"[FALLBACK SUMMARY] ATM {atm_id} reported a {threat_class} event via {trigger_type}."
