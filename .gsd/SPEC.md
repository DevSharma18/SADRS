# SPEC.md — Project Specification

> **Status**: `FINALIZED`

## Vision
Expand the recently secured CCTV Monitoring backend by connecting realistic API responses and frontend views for Live Feeds, ATM Management, Analytics, Settings, User Management, Map functionality, and all other remaining un-built dashboard pages.

## Goals
1. Activate the missing views in the sidebar (Analytics, Map, ATM Management, Users, Live Feeds, Logs, Threats, Settings).
2. Create or finalize API routes for those functionalities in the Express backend.
3. Replace the frontend placeholders with robust data-fetching capabilities that appropriately display data from the API endpoint responses using `API_BASE` fetch wrappers.

## Non-Goals (Out of Scope)
- Making major design or CSS changes (keep it consistent with existing styles).
- Touching the ML microservice application logic or Python components.
- Changing authentication mechanisms.

## Users
Security operators and administrators using the ATM CCTV dashboard. 

## Constraints
- Do not introduce breaking changes to the frontend structure. Use the current layout.
- Maintain error-resilient fetches returning intuitive user responses on failures.
- Preserve real-time sockets behaviors. 

## Success Criteria
- [ ] Users can navigate through all sidebar sub-pages dynamically without a 404 or page load error.
- [ ] Analytics, Live Feeds, Maps, and User pages fetch correctly mocked standard data points from the `/api/` Node paths.
- [ ] The app manages UI transitions successfully and maintains session states between tabs.
