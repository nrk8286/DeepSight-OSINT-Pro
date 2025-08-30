Place your Create React App project files here (package.json, src/, public/, etc.).
The deploy script will run:
  - npm ci (or npm install --legacy-peer-deps if no lockfile)
  - npm run build
Then it deploys the build/ directory to Cloudflare Pages.
