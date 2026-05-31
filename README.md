# LumenX Ecosystem

LumenX is a modular education platform for institutes — connecting administrators, families, teachers, students, and transport operations in one ecosystem.

## Products

| Product | Folder | Status | Description |
|---------|--------|--------|-------------|
| **LumenX Nexus** | `apps/nexus/` | ✅ Runnable | Platform hub and institute command center |
| **LumenX Admin** | `apps/admin/` | ✅ Runnable | Institute administration console |
| **LumenX Connect** | `apps/connect/` | ✅ Runnable | Parent, teacher, and student portal |
| **LumenX Transport** | `apps/transport/` | 📋 Planned | Fleet and route management (not yet in repo) |

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- **UI:** React 19, Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com) (Radix)
- **Build:** Vite 7, [Turborepo](https://turbo.build) (task orchestration)
- **Deploy target:** Cloudflare Workers ([Wrangler](https://developers.cloudflare.com/workers/wrangler/))
- **Data (current):** Mock data and localStorage — backend integration planned

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)
- npm (included with Node.js)

## Getting Started

Install dependencies once from the repository root, then run any app.

```bash
npm install
npm run dev:connect   # LumenX Connect
npm run dev:admin     # LumenX Admin
npm run dev:nexus     # LumenX Nexus
```

Or run from an app directory:

```bash
cd apps/connect
npm run dev
```

Demo login password: see `apps/connect/src/routes/login.tsx` (demo/prototype only).

## Scripts (root)

| Command | Description |
|---------|-------------|
| `npm run dev:connect` | Start Connect dev server |
| `npm run dev:admin` | Start Admin dev server |
| `npm run dev:nexus` | Start Nexus dev server |
| `npm run build` | Build all apps |
| `npm run build:connect` | Build Connect only |
| `npm run build:admin` | Build Admin only |
| `npm run lint` | Lint all apps |

## Project Structure

```
lumenx/
├── apps/
│   ├── connect/       # LumenX Connect
│   ├── admin/         # LumenX Admin
│   └── nexus/         # LumenX Nexus
├── packages/          # Shared packages (planned)
├── docs/
│   ├── LUMENX_MASTER.md
│   └── migration/
├── package.json       # npm workspaces root
├── turbo.json
└── README.md
```

See [docs/LUMENX_MASTER.md](docs/LUMENX_MASTER.md) for full ecosystem documentation.

## Environment Variables

No `.env` files are required for local demo mode. When backend services are added, copy `.env.example` to `.env.local` (file to be created).

## Security

This repository is a **UI prototype / demo**. Authentication uses client-side localStorage and hardcoded demo credentials. **Do not use in production without a real auth backend.**

## License

TBD — add LICENSE before public release.

## Contributing

Monorepo Phase 1 is complete. Next: extract shared `@lumenx/ui` package and CI pipeline.
