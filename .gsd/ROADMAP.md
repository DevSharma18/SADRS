# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: Authentication Hotfix

## Must-Haves (from SPEC)
- [ ] Resolve the 500 error on `/api/auth/login`.
- [ ] Confirm successful login via frontend UI.

## Phases

### Phase 1: Diagnostics and Fix Implementation
**Status**: ⬜ Not Started
**Objective**: Root-cause the backend exception during the login flow and apply the necessary patch.
**Requirements**: REQ-01, REQ-02

### Phase 2: Verification
**Status**: ⬜ Not Started
**Objective**: Extensively test the frontend login form to ensure the patch resolves the issue without side effects.

---

### Phase 3: Backend Integration with Frontend
**Status**: ✅ Complete
**Objective**: Build the backend integration with the frontend
**Depends on**: Phase 2

**Tasks**:
- [x] 3.1: Audit and Connect Frontend to Backend (Wave 1)
- [x] 3.2: Error Handling & Resilience (Wave 2)

**Verification**:
- [x] No frontend API calls result in unhandled errors (except expected rejections).
- [x] Real-time updates push successfully from backend to frontend.
- [x] App remains functional when API is down.
