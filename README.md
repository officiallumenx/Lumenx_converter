# LumenX Ecosystem

LumenX is a modular education platform for institutes — connecting administrators, families, teachers, students, and transport operations in one ecosystem.

## Products

| Product | Folder | Status | Description |
|---------|--------|--------|-------------|
| **LumenX Nexus** | `lumenx nexus/` | 🚧 In progress | Platform hub and institute command center |
| **LumenX Admin** | `luminexa admin/luminexa-command-center-main/` | ✅ Runnable | Institute administration console |
| **LumenX Connect** | `lumina-connect-main/` | ✅ Runnable | Parent, teacher, and student portal |
| **LumenX Transport** | — | 📋 Planned | Fleet and route management (not yet in repo) |

## Tech Stack

- **Framework:** [TanStack Start](https://tanstack.com/start) + [TanStack Router](https://tanstack.com/router)
- **UI:** React 19, Tailwind CSS 4, [shadcn/ui](https://ui.shadcn.com) (Radix)
- **Build:** Vite 7
- **Deploy target:** Cloudflare Workers ([Wrangler](https://developers.cloudflare.com/workers/wrangler/))
- **Data (current):** Mock data and localStorage — backend integration planned

## Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)
- npm, pnpm, or [Bun](https://bun.sh)

## Getting Started

Each runnable app is self-contained. Install dependencies and start the dev server from the app directory.

### LumenX Connect

```bash
cd lumina-connect-main
npm install
npm run dev
```

Demo login password: see `src/routes/login.tsx` (demo/prototype only).

### LumenX Admin

```bash
cd "luminexa admin/luminexa-command-center-main"
npm install
npm run dev
```

### LumenX Nexus

> ⚠️ Source-only at this time — no `package.json` yet. Nexus shares Admin source; full standalone setup is pending.

## Scripts (per app)

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run preview` | Preview production build |
| `npm run lint` | Run ESLint |
| `npm run format` | Format with Prettier |

## Project Structure

```
lumenx/
├── lumenx nexus/              # LumenX Nexus (source only)
├── lumina-connect-main/       # LumenX Connect
├── luminexa admin/
│   └── luminexa-command-center-main/   # LumenX Admin
└── README.md
```

> **Note:** Folder names and in-app branding are being migrated to the LumenX identity. See branding cleanup in project docs.

## Environment Variables

No `.env` files are required for local demo mode. When backend services are added, copy `.env.example` to `.env.local` (file to be created).

## Security

This repository is a **UI prototype / demo**. Authentication uses client-side localStorage and hardcoded demo credentials. **Do not use in production without a real auth backend.**

## License

TBD — add LICENSE before public release.

## Contributing

TBD — monorepo restructuring and shared packages are planned.
