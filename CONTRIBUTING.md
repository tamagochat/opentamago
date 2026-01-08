# Contributing to OpenTamago

Thank you for your interest in contributing to OpenTamago! This document provides guidelines and instructions for contributing.

## Getting Started

### Prerequisites

- Node.js 18+
- pnpm 8+
- PostgreSQL database

### Setup

1. Fork and clone the repository
2. Install dependencies:
   ```bash
   pnpm install
   ```
3. Copy `.env.example` to `.env` and configure your environment variables
4. Push the database schema:
   ```bash
   pnpm db:push
   ```
5. Start the development server:
   ```bash
   pnpm dev
   ```

## Development Workflow

### Branch Naming

- `feature/` - New features
- `fix/` - Bug fixes
- `docs/` - Documentation updates
- `refactor/` - Code refactoring

### Before Submitting

1. Run type checking:
   ```bash
   pnpm typecheck
   ```
2. Run the build to ensure it compiles:
   ```bash
   pnpm build
   ```
3. Test your changes locally

## Code Style

### TypeScript

- Use TypeScript for all new code
- Prefer explicit types over `any`
- Use the `~/` path alias for imports from `src/`

### React Components

- Use functional components with hooks
- Place shared components in `src/app/_components/`
- Use `"use client"` directive only when necessary

### Database

- All table names should be prefixed with `opentamago_`
- Use Drizzle ORM for database operations
- Follow the existing schema patterns in `src/server/db/schema.ts`

### Internationalization

- All user-facing text must be translatable
- Add translations to all locale files (`en.json`, `ko.json`, `ja.json`)
- Use `Link`, `usePathname`, `useRouter` from `~/i18n/routing`

## Pull Request Guidelines

1. Create a descriptive PR title
2. Reference any related issues
3. Include a summary of changes
4. Ensure all checks pass
5. Request review from maintainers

## Reporting Issues

When reporting issues, please include:

- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment details (OS, browser, Node version)

## License

By contributing, you agree that your contributions will be licensed under the same license as the project.
