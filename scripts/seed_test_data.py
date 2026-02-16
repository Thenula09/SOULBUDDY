#!/usr/bin/env python3
"""
Seed script — insert 3 test mood records for the test user using service endpoints.
Usage: python scripts/seed_test_data.py
"""
import requests
import time
import json

# Configuration (matches existing test script)
USER_SERVICE_URL = "http://localhost:8004"
CHAT_AI_SERVICE_URL = "http://localhost:8003"
TEST_EMAIL = "test@example.com"
TEST_PASSWORD = "testpassword"


def get_auth_token_and_user():
    """Return (access_token, user_id). Creates a temporary user if needed."""
    login_data = {"email": TEST_EMAIL, "password": TEST_PASSWORD}

    try:
        r = requests.post(f"{USER_SERVICE_URL}/api/auth/login", json=login_data, timeout=5)
        if r.status_code == 200:
            data = r.json()
            token = data.get("access_token")
            user_obj = data.get("user") or {}
            return token, user_obj.get("id")

        # Try register (or fallback to unique user if canonical exists)
        reg_payload = {"email": TEST_EMAIL, "username": TEST_EMAIL.split('@')[0], "full_name": "Test User", "password": TEST_PASSWORD}
        reg = requests.post(f"{USER_SERVICE_URL}/api/auth/register", json=reg_payload, timeout=5)
        if reg.status_code in (200, 201):
            data = reg.json()
            return data.get("access_token"), data.get("user", {}).get("id")

        # If email taken, create a unique user
        if reg.status_code == 400 and 'Email already registered' in reg.text:
            unique_email = f"seed+{int(time.time())}@example.com"
            payload = {"email": unique_email, "username": unique_email.split('@')[0], "full_name": "Seed User", "password": TEST_PASSWORD}
            r2 = requests.post(f"{USER_SERVICE_URL}/api/auth/register", json=payload, timeout=5)
            if r2.status_code in (200, 201):
                data = r2.json()
                return data.get("access_token"), data.get("user", {}).get("id")

        print("Could not obtain or create a test user:", r.status_code, r.text)
        return None, None

    except Exception as e:
        print("Auth error:", e)
        return None, None


def seed_moods(token, user_id, moods):
    headers = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}
    results = []
    for m in moods:
        payload = {"user_id": user_id, "emotion": m["emotion"], "confidence": m.get("confidence", 0.8), "source": "seed_script"}
        try:
            resp = requests.post(f"{CHAT_AI_SERVICE_URL}/api/mood", headers=headers, json=payload, timeout=5)
            results.append((payload, resp.status_code, resp.text))
            print(f"POST /api/mood -> {resp.status_code} | {payload['emotion']} | {resp.text}")
        except Exception as e:
            results.append((payload, 'error', str(e)))
            print("Request error:", e)
        time.sleep(0.2)
    return results


if __name__ == '__main__':
    token, user_id = get_auth_token_and_user()
    if not token or not user_id:
        print("Failed to get auth token/user — aborting")
        raise SystemExit(1)

    moods = [
        {"emotion": "happy", "confidence": 0.92},
        {"emotion": "neutral", "confidence": 0.65},
        {"emotion": "sad", "confidence": 0.35}
    ]

    print(f"Seeding 3 mood records for user_id={user_id}")
    seed_moods(token, user_id, moods)
    print("Seeding complete")
