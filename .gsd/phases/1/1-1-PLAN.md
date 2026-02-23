---
phase: 1
plan: 1
wave: 1
---

# Plan 1.1: Users Dashboard and Backend API

## Objective
Implement `/api/users` endpoint in the Express backend and utilize it within `public/app-enhancements.js` to dynamically load the User Management UI instead of returning static mocked users. 

## Context
- .gsd/ROADMAP.md
- public/app-enhancements.js
- routes/api.js
- database/db.js

## Tasks

<task type="auto">
  <name>Build /api/users Route</name>
  <files>routes/api.js</files>
  <action>
    - Ensure `database/db.js` has a `users` array exported (it already has one with password hashes).
    - Add a `router.get('/users')` handler that returns the user list securely (stripping the `password_hash` property out of the payload before sending).
  </action>
  <verify>grep "/users" routes/api.js</verify>
  <done>Backend `GET /api/users` works without exposing password hashes.</done>
</task>

<task type="auto">
  <name>Wire Frontend loadUsersTable</name>
  <files>public/app-enhancements.js</files>
  <action>
    - Find `loadUsersTable()` inside `app-enhancements.js`.
    - Change it to an `async` function. 
    - Strip the static `const users = [...]` mock.
    - Replace it with `const response = await fetch(\`\${API_BASE}/api/users\`); const users = await response.json();`
  </action>
  <verify>grep "fetch.*api/users" public/app-enhancements.js</verify>
  <done>Frontend Users UI generates its rows based on the API payload instead of the mocked array.</done>
</task>

## Success Criteria
- [ ] Navigating to "Users" from the sidebar renders the real user count located in `db.js`.
- [ ] Password hashes never reach the browser inspection.
