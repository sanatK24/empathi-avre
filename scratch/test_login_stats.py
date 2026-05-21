import requests

BASE_URL = "http://127.0.0.1:8000"

def test_api():
    print("Logging in...")
    login_data = {
        "username": "john@empathi.com",
        "password": "john_empathi"
    }
    
    # 1. Login
    res = requests.post(f"{BASE_URL}/auth/login", data=login_data)
    print("Login Response Status:", res.status_code)
    if res.status_code != 200:
        print("Login failed:", res.json())
        return
        
    token = res.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}
    
    # 2. Get profile
    res = requests.get(f"{BASE_URL}/auth/profile", headers=headers)
    print("\n--- Profile ---")
    print(res.json())
    
    # 3. Get stats
    res = requests.get(f"{BASE_URL}/requests/stats", headers=headers)
    print("\n--- Request Stats ---")
    print(res.json())
    
    # 4. Get request history
    res = requests.get(f"{BASE_URL}/requests/my", headers=headers)
    print("\n--- Request History Count ---")
    print(len(res.json()))
    
    # 5. Get donation history
    res = requests.get(f"{BASE_URL}/campaigns/my-donations", headers=headers)
    print("\n--- Donation History ---")
    donations = res.json()
    print("Donation items count:", len(donations))
    if donations:
        print("Sum of donations from API:", sum(d["amount"] for d in donations))
        print("First 3 donations:")
        for d in donations[:3]:
            print(f"  ₹{d['amount']} to campaign {d.get('campaign_title', 'Unknown')} at {d['created_at']}")
            
    # 6. Get recommendations
    res = requests.get(f"{BASE_URL}/campaigns/recommendations", headers=headers)
    print("\n--- Recommendations ---")
    print("Recommendations count:", len(res.json()))

if __name__ == "__main__":
    test_api()
