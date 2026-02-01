# TaskD - Modern Task Management

[![License: Proprietary](https://img.shields.io/badge/License-Proprietary-red.svg)](./LICENSE)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.5-blue.svg)](https://www.typescriptlang.org/)
[![React](https://img.shields.io/badge/React-18.3-61dafb.svg)](https://react.dev)

A modern, responsive Kanban board application built with React, TypeScript, Vite, and Supabase.

## ✨ Features

- 🔐 **Authentication** - Email, Google, and GitHub OAuth
- 📋 **Workspaces** - Organize projects into separate workspaces
- 🎯 **Kanban Boards** - Multiple boards per workspace
- 📝 **Drag & Drop** - Intuitive card management
- 🎨 **Priority Levels** - Color-coded task priorities (Low, Medium, High, Urgent)
- 📊 **Real-time Progress** - Live task completion tracking
- 🌓 **Dark Mode** - Auto-detect system preference
- ⚡ **PWA Ready** - Install as a native app
- 🔒 **Secure** - Row-level security with Supabase
- 📱 **Responsive** - Works on all devices

## 🚀 Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS with custom pastel palette
- **Backend**: Supabase (PostgreSQL, Auth, Real-time)
- **Icons**: Custom SVG icons
- **PWA**: vite-plugin-pwa
- **Deployment**: Vercel-ready

## 📦 Quick Start

### Prerequisites

- Node.js 18+ and npm
- A Supabase account ([sign up free](https://supabase.com))

### Installation

1. **Clone and install**
```bash
git clone <your-repo-url>
cd taskd
npm install
```

2. **Set up environment variables**
```bash
cp .env.example .env
```

Edit `.env` with your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

3. **Set up database**
   - Go to [Supabase Dashboard](https://app.supabase.com)
   - Navigate to SQL Editor
   - Run migrations from `supabase/migrations/`

4. **Start development**
```bash
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

## 📜 Available Scripts

```bash
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
npm run lint       # Run ESLint
npm run typecheck  # TypeScript type checking
```

## 🚀 Deployment

TaskD is ready to deploy to Vercel in minutes!

### Quick Deploy

```bash
npm i -g vercel
vercel
```

See [DEPLOYMENT_GUIDE.md](./DEPLOYMENT_GUIDE.md) for detailed instructions.

### Environment Variables (Vercel)

Add these in your Vercel project settings:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## 📱 PWA Setup

TaskD is configured as a Progressive Web App. To complete setup:

1. Generate icons at [PWA Builder](https://www.pwabuilder.com/imageGenerator)
2. Add to `public/` folder:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png`

See [PWA_SETUP.md](./PWA_SETUP.md) for details.

## 📁 Project Structure

```
taskd/
├── src/
│   ├── components/       # Reusable UI components
│   ├── contexts/         # React contexts (Auth, Theme)
│   ├── icons/           # Custom SVG icons
│   ├── lib/             # Supabase client
│   ├── pages/           # Page components
│   └── main.tsx         # Entry point
├── supabase/
│   └── migrations/      # Database schema
├── public/              # Static assets
└── docs/               # Documentation
```

## 🗄️ Database Schema

- **workspaces** - User workspaces
- **boards** - Kanban boards with progress tracking
- **lists** - Columns (To Do, In Progress, Done)
- **cards** - Tasks with priority levels

## 🎨 Features in Detail

### Priority Levels
- 🟢 Low - Green
- 🔵 Medium - Blue  
- 🟡 High - Yellow/Orange
- 🔴 Urgent - Red

### Board Management
- Create/rename/delete boards
- Auto-created default lists
- Real-time progress tracking
- Task completion percentage

### Authentication
- Email/password
- Google OAuth
- GitHub OAuth
- Secure session management

## 📄 License

This project is **not open source**.

The source code is made available for **educational review, portfolio
demonstration, and hiring evaluation purposes only**.

Commercial use, redistribution, modification, or deployment of the source
code is not permitted without explicit written permission.

See the [LICENSE](./LICENSE) file for full terms.


## 🆘 Support

- 📖 [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- 📱 [PWA Setup](./PWA_SETUP.md)
- 🚀 [Quick Deploy](./READY_TO_DEPLOY.md)
- 🐛 [Open an Issue](https://github.com/yourusername/taskd/issues)

## 🙏 Acknowledgments

Built with:
- [React](https://react.dev)
- [Vite](https://vitejs.dev)
- [Supabase](https://supabase.com)
- [Tailwind CSS](https://tailwindcss.com)
- [Vercel](https://vercel.com)

---
