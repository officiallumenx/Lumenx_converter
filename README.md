# LumenX Ecosystem

LumenX is a modular education platform for institutes — connecting administrators, families, teachers, students, and transport operations in one ecosystem.

## Products

| Product | Folder | Status | Description |
|---------|--------|--------|-------------|
| **LumenX Nexus** | `apps/nexus/` | ✅ Runnable | Platform hub and institute command center |
| **LumenX Admin** | `apps/admin/` | ✅ Runnable | Institute administration console |
| **LumenX Connect** | `apps/connect/` | ✅ Runnable | Parent, teacher, and student portal |
| **LumenX Transport** | `apps/transport/` | ✅ Runnable | Fleet and route management |
| **LumenX Website** | `apps/website/` | ✅ Runnable | Public marketing site |

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
npm run dev:transport # LumenX Transport
npm run dev:website   # Public website
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
| `npm run dev:transport` | Start Transport dev server |
| `npm run dev:website` | Start public website |
| `npm run build` | Build all apps |
| `npm run build:connect` | Build Connect only |
| `npm run build:admin` | Build Admin only |
| `npm run build:nexus` | Build Nexus only |
| `npm run build:transport` | Build Transport only |
| `npm run build:website` | Build website only |
| `npm run lint` | Lint all apps |

## Project Structure

```
lumenx/
├── apps/
│   ├── connect/       # LumenX Connect
│   ├── admin/         # LumenX Admin
│   ├── nexus/         # LumenX Nexus
│   ├── transport/     # LumenX Transport
│   └── website/       # Public marketing site
├── packages/          # Shared packages
│   ├── ui/            # @lumenx/ui — shadcn components
│   ├── ui-admin/      # @lumenx/ui-admin — admin shell components
│   ├── types/         # @lumenx/types — domain types
│   ├── auth/          # @lumenx/auth — session contracts
│   ├── utils/         # @lumenx/utils — errors, formatters
│   ├── database/      # @lumenx/database — entity schema
│   ├── config/        # @lumenx/config — tsconfig, ESLint, module registry
│   └── module-*/      # Domain modules (students, transport, …)
├── docs/
│   ├── website/       # Public site spec (00–13)
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

Monorepo Phases 1–7 complete — four runnable apps and 20+ shared packages. See [docs/migration/PHASE3-7.md](docs/migration/PHASE3-7.md).
