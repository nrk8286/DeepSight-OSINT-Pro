
export interface Env {
  API: Service;
}

export default {
  async fetch(req: Request, env: Env) {
    const url = new URL(req.url);
    if (url.hostname === "api.gptmarketplus.uk") {
      return env.API.fetch(req);
    }
    return fetch(req);
  }
} satisfies ExportedHandler<Env>;
