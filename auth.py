from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from .db import sb

bearer = HTTPBearer()

def current_user(cred: HTTPAuthorizationCredentials = Depends(bearer)) -> str:
    """Validate the Supabase JWT and return the user id."""
    try:
        return sb.auth.get_user(cred.credentials).user.id
    except Exception:
        raise HTTPException(401, "Invalid or expired session. Please sign in again.")
