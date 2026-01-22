# Quick Deploy Guide

## 🚀 Deploy in 5 Minutes

### 1. Supabase Setup (2 min)
```bash
# Go to https://supabase.com
# Create new project
# Copy your project URL and anon key
# Run the SQL from: supabase/migrations/20260122110416_create_kanban_schema.sql
```

### 2. Push to Git (1 min)
```bash
git add .
git commit -m "Ready for deployment"
git push origin main
```

### 3. Deploy to Vercel (2 min)
```bash
# Go to https://vercel.com
# Click "Add New Project"
# Import your repository
# Add environment variables:
#   VITE_SUPABASE_URL=<your-url>
#   VITE_SUPABASE_ANON_KEY=<your-key>
# Click "Deploy"
```

### 4. Configure Supabase Redirects (30 sec)
```bash
# Copy your Vercel URL (e.g., https://your-app.vercel.app)
# Go to Supabase > Authentication > URL Configuration
# Set Site URL to your Vercel URL
# Add Vercel URL to Redirect URLs
```

## ✅ Done!

Visit your Vercel URL and test the app.

---

**Need more details?** See [DEPLOYMENT.md](./DEPLOYMENT.md)

**Having issues?** Check [CHECKLIST.md](./CHECKLIST.md)
