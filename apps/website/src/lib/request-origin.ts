import { AsyncLocalStorage } from "node:async_hooks";

/** Request-scoped public origin. Server-only — never import from client components. */
export const requestOriginStore = new AsyncLocalStorage<string>();
