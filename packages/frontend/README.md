# OmniTrackr Frontend

React-based web application for the OmniTrackr file exchange monitoring platform.

## Tech Stack

- **Framework:** React 18 + TypeScript
- **Build Tool:** Vite 5
- **Routing:** React Router v6
- **State Management:** TanStack Query (React Query)
- **UI Components:** Shadcn/ui + Tailwind CSS
- **Forms:** React Hook Form + Zod
- **HTTP Client:** Axios
- **Icons:** Lucide React

## Getting Started

### Prerequisites

- Node.js 20+
- npm 10+

### Installation

```bash
# From project root
npm install
```

### Development

```bash
# Start dev server (from root)
npm run dev:frontend

# Or from frontend directory
cd packages/frontend
npm run dev
```

The app will be available at [http://localhost:5173](http://localhost:5173)

### API Connection

The frontend connects to the API based on the environment:

- **Development:** `http://localhost:3000` (via Vite proxy)
- **Staging:** `https://omnitrackr-api-staging.run.app`
- **Production:** `https://api.omnitrackr.com`

Make sure the API is running locally for development:

```bash
# In another terminal
npm run dev:api
```

## Available Scripts

```bash
npm run dev              # Start development server
npm run build            # Build for production
npm run build:staging    # Build for staging
npm run build:production # Build for production
npm run lint             # Run ESLint
npm run preview          # Preview production build
npm run type-check       # Type check without emitting
```

## Environment Variables

Environment files are configured for each environment:

- `.env.development` - Local development
- `.env.staging` - Staging environment
- `.env.production` - Production environment

See `.env.example` for available variables.

## Project Structure

```
src/
├── api/              # API client and endpoint functions
├── components/
│   ├── ui/          # Reusable UI components (Shadcn)
│   ├── layout/      # Layout components
│   └── file-sources/# Feature components
├── pages/           # Page components
├── hooks/           # Custom React hooks
├── lib/             # Utility functions
├── routes/          # Route configuration
└── types/           # TypeScript types
```

## Features

### Implemented

- ✅ Layout with sidebar navigation
- ✅ React Router setup
- ✅ React Query for server state
- ✅ API client with environment-based URLs
- ✅ Tailwind CSS + Shadcn/ui components

### In Progress

- 🚧 File Sources management page
- 🚧 File Sources CRUD operations

### Planned

- ⏳ Dashboard with metrics
- ⏳ Inward files monitoring
- ⏳ Authentication & authorization

## Deployment

Frontend will be deployed to Firebase Hosting:

- **Staging:** Auto-deploy from `develop` branch
- **Production:** Deploy from `master` branch

## License

UNLICENSED - Private project
