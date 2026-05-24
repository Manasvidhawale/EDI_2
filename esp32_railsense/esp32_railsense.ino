#include <Wire.h>

// Ultrasonic Sensor Pins
#define TRIG_PIN 5
#define ECHO_PIN 18

// Buzzer Pin
#define BUZZER_PIN 23

// MPU6050 Address
const int MPU = 0x68;

// Variables
long duration;
float distance;

int16_t AcX, AcY, AcZ;

void setup() {

  Serial.begin(115200);

  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);

  // Start I2C
  Wire.begin(21, 22);

  // Wake up MPU6050
  Wire.beginTransmission(MPU);
  Wire.write(0x6B);
  Wire.write(0);
  Wire.endTransmission(true);

  Serial.println("==================================");
  Serial.println(" Railway Crack Detection System  ");
  Serial.println("==================================");
  Serial.println("MPU6050 Connected Successfully");

  // Startup double-beep — confirms buzzer works
  digitalWrite(BUZZER_PIN, HIGH); delay(150);
  digitalWrite(BUZZER_PIN, LOW);  delay(100);
  digitalWrite(BUZZER_PIN, HIGH); delay(150);
  digitalWrite(BUZZER_PIN, LOW);
}

void loop() {

  // -----------------------------
  // ULTRASONIC SENSOR
  // -----------------------------

  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);

  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);

  digitalWrite(TRIG_PIN, LOW);

  duration = pulseIn(ECHO_PIN, HIGH);

  distance = duration * 0.034 / 2;

  // -----------------------------
  // MPU6050 DATA READ
  // -----------------------------

  Wire.beginTransmission(MPU);
  Wire.write(0x3B);
  Wire.endTransmission(false);

  Wire.requestFrom(MPU, 6, true);

  AcX = Wire.read() << 8 | Wire.read();
  AcY = Wire.read() << 8 | Wire.read();
  AcZ = Wire.read() << 8 | Wire.read();

  // Calculate Vibration Magnitude (in g units)
  float vibration = sqrt(
                      (AcX * AcX) +
                      (AcY * AcY) +
                      (AcZ * AcZ)
                    ) / 16384.0;

  // -----------------------------
  // DISPLAY VALUES (human-readable)
  // -----------------------------

  Serial.println("--------------------------------");

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.println(" cm");

  Serial.print("Vibration: ");
  Serial.println(vibration);

  // =============================================
  // ✅ CSV LINE — This is what predict.py reads
  // Format: "distance,vibration"
  // =============================================
  Serial.print(distance, 2);
  Serial.print(",");
  Serial.println(vibration, 4);

  // -----------------------------
  // CRACK DETECTION + BUZZER
  // -----------------------------

  if (distance > 20 || vibration > 2.0) {

    // CRITICAL — Rapid triple beep
    Serial.println("CRACK DETECTED!");

    for (int i = 0; i < 3; i++) {
      digitalWrite(BUZZER_PIN, HIGH); delay(120);
      digitalWrite(BUZZER_PIN, LOW);  delay(100);
    }

  } else if (distance > 15 || vibration > 1.5) {

    // WARNING — Single beep
    Serial.println("WARNING - Elevated Readings");

    digitalWrite(BUZZER_PIN, HIGH); delay(300);
    digitalWrite(BUZZER_PIN, LOW);

  } else {

    // NORMAL — Silent
    Serial.println("Track Condition Normal");

    digitalWrite(BUZZER_PIN, LOW);
  }

  delay(1000);
}
