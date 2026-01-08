# OpenTamago

**Open Source AI Character Viewer & Sharing Platform**

View, share, and chat with AI characters. From CharX viewer to P2P-based CharX sharing, everything is free and open source.

## Features

### CharX Viewer
Check out character cards, lorebooks, and assets from CharX files. Everything runs right in your browser.

- **Drag & Drop**: Just drop your .charx files to see what's inside instantly
- **All Character Info at a Glance**: View character details, lorebooks, image assets and more
- **100% Local Processing**: Your files never leave your browser. Total privacy guaranteed!

### P2P CharX Sharing
Share character files directly with friends using P2P. No server uploads, instant transfers!

- **QR Code & Share Links**: Generate QR codes and links for easy mobile transfers
- **WebRTC Direct Transfer**: Files go straight between browsers. No server storage.
- **Password Protection**: Protect your shares with a password if you want

### P2P Multi-Character Chat (P2P Connect)
Set up chat sessions with multiple AI characters. Invite friends and watch characters interact with each other.

- **P2P Chat**: Direct browser connection. Chat with friends without any servers.
- **AI Auto-Reply**: Each character replies with their own personality
- **Up to 8 People**: Share a QR code or link to invite friends

## Tech Stack

Built with the [T3 Stack](https://create.t3.gg/):

- [Next.js 15](https://nextjs.org) - React framework with App Router
- [tRPC](https://trpc.io) - End-to-end typesafe APIs
- [Drizzle ORM](https://orm.drizzle.team) - TypeScript ORM for SQL databases
- [NextAuth.js](https://next-auth.js.org) - Authentication (Discord OAuth)
- [Tailwind CSS](https://tailwindcss.com) + [shadcn/ui](https://ui.shadcn.com/) - Styling
- [RxDB](https://rxdb.info/) - Client-side database with IndexedDB
- [next-intl](https://next-intl-docs.vercel.app/) - Internationalization (en, ko, ja)
- [WebRTC](https://webrtc.org/) - Peer-to-peer connections

## Development

### Prerequisites

- Node.js 18+ (LTS recommended)
- pnpm 8+
- PostgreSQL database

### Getting Started

1. Clone the repository:
```bash
git clone https://github.com/tamagochat/opentamago.git
cd opentamago
```

2. Install dependencies:
```bash
pnpm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

Edit `.env` and configure:
- `DATABASE_URL` - PostgreSQL connection string
- `NEXTAUTH_SECRET` - Random secret for NextAuth.js
- `NEXTAUTH_URL` - Your app URL (http://localhost:3000 for dev)
- `DISCORD_CLIENT_ID` & `DISCORD_CLIENT_SECRET` - Discord OAuth credentials (optional)

4. Push database schema:
```bash
pnpm db:push
```

5. Start the development server:
```bash
pnpm dev
```

Open [http://localhost:3000](http://localhost:3000) to see the app.

### Available Commands

```bash
pnpm dev          # Start dev server with Turbo
pnpm build        # Production build
pnpm start        # Start production server
pnpm typecheck    # TypeScript type checking
pnpm db:push      # Push schema to database
pnpm db:generate  # Generate database migrations
pnpm db:migrate   # Run migrations
pnpm db:studio    # Open Drizzle Studio GUI
```

## LLM API Usage

OpenTamago uses tRPC for type-safe API calls. The usage differs between server and client components:

### Server Components

Use `api` from `src/trpc/server.ts` for direct server-side calls:

```tsx
import { api, HydrateClient } from "~/trpc/server";

export default async function Page() {
  const data = await api.example.getData();

  return (
    <HydrateClient>
      <div>{data.message}</div>
    </HydrateClient>
  );
}
```

- Direct database access via tRPC procedures
- No React Query overhead
- Wrap with `HydrateClient` to hydrate client components

### Client Components

Use `api` from `src/trpc/react.tsx` with React Query hooks:

```tsx
"use client";
import { api } from "~/trpc/react";

export function MyComponent() {
  const { data, isLoading } = api.example.getData.useQuery();
  const mutation = api.example.updateData.useMutation();

  return (
    <div>
      {isLoading ? "Loading..." : data?.message}
      <button onClick={() => mutation.mutate({ id: 1 })}>
        Update
      </button>
    </div>
  );
}
```

- React Query integration for caching and real-time updates
- Automatic refetching and optimistic updates
- Access to `isLoading`, `isError`, `refetch`, etc.

### tRPC Procedure Types

- **`publicProcedure`**: Unauthenticated endpoints (no login required)
- **`protectedProcedure`**: Authenticated endpoints (requires login, access `ctx.session.user`)

Example router:

```tsx
// src/server/api/routers/example.ts
export const exampleRouter = createTRPCRouter({
  getData: publicProcedure.query(async ({ ctx }) => {
    return { message: "Hello world" };
  }),

  getUserData: protectedProcedure.query(async ({ ctx }) => {
    // ctx.session.user is available here
    return await ctx.db.user.findUnique({ where: { id: ctx.session.user.id } });
  }),
});
```

## Architecture

- `src/app/[locale]/` - Next.js App Router pages with i18n support
- `src/server/api/routers/` - tRPC API route definitions
- `src/server/db/schema.ts` - Drizzle ORM database schema
- `src/lib/db/` - RxDB client-side database (IndexedDB)
- `src/i18n/messages/` - Translation files (en.json, ko.json, ja.json)
- `src/components/ui/` - shadcn/ui components

See [CLAUDE.md](./CLAUDE.md) for detailed architecture and patterns.

## Internationalization

Supports three locales:
- `/` - English (default, no prefix)
- `/ko/` - Korean
- `/ja/` - Japanese

Always use imports from `~/i18n/routing` for locale-aware navigation:

```tsx
import { Link, usePathname, useRouter } from "~/i18n/routing";
```

## Privacy & Security

- **Client-side processing**: CharX files are processed entirely in your browser
- **No server storage**: P2P transfers use WebRTC for direct peer-to-peer connections
- **Local database**: User data stored in IndexedDB (RxDB) on your device
- **Optional authentication**: Discord OAuth for server-side features only

## Contributing

Contributions are welcome! Please read our contributing guidelines and submit pull requests.

## Acknowledgments

OpenTamago builds upon the excellent work of these open source projects:

- **[BlockNote](https://github.com/TypeCellOS/BlockNote)** - AI proxy implementation
- **[yejingram](https://github.com/YEJIN-DEV/yejingram)** - Prompt engineering and layout design inspiration
- **[RisuAI](https://github.com/kwaroran/Risuai)** - CharX file format specification
- **[FilePizza](https://github.com/kern/filepizza)** - P2P file sharing implementation

We're grateful to these projects and their contributors for making their work available to the community.

## License

[GPL-3.0 License](./LICENSE.md) - see LICENSE.md for details.

## Links

- **Website**: [open.tamago.chat](https://open.tamago.chat)
- **GitHub**: [github.com/tamagochat/opentamago](https://github.com/tamagochat/opentamago)
- **Documentation**: See [CLAUDE.md](./CLAUDE.md) for development docs

---

Built with breakfast 🍳
