import { BASE_URL } from "./config.mjs";

// A tiny per-user cookie-jar HTTP client. Each instance represents one
// logged-in (or logged-out) browser session, so a test can hold several of
// these at once to simulate several teammates using the app concurrently —
// unlike driving a single real browser tab, where only one cookie can be
// active at a time.
export function createClient() {
  let cookie = null;

  async function request(method, path, body) {
    const headers = { "Content-Type": "application/json" };
    if (cookie) headers.Cookie = cookie;
    const res = await fetch(BASE_URL + path, {
      method,
      headers,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
    const setCookie =
      typeof res.headers.getSetCookie === "function"
        ? res.headers.getSetCookie()
        : [res.headers.get("set-cookie")].filter(Boolean);
    if (setCookie.length > 0) {
      cookie = setCookie[setCookie.length - 1].split(";")[0];
    }
    let data = null;
    try {
      data = await res.json();
    } catch {
      data = null;
    }
    return { status: res.status, ok: res.ok, data };
  }

  return {
    get: (path) => request("GET", path),
    post: (path, body) => request("POST", path, body),
    forgetCookie: () => {
      cookie = null;
    },
  };
}
