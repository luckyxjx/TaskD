# Complete Deployment Guide

## ✅ Your App Status

### PWA Ready
- ✅ Service worker configured
- ✅ Web manifest setup
- ✅ Offline support enabled
- ✅ Auto-update functionality
- ⚠️ **Need to add**: PWA icons (see PWA_SETUP.md)

### Vercel Ready
- ✅ `vercel.json` configured
- ✅ Build scripts ready
- ✅ SPA routing configured
- ✅ Environment variables template

---

## 🚀 Quick Deploy to Vercel

### Method 1: Vercel CLI (Fastest)

```bash
# Install Vercel CLI globally
npm i -g vercel

# Deploy (from project root)
vercel

# Follow the prompts:
# - Set up and deploy? Yes
# - Which scope? (select your account)
# - Link to existing project? No
# - Project name? (press enter for default)
# - Directory? ./ (press enter)
# - Override settings? No

# After deployment, set environment variables:
vercel env add VITE_SUPABASE_URL
vercel env add VITE_SUPABASE_ANON_KEY

# Redeploy with env vars:
vercel --prod
```

### Method 2: GitHub Integration (Recommended for Teams)

1. **Push to GitHub**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git branch -M main
   git remote add origin https://github.com/yourusername/your-repo.git
   git push -u origin main
   ```

2. **Connect to Vercel**
   - Go to https://vercel.com/new
   - Import your GitHub repository
   - Vercel auto-detects Vite configuration
   - Click "Deploy"

3. **Add Environment Variables**
   - Go to Project Settings → Environment Variables
   - Add:
     - `VITE_SUPABASE_URL` = your Supabase project URL
     - `VITE_SUPABASE_ANON_KEY` = your Supabase anon key
   - Redeploy

---

## 🔧 Pre-Deployment Checklist

### 1. Environment Variables
- [ ] Copy `.env.example` to `.env`
- [ ] Fill in your Supabase credentials
- [ ] Never commit `.env` to git (already in .gitignore)

### 2. Supabase Setup
- [ ] Database tables created (run migrations)
- [ ] RLS policies enabled
- [ ] OAuth providers configured (Google, GitHub)
- [ ] Redirect URLs updated:
  - Add: `https://your-app.vercel.app/`
  - Add: `https://your-app.vercel.app/**`

### 3. PWA Icons (Optional but Recommended)
- [ ] Generate icons at https://www.pwabuilder.com/imageGenerator
- [ ] Add to `public/` folder:
  - `pwa-192x192.png`
  - `pwa-512x512.png`
  - `apple-touch-icon.png`
  - `favicon.ico`

### 4. Build Test
```bash
npm run build
npm run preview
```
- [ ] No build errors
- [ ] App loads correctly
- [ ] All features work

---

## 🔐 Supabase Configuration for Production

### Update Redirect URLs

In Supabase Dashboard → Authentication → URL Configuration:

**Site URL:**
```
https://your-app.vercel.app
```

**Redirect URLs (add all):**
```
http://localhost:5173/**
http://localhost:5173
https://your-app.vercel.app/**
https://your-app.vercel.app
https://*.vercel.app/**
```

### OAuth Providers

**Google OAuth:**
- Authorized redirect URIs: `https://your-project.supabase.co/auth/v1/callback`

**GitHub OAuth:**
- Authorization callback URL: `https://your-project.supabase.co/auth/v1/callback`

---

## 📱 PWA Installation

After deployment, users can install your app:

### Desktop (Chrome/Edge)
- Look for install icon in address bar
- Or: Menu → Install [App Name]

### Mobile (iOS Safari)
- Tap Share button
- Tap "Add to Home Screen"

### Mobile (Android Chrome)
- Tap menu (⋮)
- Tap "Install app" or "Add to Home Screen"

---

## 🔄 Continuous Deployment

With GitHub integration:
1. Push to `main` branch
2. Vercel automatically builds and deploys
3. Preview deployments for pull requests
4. Production deployment on merge

---

## 🐛 Troubleshooting

### Build Fails
```bash
# Clear cache and rebuild
rm -rf node_modules dist
npm install
npm run build
```

### Environment Variables Not Working
- Ensure they start with `VITE_`
- Redeploy after adding env vars
- Check Vercel dashboard → Settings → Environment Variables

### OAuth Not Working
- Check Supabase redirect URLs
- Verify OAuth provider credentials
- Check browser console for errors

### PWA Not Installing
- Must be served over HTTPS (Vercel does this automatically)
- Check manifest.json is accessible
- Verify icons exist in public folder
- Check DevTools → Application → Manifest

### Supabase Connection Issues
- Verify environment variables are set
- Check Supabase project is not paused
- Verify RLS policies allow access

---

## 📊 Monitoring

### Vercel Dashboard
- View deployment logs
- Monitor performance
- Check analytics
- View error logs

### Supabase Dashboard
- Monitor database usage
- Check authentication logs
- View API usage
- Monitor storage

---

## 🎯 Post-Deployment

1. **Test Everything**
   - Sign up / Login
   - Create workspace
   - Create board
   - Add cards
   - Test priority levels
   - Test dark mode
   - Test on mobile

2. **Performance**
   - Run Lighthouse audit
   - Check PWA score
   - Optimize if needed

3. **Share**
   - Your app is live! 🎉
   - Share the URL
   - Users can install as PWA

---

## 💡 Tips

- Use Vercel preview deployments for testing
- Set up custom domain in Vercel settings
- Enable Vercel Analytics for insights
- Use Vercel Edge Functions for advanced features
- Monitor Supabase usage to stay within free tier

---

## 🆘 Need Help?

- Vercel Docs: https://vercel.com/docs
- Supabase Docs: https://supabase.com/docs
- Vite PWA Plugin: https://vite-pwa-org.netlify.app/
- GitHub Issues: Create an issue in your repo
