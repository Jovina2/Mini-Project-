import requests
import time

server_url = "http://localhost:3000/api/update-location"  # Node.js server

while True:
    payload = {
        "vehicleId": "Test-Vehicle-001",
        "latitude": 12.9716,
        "longitude": 77.5946,
        "speed": 60,
        "accident": True,
        "username": "qwer@gmail.com"
    }
    try:
        r = requests.post(server_url, json=payload)
        print("🚨 Accident data sent:", r.status_code)
    except Exception as e:
        print("❌ Error:", e)
    time.sleep(10)  # send every 10 seconds