# DeepSight-OSINT-Pro

[![CI](https://github.com/nrk8286/DeepSight-OSINT-Pro/actions/workflows/ci.yml/badge.svg?branch=main)](https://github.com/nrk8286/DeepSight-OSINT-Pro/actions/workflows/ci.yml)
[![Release](https://img.shields.io/github/v/release/nrk8286/DeepSight-OSINT-Pro?include_prereleases)](https://github.com/nrk8286/DeepSight-OSINT-Pro/releases)

## Getting Started

- Prereqs: Node 18+, npm, Wrangler CLI.
- Frontend dev: `cd frontend && npm install && npm start`.
- Worker dev: `cd backend && wrangler dev` (uses local SQLite for D1).
- Build frontend: `cd frontend && npm run build` (output in `frontend/build/`).
- Deploy (Linux/macOS): `export CLOUDFLARE_API_TOKEN=... CLOUDFLARE_ACCOUNT_ID=... CF_PAGES_PROJECT=... REACT_APP_API_ORIGIN=... && bash scripts/deploy_cloudflare.sh`.
- Deploy (Windows): Set env vars, then `powershell -ExecutionPolicy Bypass -File scripts/deploy_cloudflare.ps1`.

See `AGENTS.md` for detailed contributor guidelines (structure, coding style, testing, and security).

## Admin & Deploy

- Admin token: Set once as a Worker secret (`wrangler secret put ADMIN_TOKEN`). For local tests, export `ADMIN_TOKEN` and use scripts:
  - PowerShell: `scripts/test_admin.ps1`
  - Bash: `scripts/test_admin.sh`
- CI Deploy: On push to `main`, GitHub Actions builds and deploys Worker + Pages. Configure repository Secrets:
  - `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT` (and optionally `D1_DB_NAME`, `D1_DB_ID`).
