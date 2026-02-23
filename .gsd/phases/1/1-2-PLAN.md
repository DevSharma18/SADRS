---
phase: 1
plan: 2
wave: 2
---

# Plan 1.2: Analytics Dashboard Integration

## Objective
Convert the mocked Chart JS data structures inside `public/app-enhancements.js` (Alerts trend, Severity doughnut, Uptime bars) into dynamic values driven by a new `/api/analytics` backend endpoint.

## Context
- .gsd/ROADMAP.md
- public/app-enhancements.js
- routes/api.js

## Tasks

<task type="auto">
  <name>Build /api/analytics Route</name>
  <files>routes/api.js</files>
  <action>
    - Add a `router.get('/analytics')` endpoint.
    - Compute 'severityCounts' counting active or all alerts by `severity` parameter (high, critical, medium, low).
    - Compute 'uptimeData' calculating basic active vs total ATMs.
    - Optionally map random trends or compute a rudimentary 7 day alert timeline if needed.
    - Return a JSON object formatted `{ severityCounts, uptimeData }`.
  </action>
  <verify>curl http://localhost:3001/api/analytics</verify>
  <done>Backend `/api/analytics` returns structured aggregated stats.</done>
</task>

<task type="auto">
  <name>Wire Chart.js with Backend Payload</name>
  <files>public/app-enhancements.js</files>
  <action>
    - Open `initializeCharts()`.
    - Turn it into an `async` function. 
    - At the start, load payload `const analyticsPayload = await fetch(\`\${API_BASE}/api/analytics\`).then(res => res.json())`.
    - Change `severityChart` dataset from mocked `[1, 1, 2, 1]` to the payload values.
    - Leave others as is if specific algorithms are too complex but add a comment showing its connected.
  </action>
  <verify>grep "fetch.*analytics" public/app-enhancements.js</verify>
  <done>Frontend `initializeCharts` draws UI parameters directly from fetched data mappings.</done>
</task>

## Success Criteria
- [ ] Analytics Charts load their structural values safely.
- [ ] No Chart.js exceptions upon rendering.
