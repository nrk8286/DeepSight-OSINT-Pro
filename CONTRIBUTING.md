# Contributing

## Quick Start
- Prereqs: Node.js 18+, npm 9+, `wrangler` 3+ (`npm i -g wrangler`).
- Install frontend: `cd frontend && npm install`.
- Run locally:
  - Frontend: `npm start` inside `frontend`.
  - Worker (when `backend/worker.js` exists): `cd backend && wrangler dev`.

## Environment
- Copy `.env.example` to a local, untracked file (e.g., `.env.local`) and set required values:
  - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`, `REACT_APP_API_ORIGIN`.
- Do not commit secrets. Keep `.env*` files out of version control.
 - Dev convenience: Create `frontend/.env.development.local` with:
   - `REACT_APP_API_ORIGIN=http://127.0.0.1:8787`
   - `REACT_APP_ADMIN_TOKEN=<your_dev_token>` (optional; enables write actions against local Worker when `ADMIN_TOKEN` is set).

## Deploy
- Linux/macOS:
  - `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... CF_PAGES_PROJECT=... REACT_APP_API_ORIGIN=...`
  - `bash scripts/deploy_cloudflare.sh`
- Windows (PowerShell):
  - `$env:CLOUDFLARE_API_TOKEN="..."; $env:CLOUDFLARE_ACCOUNT_ID="..."; $env:CF_PAGES_PROJECT="..."; $env:REACT_APP_API_ORIGIN="..."`
  - `powershell -ExecutionPolicy Bypass -File scripts/deploy_cloudflare.ps1`
- Verify Cloudflare stack: `bash scripts/verify_stack.sh`.
- Optional: attach domain with `bash scripts/link_domain.sh`.

## Style, Tests, Commits
- Follow conventions in [AGENTS.md](AGENTS.md) (structure, naming, formatting, testing).
- Tests (frontend): Jest + React Testing Library when present; run `npm test` in `frontend`.
- Commits: Conventional Commits (e.g., `feat: add image search grid`, `fix: handle D1 creation error`).

## Pull Requests
- Include problem statement, approach, and screenshots for UI changes.
- Link related issues; note any env/route changes.
- Ensure deploy scripts still run: `deploy_cloudflare` and `verify_stack`.
- Remove secrets, large artifacts, and dead code.

## References
- Guide: [AGENTS.md](AGENTS.md)
- Scripts: `scripts/deploy_cloudflare.sh`, `scripts/deploy_cloudflare.ps1`, `scripts/verify_stack.sh`
