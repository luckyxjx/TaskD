# Pre-Deployment Checklist

Use this checklist before deploying to Vercel to ensure everything is configured correctly.

## ✅ Supabase Setup

- [ ] Supabase project created
- [ ] Database migrations applied from `supabase/migrations/20260122110416_create_kanban_schema.sql`
- [ ] Row Level Security (RLS) policies configured for all tables
- [ ] Authentication providers enabled (Email/Password at minimum)
- [ ] Supabase project URL and anon key copied

## ✅ Code Preparation

- [ ] All code committed to Git repository
- [ ] `.env` file is in `.gitignore` (already done ✓)
- [ ] Build succeeds locally (`npm run build`)
- [ ] Type checking passes (`npm run typecheck`)
- [ ] No console errors in development mode

## ✅ Vercel Setup

- [ ] Vercel account created
- [ ] Repository connected to Vercel
- [ ] Environment variables added in Vercel:
  - [ ] `VITE_SUPABASE_URL`
  - [ ] `VITE_SUPABASE_ANON_KEY`
- [ ] First deployment completed successfully

## ✅ Post-Deployment

- [ ] Vercel deployment URL copied (e.g., `https://your-app.vercel.app`)
- [ ] Supabase Site URL updated with Vercel URL
- [ ] Supabase Redirect URLs updated with Vercel URL
- [ ] Test user registration on live site
- [ ] Test user login on live site
- [ ] Test creating workspace/board/list/card
- [ ] Check browser console for errors
- [ ] Test on mobile device

## ✅ Optional Enhancements

- [ ] Custom domain configured in Vercel
- [ ] Custom domain added to Supabase redirect URLs
- [ ] Vercel Analytics enabled
- [ ] Error monitoring set up (Sentry, etc.)
- [ ] Performance monitoring configured

## Common Issues & Solutions

### Build Fails on Vercel
- Check that all dependencies are in `package.json` (not just devDependencies)
- Verify Node.js version compatibility
- Check build logs for specific errors

### Environment Variables Not Working
- Ensure variables start with `VITE_` prefix
- Redeploy after adding variables
- Check variables are set for Production environment

### Authentication Not Working
- Verify Supabase redirect URLs include your Vercel domain
- Check Site URL in Supabase matches your deployment
- Ensure email confirmation settings are correct

### Database Errors
- Verify migrations were applied correctly
- Check RLS policies allow authenticated users to access data
- Test queries in Supabase SQL Editor

## Need Help?

- 📖 Read [DEPLOYMENT.md](./DEPLOYMENT.md) for detailed instructions
- 🔍 Check Vercel deployment logs
- 💬 Review Supabase project logs
- 🐛 Open an issue on GitHub
