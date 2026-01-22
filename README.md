# Modern Kanban Web App

A modern, responsive Kanban board application built with React, TypeScript, Vite, and Supabase.

## Features

- 🔐 User authentication (sign up, login, profile management)
- 📋 Create and manage workspaces
- 🎯 Multiple boards per workspace
- 📝 Drag-and-drop cards between lists
- 🎨 Clean, modern UI with Tailwind CSS
- ⚡ Fast performance with Vite
- 🔒 Secure backend with Supabase

## Tech Stack

- **Frontend**: React 18, TypeScript, Vite
- **Styling**: Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Authentication, Real-time)
- **Icons**: Lucide React
- **Deployment**: Vercel

## Getting Started

### Prerequisites

- Node.js 18+ and npm
- A Supabase account and project

### Installation

1. Clone the repository:
```bash
git clone <your-repo-url>
cd <your-project-name>
```

2. Install dependencies:
```bash
npm install
```

3. Set up environment variables:
```bash
cp .env.example .env
```

4. Edit `.env` and add your Supabase credentials:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

5. Apply database migrations:
   - Go to your Supabase project dashboard
   - Navigate to SQL Editor
   - Run the SQL from `supabase/migrations/20260122110416_create_kanban_schema.sql`

6. Start the development server:
```bash
npm run dev
```

7. Open [http://localhost:5173](http://localhost:5173) in your browser

## Available Scripts

- `npm run dev` - Start development server
- `npm run build` - Build for production
- `npm run preview` - Preview production build locally
- `npm run lint` - Run ESLint
- `npm run typecheck` - Run TypeScript type checking

## Deployment

This project is ready to deploy to Vercel. See [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions.

### Quick Deploy to Vercel

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=<your-repo-url>)

1. Click the button above or go to [vercel.com](https://vercel.com)
2. Import your repository
3. Add environment variables:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Deploy!

## Project Structure

```
├── src/
│   ├── contexts/          # React contexts (Auth)
│   ├── lib/              # Utilities and Supabase client
│   ├── pages/            # Page components
│   ├── App.tsx           # Main app component
│   └── main.tsx          # Entry point
├── supabase/
│   └── migrations/       # Database migrations
├── .env.example          # Environment variables template
├── vercel.json           # Vercel configuration
└── DEPLOYMENT.md         # Detailed deployment guide
```

## Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `VITE_SUPABASE_URL` | Your Supabase project URL | Yes |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous key | Yes |

## Database Schema

The app uses the following tables:
- `workspaces` - User workspaces
- `boards` - Kanban boards within workspaces
- `lists` - Columns within boards
- `cards` - Tasks within lists

See `supabase/migrations/` for the complete schema.

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## License

This project is open source and available under the [MIT License](LICENSE).

## Support

For issues and questions:
- Check [DEPLOYMENT.md](./DEPLOYMENT.md) for deployment help
- Open an issue on GitHub
- Check [Supabase docs](https://supabase.com/docs)
- Check [Vite docs](https://vitejs.dev)
