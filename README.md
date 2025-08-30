# DeepSight-OSINT-Pro

## Getting Started

- Prereqs: Node 18+, npm, Wrangler CLI.
- Frontend dev: `cd frontend && npm install && npm start`.
- Worker dev: `cd backend && wrangler dev` (uses local SQLite for D1).
- Build frontend: `cd frontend && npm run build` (output in `frontend/build/`).
- Deploy (Linux/macOS): `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... CF_PAGES_PROJECT=... REACT_APP_API_ORIGIN=... && bash scripts/deploy_cloudflare.sh`.
- Deploy (Windows): Set env vars, then `powershell -ExecutionPolicy Bypass -File scripts/deploy_cloudflare.ps1`.

See `AGENTS.md` for detailed contributor guidelines (structure, coding style, testing, and security).
