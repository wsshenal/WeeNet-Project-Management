import requests
url = f"https://generativelanguage.googleapis.com/v1beta/models?key=YOUR_API_KEY_HERE"
resp = requests.get(url)
for m in resp.json().get("models", []):
    if "flash" in m["name"]:
        print(m["name"])
