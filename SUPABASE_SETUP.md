# Fresh Supabase Setup Guide

## Clean Migration Files

You now have 3 clean migration files:
1. `20260122110416_create_kanban_schema.sql` - Base schema (workspaces, boards, lists, cards)
2. `20260122120000_add_card_priority.sql` - Priority levels for cards
3. `20260122130000_add_collaboration_features.sql` - Board sharing, invitations, activity log, comments

## Setup Steps

### 1. Create New Supabase Project

1. Go to https://supabase.com/dashboard
2. Click "New Project"
3. Fill in:
   - Name: TaskD (or whatever you want)
   - Database Password: (save this!)
   - Region: Choose closest to you
4. Wait for project to be created

### 2. Enable Email Auth

1. Go to Authentication > Providers
2. Enable Email provider
3. Disable "Confirm email" if you want (for testing)

### 3. Set up OAuth (Optional)

**Google OAuth:**
1. Go to Authentication > Providers > Google
2. Enable Google
3. Follow the setup guide to get Client ID and Secret from Google Cloud Console

**GitHub OAuth:**
1. Go to Authentication > Providers > GitHub
2. Enable GitHub
3. Follow the setup guide to get Client ID and Secret from GitHub Developer Settings

### 4. Run Migrations

Go to SQL Editor and run each migration file in order:

**Migration 1:** Copy and paste `supabase/migrations/20260122110416_create_kanban_schema.sql`
**Migration 2:** Copy and paste `supabase/migrations/20260122120000_add_card_priority.sql`
**Migration 3:** Copy and paste `supabase/migrations/20260122130000_add_collaboration_features.sql`

Click "Run" after each one.

### 5. Update .env File

Update your `.env` file with new credentials:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_REF.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_KEY
```

Get these from: Settings > API

### 6. Update Vercel Environment Variables

1. Go to your Vercel project settings
2. Go to Environment Variables
3. Update:
   - `VITE_SUPABASE_URL`
   - `VITE_SUPABASE_ANON_KEY`
4. Redeploy

### 7. Update Site URL in Supabase

1. Go to Authentication > URL Configuration
2. Add your Vercel URL to:
   - Site URL: `https://your-app.vercel.app`
   - Redirect URLs: `https://your-app.vercel.app/**`

## What's Fixed

✅ No trigger causing infinite recursion
✅ Board owners are added manually in application code
✅ All RLS policies check workspace ownership directly (no recursion)
✅ Clean, working migration files

## Test It

1. Push code to Git
2. Vercel will auto-deploy
3. Try creating a board - should work perfectly!

## Features Included

- ✅ Workspaces, Boards, Lists, Cards
- ✅ Priority levels (low, medium, high, urgent)
- ✅ Board sharing with roles (owner, editor, viewer)
- ✅ Board invitations via email
- ✅ Activity log
- ✅ Card comments with mentions
- ✅ Real-time task completion tracking
- ✅ Dark mode
- ✅ PWA ready

## Next Steps

Once everything is working, you can continue with:
- Phase 1.2: Real-time collaborative updates
- Phase 1.3: Activity log UI
- Phase 1.4: Comments UI
