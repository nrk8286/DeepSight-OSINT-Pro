# Security Policy

## Reporting a Vulnerability
- Please do not open public issues for security reports.
- Use GitHub “Report a vulnerability” (Security Advisories) to create a private report, or contact the maintainers via a private channel if configured for this repo.
- Include: affected area (frontend, Worker, scripts), reproduction steps, impact, and any logs/screencasts (scrub secrets).
- We aim to acknowledge within 3 business days and provide a remediation plan or timeline within 10 business days.

## Scope
- Frontend (CRA), Cloudflare Worker backend, and deployment scripts under `scripts/`.
- Third‑party dependencies (npm) used by the project.

## Secrets & Configuration
- Never commit secrets. Use `.env.example` as reference only.
- Required env vars: `CLOUDFLARE_API_TOKEN`, `CLOUDFLARE_ACCOUNT_ID`, `CF_PAGES_PROJECT`, `REACT_APP_API_ORIGIN`. Optional: `CF_PAGES_DOMAIN`, `WORKER_ROUTE_PATTERN`, `D1_DB_NAME`.
- Store tokens in secure env stores (local OS keychain, CI secrets). Avoid shell history leaks; prefer per‑command `env VAR=...` or `.env.local` excluded from VCS.
- Cloudflare token scopes: D1:Edit, Workers:Edit, Pages:Edit (DNS:Edit only if auto domain linking is needed). Use least privilege and rotate regularly.

## Handling Logs & Artifacts
- Scrub tokens, cookies, and IDs before sharing logs. Do not paste full `wrangler` outputs if they include resource IDs/secrets.
- Remove `node_modules` and build artifacts from reports unless necessary.

## Supply Chain & Dependencies
- Prefer `npm ci` with a committed lockfile; review diffs on dependency bumps.
- Run `npm audit` and update high/critical findings promptly.
- Pin critical build tools as needed (see `scripts/fix_ajv_build.sh`).

## Hardening Tips
- Frontend: validate inputs, escape user content, and avoid injecting untrusted HTML.
- Worker: validate request params, enforce CORS as needed, and avoid echoing sensitive error details.

