#!/usr/bin/env python3
"""Test the /my-donations endpoint"""

import requests
import json

# Test the endpoint
print("Testing /campaigns/my-donations endpoint...")
print("-" * 60)

# This will fail with 401 because we don't have a token, but we can see if the endpoint exists
response = requests.get('http://localhost:8000/campaigns/my-donations')
print(f"Status Code: {response.status_code}")
print(f"Response: {response.text[:300]}")

# Check the docs endpoint to verify the route is registered
print("\n" + "="*60)
print("Checking if endpoint appears in Swagger docs...")
print("="*60)

docs_response = requests.get('http://localhost:8000/openapi.json')
if docs_response.status_code == 200:
    api_spec = docs_response.json()
    paths = api_spec.get('paths', {})
    
    # Look for any my-donations paths
    print("\nAll available campaign endpoints:")
    for path in sorted(paths.keys()):
        if 'campaign' in path.lower():
            print(f"  {path}")
    
    if '/campaigns/my-donations' in paths:
        print("\n✅ /campaigns/my-donations endpoint IS registered!")
        print(f"   Methods: {list(paths['/campaigns/my-donations'].keys())}")
    else:
        print("\n❌ /campaigns/my-donations endpoint NOT found!")
else:
    print(f"Failed to get docs: {docs_response.status_code}")
