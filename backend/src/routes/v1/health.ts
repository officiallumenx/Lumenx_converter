import { Hono } from "hono";

const health = new Hono();

health.get("/", (c) => {
  return c.json({
    service: "lumenx-api",
    status: "ok",
    version: "v1",
  });
});

export default health;
