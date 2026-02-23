---
phase: 3
plan: 1
wave: 1
---

# Plan 3.1: Audit and Connect Frontend to Backend

## Objective
Verify and complete the backend integration with the frontend, ensuring all API endpoints and WebSocket events are correctly mapped and handled.

## Context
- .gsd/ROADMAP.md
- public/app.js
- routes/api.js

## Tasks

<task type="auto">
  <name>Audit API Integration</name>
  <files>public/app.js, routes/api.js</files>
  <action>
    - Review all fetch() calls in public/app.js.
    - Confirm they correspond to existing routes in routes/api.js.
    - Fix any mismatched HTTP methods or endpoint paths.
  </action>
  <verify>grep -r "fetch" public/app.js</verify>
  <done>All fetch calls successfully map to defined API routes without 404s</done>
</task>

<task type="auto">
  <name>Audit WebSocket Events</name>
  <files>public/app.js, server.js, routes/api.js</files>
  <action>
    - Inspect socket.io event listeners in public/app.js.
    - Ensure matching emit() calls exist in server.js or routes/api.js.
    - Validate the payload structure passed between them.
  </action>
  <verify>grep -r "socket.on" public/app.js</verify>
  <done>Frontend correctly handles 'alert_update', 'camera_update', and 'threat_detected' events</done>
</task>

## Success Criteria
- [ ] No frontend API calls result in unhandled 404 or 500 errors (except expected auth rejections).
- [ ] Real-time updates push successfully from backend to frontend.
