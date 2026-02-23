# 3.2 Summary
- Implemented global `fetch` interceptor using native javascript functionality in `app.js` to ensure resilient error handling.
- When an API responds with `!response.ok`, the interceptor automatically surfaces the errored `statusText` via a toast notification.
- Caught frontend and network failure events via interceptor `try-catch` and mapped it to a clear UI feedback.
- Updated the socket connection logic in `initializeWebSocket` with explicit `connect`, `disconnect` handlers reporting reconnection behaviors dynamically to the user.
