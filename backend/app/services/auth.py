from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def _is_bcrypt_safe(password: str) -> bool:
    # bcrypt only uses the first 72 bytes of the password
    return len(password.encode("utf-8")) <= 72

def hash_password(password: str):
    if not _is_bcrypt_safe(password):
        raise ValueError("Password too long for bcrypt")
    return pwd_context.hash(password)

def verify_password(plain_password: str, hashed_password: str):
    if not _is_bcrypt_safe(plain_password):
        return False
    return pwd_context.verify(plain_password, hashed_password)