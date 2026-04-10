import hashlib
import bcrypt

class PanicPinSystem:
    def __init__(self, expected_pin="9999"):
        # In a real system, the Pi only holds the hash, not the plaintext PIN.
        # We pre-compute the hash for our expected panic pin (e.g. 9999).
        self.salt = bcrypt.gensalt()
        # SHA-256 then bcrypt
        sha256_pin = hashlib.sha256(expected_pin.encode()).hexdigest()
        self.hashed_panic_pin = bcrypt.hashpw(sha256_pin.encode(), self.salt)

    def verify_pin(self, entered_pin):
        """Verifies if the entered PIN matches the panic PIN hash"""
        sha256_pin = hashlib.sha256(entered_pin.encode()).hexdigest()
        return bcrypt.checkpw(sha256_pin.encode(), self.hashed_panic_pin)
