# PWA Setup Guide

Your app is now configured as a Progressive Web App (PWA)! 🎉

## What's Already Done ✅

- ✅ PWA plugin installed (`vite-plugin-pwa`)
- ✅ Service worker configured for offline support
- ✅ Web manifest configured
- ✅ Auto-update functionality
- ✅ Supabase API caching strategy
- ✅ Meta tags for mobile optimization

## What You Need to Do 📝

### 1. Generate PWA Icons

You need to create actual icon files. Use one of these tools:

**Option A: PWA Builder (Recommended)**
1. Go to https://www.pwabuilder.com/imageGenerator
2. Upload a 512x512 PNG of your logo/icon
3. Download the generated icons
4. Place these files in the `public/` folder:
   - `pwa-192x192.png`
   - `pwa-512x512.png`
   - `apple-touch-icon.png` (180x180)
   - `favicon.ico`

**Option B: RealFaviconGenerator**
1. Go to https://realfavicongenerator.net/
2. Upload your icon
3. Download and extract to `public/` folder

### 2. Test PWA Locally

```bash
npm run build
npm run preview
```

Then open Chrome DevTools → Application → Manifest to verify.

### 3. Deploy to Vercel

Your app is already Vercel-ready! Just:

```bash
vercel
```

Or connect your GitHub repo to Vercel for automatic deployments.

## PWA Features Included

- **Offline Support**: App works without internet (cached assets)
- **Install Prompt**: Users can install app to home screen
- **Auto Updates**: Service worker updates automatically
- **Fast Loading**: Assets cached for instant loading
- **Mobile Optimized**: Proper viewport and theme color

## Testing PWA

### Desktop (Chrome)
1. Build and preview the app
2. Open DevTools → Application → Service Workers
3. Check "Offline" and reload - app should still work
4. Look for install button in address bar

### Mobile
1. Deploy to Vercel
2. Open in mobile browser
3. Look for "Add to Home Screen" prompt
4. Install and test offline functionality

## Environment Variables

Make sure to set these in Vercel:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

## Vercel Deployment

Your `vercel.json` is already configured. To deploy:

1. Install Vercel CLI: `npm i -g vercel`
2. Run: `vercel`
3. Follow prompts
4. Set environment variables in Vercel dashboard

Or use GitHub integration for automatic deployments.

## Notes

- The service worker caches Supabase API calls for 24 hours
- Static assets are cached indefinitely
- The app updates automatically when you deploy new versions
- Users will see an update notification (you can customize this)

## Customization

Edit `vite.config.ts` to customize:
- App name and description
- Theme colors
- Caching strategies
- Icon paths
- Offline behavior
