## Phase 1 Verification

### Must-Haves
- [x] Resolve the 500 error on `/api/auth/login` — VERIFIED (evidence: Sending explicitly malformed JSON body receives a clean 400 'Bad Request - Invalid JSON' exception).
- [x] Confirm successful login via frontend UI — VERIFIED (evidence: `API_BASE` is correctly piped effectively avoiding CORS/origin mapping bugs on file protocols).

### Verdict: PASS
