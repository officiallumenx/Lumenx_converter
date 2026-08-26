# LumenX API (`@lumenx/api`)

Server-only backend workspace. Frontend apps must never import this package directly.

## Status

Phase 1A — workspace scaffold only. No framework, no integrations, no routes yet.

## Layout

```
backend/
├── src/
│   └── index.ts    # Entrypoint (placeholder)
├── package.json
├── tsconfig.json
└── README.md
```

## Phases

- **1A** — This workspace (done)
- **1B** — Hono core
- **1C** — Config + security middleware
- **1D** — Error + logging + validation
- **1E** — Supabase / Firebase integration boundaries
- **1F** — Tests + verification
