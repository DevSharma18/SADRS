---
phase: 1
plan: 1
wave: 1
depends_on: []
files_modified: ["public/app.js", "public/app-enhancements.js", "server.js"]
autonomous: true

must_haves:
  truths:
    - "Frontend login requests do not throw network exceptions when accessed locally."
    - "Server parses JSON payloads correctly and does not crash on malformed inputs."
  artifacts:
    - "Updated app.js with absolute API URL fallback."
---

# Plan 1.1: Authentication Connection Hotfix

<objective>
Fix the root cause of the "Login failed. Please try again." error in the frontend. This message is triggered by the `catch` block in `app.js`, indicating a network-level fetch failure or JSON parsing error, commonly caused by accessing the `index.html` via the `file://` protocol instead of the `http://localhost:3001` server.

Purpose: Ensure the frontend can reliably communicate with the backend regardless of how it is launched locally.
Output: Updated frontend JavaScript files with origin-aware fetch requests, and enhanced backend error resilience.
</objective>

<context>
Load for context:
- .gsd/SPEC.md
- public/app.js
- public/app-enhancements.js
- server.js
</context>

<tasks>

<task type="auto">
  <name>Implement API Base URL Fallback</name>
  <files>public/app.js, public/app-enhancements.js</files>
  <action>
    Define a constant `API_BASE` at the top of the frontend scripts. Set it to `window.location.protocol === 'file:' ? 'http://localhost:3001' : ''`.
    Search and replace all instances of `fetch('/api/` with `fetch(`${API_BASE}/api/`.
    Similarly, update `io()` to `io(API_BASE)` if necessary to ensure WebSockets connect correctly from file protocol.
    AVOID: Breaking relative paths if the app is hosted on an actual server. Using the dynamic check ensures it works universally.
  </action>
  <verify>grep -rn "API_BASE" public/</verify>
  <done>All backend fetch calls use the environment-aware `API_BASE` prefix.</done>
</task>

<task type="auto">
  <name>Enhance Backend Error Logging and Resilience</name>
  <files>server.js, routes/api.js</files>
  <action>
    Add a global `unhandledRejection` and `uncaughtException` listener to `server.js` to prevent the server from silently dying or missing critical context on crashes.
    Ensure `express.json()` middleware handles malformed JSON gracefully rather than throwing an unhandled HTML error back to the client.
    AVOID: Overwriting the existing standard error middleware. Add a specific middleware for JSON parsing errors right after `app.use(express.json())`.
  </action>
  <verify>curl -X POST -H "Content-Type: application/json" -d "{badjson}" http://localhost:3001/api/auth/login</verify>
  <done>Backend catches and returns 400 Bad Request for malformed JSON instead of 500 or crashing.</done>
</task>

</tasks>

<verification>
After all tasks, verify:
- [ ] Backend remains alive and returns proper JSON errors for bad inputs.
- [ ] Frontend can authenticate, even if `index.html` is opened directly in the browser (file protocol).
</verification>

<success_criteria>
- [ ] All tasks verified
- [ ] Must-haves confirmed
</success_criteria>
