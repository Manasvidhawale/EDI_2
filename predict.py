# -*- coding: utf-8 -*-
import serial
import pandas as pd
import joblib
import json
import os

# =========================
# Load ML Model
# =========================

BASE_DIR   = os.path.dirname(os.path.abspath(__file__))
MODEL_PATH = os.path.join(BASE_DIR, 'dashboard', 'railway_model.pkl')
JSON_PATH  = os.path.join(BASE_DIR, 'dashboard', 'live_data.json')

try:
    model = joblib.load(MODEL_PATH)

    # Verify the model is a real sklearn classifier
    if not hasattr(model, 'predict'):
        raise ValueError("Loaded object is not a valid ML model (missing predict method).")

    HAS_PROBA = hasattr(model, 'predict_proba')
    print("[OK] ML Model Loaded:", type(model).__name__)

except Exception as e:
    print("[ERROR] Could not load model:", e)
    print("        Using RULE-BASED fallback (no ML model needed).")
    model = None
    HAS_PROBA = False

# =========================
# Connect ESP32
# =========================
# Change 'COM7' to YOUR actual ESP32 COM port (check Device Manager)

ser = serial.Serial('COM6', 115200, timeout=2)
print("[OK] Connected to ESP32 - Reading Live Sensor Data...\n")

# =========================
# Rule-Based Fallback
# (used when model is missing/broken)
# =========================

def rule_based_predict(distance, vibration):
    """Simple threshold classifier as fallback when no ML model is available."""
    if distance > 20 or vibration > 2.0:
        return "CRACK", 85.0
    elif distance > 15 or vibration > 1.5:
        return "CRACK", 65.0
    else:
        return "NORMAL", 95.0

# =========================
# Live Prediction Loop
# =========================

while True:
    try:
        # Read one line from ESP32 serial
        line = ser.readline().decode('utf-8', errors='ignore').strip()

        if not line:
            continue

        # Skip non-CSV lines (ESP32 debug text like "Distance: 24.5 cm")
        parts = line.split(',')
        if len(parts) < 2:
            continue

        # Make sure both parts are actual numbers
        try:
            distance  = float(parts[0])
            vibration = float(parts[1])
        except ValueError:
            continue

        # =========================
        # ML Prediction (or fallback)
        # =========================

        if model is not None:
            sample = pd.DataFrame({
                'Distance_cm':   [distance],
                'Vibration_RMS': [vibration]
            })
            prediction = model.predict(sample)[0]

            if HAS_PROBA:
                proba      = model.predict_proba(sample)[0]
                confidence = round(float(max(proba)) * 100, 1)
            else:
                confidence = 90.0   # fixed confidence when proba not available
        else:
            # Rule-based fallback
            prediction, confidence = rule_based_predict(distance, vibration)

        # =========================
        # Status colour
        # =========================

        if prediction == "NORMAL":
            status_color = "green"
        elif prediction == "CRACK":
            status_color = "orange"
        else:                           # SEVERE_CRACK
            status_color = "red"

        # =========================
        # Write live_data.json
        # =========================

        data = {
            "distance":     distance,
            "vibration":    vibration,
            "prediction":   prediction,
            "accuracy":     confidence,
            "status_color": status_color
        }

        tmp = JSON_PATH + ".tmp"
        with open(tmp, "w", encoding='utf-8') as f:
            json.dump(data, f, indent=2)
        os.replace(tmp, JSON_PATH)

        # =========================
        # Terminal Output
        # =========================

        print("=" * 36)
        print("  Distance   :", distance, "cm")
        print("  Vibration  :", vibration)
        print("  Prediction :", prediction)
        print("  Confidence :", confidence, "%")
        print("=" * 36)

    except KeyboardInterrupt:
        print("\n[STOPPED] Stopped by user.")
        ser.close()
        break
    except Exception as e:
        print("[ERROR]", e)
