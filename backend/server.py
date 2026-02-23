from fastapi import FastAPI, APIRouter, HTTPException, UploadFile, File, Header, Depends
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
import os
import logging
from pathlib import Path
from pydantic import BaseModel
from typing import List, Optional
import uuid
from datetime import datetime, timezone, timedelta
import secrets
import jwt
import httpx
from bs4 import BeautifulSoup
import re
import json

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

JWT_SECRET = os.environ['JWT_SECRET']
JWT_ALGORITHM = "HS256"

app = FastAPI()
api_router = APIRouter(prefix="/api")

# --- Pydantic Models ---
class KeyLogin(BaseModel):
    key: str

class KeyCreate(BaseModel):
    label: str
    max_devices: int = 1

class KeyUpdate(BaseModel):
    label: Optional[str] = None
    max_devices: Optional[int] = None

class CookieCheckRequest(BaseModel):
    cookies_text: str
    format_type: str = "auto"

# --- Auth Helpers ---
async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token_str = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token_str, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        key_doc = await db.access_keys.find_one({"id": payload["key_id"]}, {"_id": 0})
        if not key_doc:
            raise HTTPException(status_code=401, detail="Key not found")
        session_id = payload.get("session_id")
        active = key_doc.get("active_sessions", [])
        if not any(s["session_id"] == session_id for s in active):
            raise HTTPException(status_code=401, detail="Session revoked")
        return {
            "id": key_doc["id"],
            "label": key_doc["label"],
            "is_master": key_doc.get("is_master", False),
            "session_id": session_id
        }
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

async def require_admin(authorization: str = Header(None)):
    user = await get_current_user(authorization)
    if not user.get("is_master"):
        raise HTTPException(status_code=403, detail="Admin access required")
    return user

# --- Cookie Parsing ---
def parse_netscape_cookies(text):
    cookies = {}
    for line in text.strip().split('\n'):
        line = line.strip()
        if line.startswith('#') or not line:
            continue
        parts = line.split('\t')
        if len(parts) >= 7:
            cookies[parts[5]] = parts[6]
        elif '=' in line:
            for pair in line.split(';'):
                pair = pair.strip()
                if '=' in pair:
                    k, _, v = pair.partition('=')
                    cookies[k.strip()] = v.strip()
    return cookies

def parse_json_cookies(text):
    try:
        data = json.loads(text)
        if isinstance(data, list):
            return {item['name']: item['value'] for item in data if 'name' in item and 'value' in item}
        if isinstance(data, dict):
            return data
    except Exception:
        pass
    return {}

def parse_cookies_auto(text):
    text = text.strip()
    if text.startswith('[') or text.startswith('{'):
        result = parse_json_cookies(text)
        if result:
            return result
    return parse_netscape_cookies(text)

# --- Netflix Checker ---
async def check_netflix_cookie(cookie_text, format_type="auto"):
    if format_type == "json":
        cookies = parse_json_cookies(cookie_text)
    elif format_type == "netscape":
        cookies = parse_netscape_cookies(cookie_text)
    else:
        cookies = parse_cookies_auto(cookie_text)

    if not cookies:
        return {
            "status": "invalid",
            "email": None, "plan": None, "member_since": None,
            "country": None, "next_billing": None, "profiles": [],
            "full_cookie": cookie_text[:500],
            "error": "Could not parse cookies"
        }

    try:
        headers = {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.5',
        }

        async with httpx.AsyncClient(follow_redirects=True, timeout=15.0) as http:
            resp = await http.get(
                'https://www.netflix.com/YourAccount',
                cookies=cookies,
                headers=headers
            )
            html = resp.text

            if '/login' in str(resp.url) or 'login' in html[:1000].lower():
                return {
                    "status": "expired",
                    "email": None, "plan": None, "member_since": None,
                    "country": None, "next_billing": None, "profiles": [],
                    "full_cookie": cookie_text,
                    "error": "Cookie expired - redirected to login"
                }

            result = {
                "status": "valid",
                "email": None, "plan": None, "member_since": None,
                "country": None, "next_billing": None, "profiles": [],
                "full_cookie": cookie_text,
                "error": None
            }

            soup = BeautifulSoup(html, 'lxml')

            # Extract from reactContext script
            for script in soup.find_all('script'):
                text = script.string or ''
                if 'reactContext' in text:
                    match = re.search(r'reactContext\s*=\s*({.*?});', text, re.DOTALL)
                    if match:
                        try:
                            ctx = json.loads(match.group(1))
                            models = ctx.get('models', {})
                            user_info = models.get('userInfo', {}).get('data', {})
                            result['email'] = user_info.get('membershipEmail') or user_info.get('email')
                            result['country'] = user_info.get('countryOfSignup') or user_info.get('currentCountry')
                            result['member_since'] = user_info.get('memberSince')

                            plan_info = models.get('planInfo', {}).get('data', {})
                            result['plan'] = plan_info.get('planName')
                            result['next_billing'] = plan_info.get('nextBillingDate')

                            profiles_data = models.get('profiles', {}).get('data', [])
                            result['profiles'] = [p.get('firstName', p.get('profileName', 'Profile')) for p in profiles_data if isinstance(p, dict)]
                        except Exception:
                            pass

            # Fallback pattern matching
            if not result['email']:
                m = re.search(r'([a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})', html)
                if m:
                    result['email'] = m.group(1)

            if not result['plan']:
                for p in ['Premium', 'Standard with ads', 'Standard', 'Basic', 'Mobile']:
                    if p.lower() in html.lower():
                        result['plan'] = p
                        break

            return result

    except httpx.TimeoutException:
        return {
            "status": "expired",
            "email": None, "plan": None, "member_since": None,
            "country": None, "next_billing": None, "profiles": [],
            "full_cookie": cookie_text,
            "error": "Connection timed out"
        }
    except Exception as e:
        logger.error(f"Cookie check error: {e}")
        return {
            "status": "invalid",
            "email": None, "plan": None, "member_since": None,
            "country": None, "next_billing": None, "profiles": [],
            "full_cookie": cookie_text,
            "error": str(e)
        }

# --- Auth Routes ---
@api_router.post("/auth/login")
async def login(data: KeyLogin):
    key_doc = await db.access_keys.find_one({"key_value": data.key}, {"_id": 0})
    if not key_doc:
        raise HTTPException(status_code=401, detail="Invalid access key")

    active = key_doc.get("active_sessions", [])
    if len(active) >= key_doc.get("max_devices", 1) and not key_doc.get("is_master"):
        raise HTTPException(status_code=403, detail=f"Device limit reached ({key_doc['max_devices']})")

    session_id = str(uuid.uuid4())
    token = jwt.encode(
        {
            "key_id": key_doc["id"],
            "session_id": session_id,
            "is_master": key_doc.get("is_master", False),
            "exp": datetime.now(timezone.utc) + timedelta(days=7)
        },
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )
    await db.access_keys.update_one(
        {"id": key_doc["id"]},
        {"$push": {"active_sessions": {
            "session_id": session_id,
            "created_at": datetime.now(timezone.utc).isoformat()
        }}}
    )
    return {
        "token": token,
        "user": {
            "id": key_doc["id"],
            "label": key_doc["label"],
            "is_master": key_doc.get("is_master", False)
        }
    }

@api_router.post("/auth/logout")
async def logout(user: dict = Depends(get_current_user)):
    await db.access_keys.update_one(
        {"id": user["id"]},
        {"$pull": {"active_sessions": {"session_id": user["session_id"]}}}
    )
    return {"message": "Logged out"}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "label": user["label"], "is_master": user["is_master"]}

# --- Cookie Check Routes ---
@api_router.post("/check")
async def check_cookies(data: CookieCheckRequest, user: dict = Depends(get_current_user)):
    cookie_blocks = re.split(r'\n{3,}|={5,}|-{5,}', data.cookies_text.strip())
    cookie_blocks = [b.strip() for b in cookie_blocks if b.strip()]

    if not cookie_blocks:
        raise HTTPException(status_code=400, detail="No cookies found")

    results = []
    for block in cookie_blocks:
        result = await check_netflix_cookie(block, data.format_type)
        results.append(result)

    check_id = str(uuid.uuid4())
    valid_count = sum(1 for r in results if r["status"] == "valid")
    expired_count = sum(1 for r in results if r["status"] == "expired")
    invalid_count = sum(1 for r in results if r["status"] == "invalid")

    await db.checks.insert_one({
        "id": check_id,
        "user_id": user["id"],
        "results": results,
        "total": len(results),
        "valid_count": valid_count,
        "expired_count": expired_count,
        "invalid_count": invalid_count,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "id": check_id,
        "results": results,
        "total": len(results),
        "valid_count": valid_count,
        "expired_count": expired_count,
        "invalid_count": invalid_count
    }

@api_router.post("/check/file")
async def check_cookies_file(file: UploadFile = File(...), user: dict = Depends(get_current_user)):
    content = await file.read()
    text = content.decode('utf-8', errors='ignore')

    cookie_blocks = re.split(r'\n{3,}|={5,}|-{5,}', text.strip())
    cookie_blocks = [b.strip() for b in cookie_blocks if b.strip()]

    if not cookie_blocks:
        raise HTTPException(status_code=400, detail="No cookies found in file")

    results = []
    for block in cookie_blocks:
        result = await check_netflix_cookie(block, "auto")
        results.append(result)

    check_id = str(uuid.uuid4())
    valid_count = sum(1 for r in results if r["status"] == "valid")
    expired_count = sum(1 for r in results if r["status"] == "expired")
    invalid_count = sum(1 for r in results if r["status"] == "invalid")

    await db.checks.insert_one({
        "id": check_id,
        "user_id": user["id"],
        "results": results,
        "total": len(results),
        "valid_count": valid_count,
        "expired_count": expired_count,
        "invalid_count": invalid_count,
        "filename": file.filename,
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    return {
        "id": check_id,
        "results": results,
        "total": len(results),
        "valid_count": valid_count,
        "expired_count": expired_count,
        "invalid_count": invalid_count
    }

# --- History Routes ---
@api_router.get("/history")
async def get_history(user: dict = Depends(get_current_user)):
    checks = await db.checks.find(
        {"user_id": user["id"]}, {"_id": 0}
    ).sort("created_at", -1).to_list(100)
    return checks

@api_router.delete("/history/{check_id}")
async def delete_check(check_id: str, user: dict = Depends(get_current_user)):
    result = await db.checks.delete_one({"id": check_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Check not found")
    return {"message": "Deleted"}

# --- Admin Routes ---
@api_router.post("/admin/keys")
async def create_key(data: KeyCreate, user: dict = Depends(require_admin)):
    key_value = secrets.token_urlsafe(16)
    key_id = str(uuid.uuid4())
    await db.access_keys.insert_one({
        "id": key_id,
        "key_value": key_value,
        "label": data.label,
        "max_devices": data.max_devices,
        "active_sessions": [],
        "is_master": False,
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    return {"id": key_id, "key_value": key_value, "label": data.label, "max_devices": data.max_devices}

@api_router.get("/admin/keys")
async def list_keys(user: dict = Depends(require_admin)):
    keys = await db.access_keys.find({}, {"_id": 0}).to_list(100)
    for k in keys:
        k["key_preview"] = k["key_value"][:4] + "****"
        k["session_count"] = len(k.get("active_sessions", []))
    return keys

@api_router.get("/admin/keys/{key_id}/reveal")
async def reveal_key(key_id: str, user: dict = Depends(require_admin)):
    key = await db.access_keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    return {"key_value": key["key_value"]}

@api_router.patch("/admin/keys/{key_id}")
async def update_key(key_id: str, data: KeyUpdate, user: dict = Depends(require_admin)):
    updates = {}
    if data.label is not None:
        updates["label"] = data.label
    if data.max_devices is not None:
        updates["max_devices"] = data.max_devices
    if not updates:
        raise HTTPException(status_code=400, detail="Nothing to update")
    await db.access_keys.update_one({"id": key_id}, {"$set": updates})
    return {"message": "Updated"}

@api_router.delete("/admin/keys/{key_id}")
async def delete_key(key_id: str, user: dict = Depends(require_admin)):
    key = await db.access_keys.find_one({"id": key_id}, {"_id": 0})
    if not key:
        raise HTTPException(status_code=404, detail="Key not found")
    if key.get("is_master"):
        raise HTTPException(status_code=400, detail="Cannot delete master key")
    await db.access_keys.delete_one({"id": key_id})
    return {"message": "Key deleted"}

@api_router.delete("/admin/keys/{key_id}/sessions/{session_id}")
async def revoke_session(key_id: str, session_id: str, user: dict = Depends(require_admin)):
    await db.access_keys.update_one(
        {"id": key_id},
        {"$pull": {"active_sessions": {"session_id": session_id}}}
    )
    return {"message": "Session revoked"}

# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

@app.on_event("startup")
async def seed_master_key():
    master_key = os.environ['MASTER_KEY']
    existing = await db.access_keys.find_one({"is_master": True}, {"_id": 0})
    if not existing:
        await db.access_keys.insert_one({
            "id": str(uuid.uuid4()),
            "key_value": master_key,
            "label": "Master Key",
            "max_devices": 999,
            "active_sessions": [],
            "is_master": True,
            "created_at": datetime.now(timezone.utc).isoformat()
        })
        logger.info("Master key seeded")
    elif existing["key_value"] != master_key:
        await db.access_keys.update_one({"is_master": True}, {"$set": {"key_value": master_key}})
        logger.info("Master key updated")

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
