import { PAGES } from "./pages.js";

export default {
  async fetch(request) {
    const url = new URL(request.url);
    let pathName = url.pathname.replace(/\/+$/, "") || "/";
    if (pathName === "/") pathName = "/privacy";
    const html = PAGES[pathName];
    if (!html) {
      return new Response("Not found", {
        status: 404,
        headers: { "content-type": "text/plain; charset=utf-8" },
      });
    }
    return new Response(html, {
      headers: {
        "content-type": "text/html; charset=utf-8",
        "cache-control": "public, max-age=300",
      },
    });
  },
};
