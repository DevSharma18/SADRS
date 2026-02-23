# ROADMAP.md

> **Current Phase**: Not started
> **Milestone**: Dashboard Features Expansion

## Must-Haves (from SPEC)
- [ ] Users can navigate through all sidebar sub-pages dynamically without a 404 or page load error.
- [ ] Analytics, Live Feeds, Maps, and User pages fetch correctly mocked standard data points from the `/api/` Node paths.
- [ ] The app manages UI transitions successfully and maintains session states between tabs.

## Phases

### Phase 1: Frontend and Backend Synchronisation
**Status**: ⬜ Not Started
**Objective**: Build missing frontend interfaces (Analytics, Maps, Users, Settings, Logs, ATM Management, Live Feed, Threats) and map them directly to the `server.js` routes.
**Requirements**: REQ-01, REQ-02

**Tasks**:
- [ ] 1.1: Users Dashboard and Backend API (Wave 1)
- [ ] 1.2: Analytics Dashboard Integration (Wave 2)

**Verification**:
- [ ] Analytics arrays are fetched securely from `/api/analytics` endpoint.
- [ ] Network tab doesn't reveal user password hashes in JSON payload responses.
- [ ] Dashboard views appropriately switch in DOM and call APIs seamlessly.
