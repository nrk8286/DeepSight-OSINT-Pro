# DeepSight OSINT Pro v2 — Advanced UI

- App (Pages): https://app.gptmarketplus.uk
- API (Worker): https://api.gptmarketplus.uk

## New features
- Gallery grid with pagination (/api/images/list)
- Search page (text embeddings) with result cards
- Upload page (R2 + metadata persist)
- Crawl form (queues a job; Tor crawler later)
- Stats footer (image count)

## Deploy
export CF_API_TOKEN=...   # with proper permissions
export CF_ACCOUNT_ID=...

./scripts/deploy_cloudflare.sh
./scripts/verify_stack.sh

## Security
See the [Security Policy](SECURITY.md) for how to report vulnerabilities and handle secrets.

## Local Dev Note
For faster local testing, create `frontend/.env.development.local` with:
  REACT_APP_API_ORIGIN=http://127.0.0.1:8787
  REACT_APP_ADMIN_TOKEN=devtoken  # optional; requires matching ADMIN_TOKEN in Worker
Then run the API with `cd backend && wrangler dev` and the UI with `cd frontend && npm start`.
