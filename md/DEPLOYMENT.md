# Vercel Deployment Guide

## Prerequisites

1. A [Vercel account](https://vercel.com/signup)
2. A [Supabase project](https://supabase.com) with the database schema applied
3. Git repository (GitHub, GitLab, or Bitbucket)

## Step-by-Step Deployment

### 1. Prepare Your Supabase Project

Before deploying, ensure your Supabase project is properly configured:

#### Apply Database Migrations
```bash
# If you have Supabase CLI installed
supabase db push

# Or manually run the SQL from supabase/migrations/20260122110416_create_kanban_schema.sql
# in your Supabase SQL Editor
```

#### Configure Authentication
1. Go to your Supabase project dashboard
2. Navigate to **Authentication** > **URL Configuration**
3. Add your Vercel deployment URL to **Site URL** (you'll update this after first deploy)
4. Add your Vercel URL to **Redirect URLs** list

#### Set Up Row Level Security (RLS)
Make sure you have RLS policies configured for your tables. Example policies:

```sql
-- Enable RLS on all tables
ALTER TABLE workspaces ENABLE ROW LEVEL SECURITY;
ALTER TABLE boards ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE cards ENABLE ROW LEVEL SECURITY;

-- Example: Users can only see their own workspaces
CREATE POLICY "Users can view their own workspaces"
  ON workspaces FOR SELECT
  USING (auth.uid() = owner_id);

CREATE POLICY "Users can create their own workspaces"
  ON workspaces FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

-- Add similar policies for boards, lists, and cards
```

### 2. Push Your Code to Git

```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 3. Deploy to Vercel

#### Option A: Using Vercel Dashboard (Recommended)

1. Go to [vercel.com](https://vercel.com) and sign in
2. Click **"Add New Project"**
3. Import your Git repository
4. Vercel will auto-detect Vite configuration
5. **Add Environment Variables:**
   - Click **"Environment Variables"**
   - Add the following:
     - `VITE_SUPABASE_URL` = Your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = Your Supabase anon/public key
6. Click **"Deploy"**

#### Option B: Using Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login to Vercel
vercel login

# Deploy
vercel

# Follow the prompts and add environment variables when asked
```

### 4. Configure Environment Variables

After deployment, you can manage environment variables:

1. Go to your project in Vercel dashboard
2. Navigate to **Settings** > **Environment Variables**
3. Add or update:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Redeploy if you add variables after initial deployment

### 5. Update Supabase Redirect URLs

1. Copy your Vercel deployment URL (e.g., `https://your-app.vercel.app`)
2. Go to Supabase dashboard > **Authentication** > **URL Configuration**
3. Update **Site URL** to your Vercel URL
4. Add your Vercel URL to **Redirect URLs**

### 6. Test Your Deployment

1. Visit your Vercel URL
2. Test user registration and login
3. Verify database operations work correctly
4. Check browser console for any errors

## Continuous Deployment

Vercel automatically deploys:
- **Production**: Pushes to your main/master branch
- **Preview**: Pull requests and other branches

## Troubleshooting

### Build Fails
- Check build logs in Vercel dashboard
- Ensure all dependencies are in `package.json`
- Run `npm run build` locally to test

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Redeploy after adding new variables
- Check variables are set for the correct environment (Production/Preview)

### Supabase Connection Issues
- Verify environment variables are correct
- Check Supabase project is not paused
- Ensure RLS policies allow your operations

### Authentication Issues
- Verify redirect URLs in Supabase match your Vercel domain
- Check Site URL is set correctly
- Ensure email confirmation is configured if required

## Custom Domain (Optional)

1. Go to your Vercel project
2. Navigate to **Settings** > **Domains**
3. Add your custom domain
4. Update DNS records as instructed
5. Update Supabase redirect URLs with your custom domain

## Performance Optimization

Your project is already optimized with:
- ✅ Vite for fast builds
- ✅ Code splitting
- ✅ Tree shaking
- ✅ Minification

Consider adding:
- Image optimization
- CDN caching headers
- Analytics (Vercel Analytics)

## Support

- [Vercel Documentation](https://vercel.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Documentation](https://vitejs.dev)
