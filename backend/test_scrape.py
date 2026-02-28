import requests
import json

url = "http://127.0.0.1:5000/api/github/scrape"
payload = {"url": "https://github.com/facebook/react"}
headers = {"Content-Type": "application/json"}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers, timeout=30)
    print(f"Status: {response.status_code}")
    print(f"Response: {response.json()}")
except Exception as e:
    print(f"Error: {str(e)}")
