# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
To restore access to the ATM CCTV Monitoring System by resolving the critical backend authentication bug that is preventing valid credentials from working.

## Goals
1. Identify and fix the root cause of the broken login sequence (which currently results in an "Internal Server Error").
2. Verify that the default administrator credentials successfully authenticate the user and grant access to the main dashboard.

## Non-Goals (Out of Scope)
- Implementing new authentication mechanisms (e.g., OAuth, JWT).
- Modifying the frontend dashboard layout or behavior.
- Altering the Python ML microservice.

## Users
Security operators and administrators who need to access the CCTV monitoring dashboard.

## Constraints
- Must maintain the existing `express-session` and `bcrypt` architecture.
- Fix must not disrupt existing WebSocket connections or other API routes.

## Success Criteria
- [ ] User can successfully log in via the `http://localhost:3001` portal using `admin`/`admin123`.
- [ ] The Node.js backend processes the login request and issues a session cookie without throwing an exception.
