# JOURNAL.md

## Entries
### 2026-02-23
- Initialized GSD project. The primary goal is to resolve an "Internal Server Error" that occurs when the frontend submits valid credentials to the `/api/auth/login` endpoint. My initial investigation suggests an issue with parsing the JSON body or validating the bcrypt hash due to an environmental discrepancy, though the logic itself appears sound.
