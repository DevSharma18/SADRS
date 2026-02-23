# 1.1 Summary
- Implemented `API_BASE` logic dynamically based on `window.location.protocol` to address network fetching errors on local `file://` execution.
- Added graceful fallbacks to all `fetch` requests inside `public/app.js` and `public/app-enhancements.js`, along with the `io(API_BASE)` init logic.
- Implemented `uncaughtException` and `unhandledRejection` catch-all middleware in `server.js` preventing server hard shutdowns.
- Strengthened `express.json()` pipeline with an explicit `SyntaxError` exception handler in `server.js` that catches bad payload parsing and maps to `{ error: 'Bad Request - Invalid JSON' }` instead of an HTML 500 payload crash.
