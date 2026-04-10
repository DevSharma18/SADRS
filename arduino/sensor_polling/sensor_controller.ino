// MOCK Arduino Firmware for SADRS
// Simulates reading MEMS, PIR, Tilt (MPU-6050) and DHT22 and sending over Serial

const int VIBRATION_PIN = A0;
const int PIR_PIN = 2;

unsigned long lastPoll = 0;
const int POLL_INTERVAL = 500; // ms

void setup() {
  Serial.begin(9600);
  pinMode(PIR_PIN, INPUT);
  pinMode(VIBRATION_PIN, INPUT);
}

void loop() {
  if (millis() - lastPoll >= POLL_INTERVAL) {
    lastPoll = millis();
    
    // Read sensors
    int vib = analogRead(VIBRATION_PIN);
    int pir = digitalRead(PIR_PIN);
    
    // Mock Tilt & Temp for now
    float tiltX = random(-5, 5) / 10.0;
    float tiltY = random(-5, 5) / 10.0;
    float temp = 24.5 + (random(-10, 10) / 10.0);
    
    // String format: VIB|PIR|TILTX|TILTY|TEMP
    Serial.print("DATA:");
    Serial.print(vib); Serial.print("|");
    Serial.print(pir); Serial.print("|");
    Serial.print(tiltX); Serial.print("|");
    Serial.print(tiltY); Serial.print("|");
    Serial.println(temp);
  }
}
