# Dark Mode Implementation

## ✨ Overview
Your Kanban app now features a complete dark mode system with automatic detection and manual control!

## 🎯 Features

### Theme Options
- **Light Mode**: Clean, bright interface
- **Dark Mode**: Easy on the eyes with dark backgrounds
- **Auto Mode**: Automatically follows your system preferences

### Theme Toggle Location
The theme toggle is located in the **Profile page** under the "Appearance" section with three buttons:
- ☀️ Light
- 🌙 Dark
- 🖥️ Auto

## 🔧 Technical Implementation

### 1. Theme Context (`src/contexts/ThemeContext.tsx`)
- Manages theme state (light/dark/auto)
- Persists preference to localStorage
- Listens to system theme changes in auto mode
- Applies `dark` class to document root

### 2. Tailwind Configuration
- Added `darkMode: 'class'` to enable class-based dark mode
- All existing color utilities work with dark mode

### 3. CSS Updates (`src/index.css`)
- Dark mode variants for all utility classes
- Glassmorphism effects adapted for dark backgrounds
- Custom scrollbar styling for both themes
- Shimmer effects adjusted for dark mode

### 4. Component Updates
All components now support dark mode:
- **Login/SignUp**: Dark backgrounds, adjusted text colors
- **Dashboard**: Dark sidebar, content area, and cards
- **Board**: Dark lists, cards, and modals
- **Profile**: Dark cards and theme toggle
- **Modal**: Dark backdrop and content
- **Input**: Dark backgrounds and borders
- **Button**: Dark secondary variant
- **Card**: Dark backgrounds and borders

## 🎨 Dark Mode Color Scheme

### Backgrounds
```css
Light: bg-gray-50, bg-white
Dark:  bg-gray-900, bg-gray-800
```

### Text
```css
Light: text-gray-900, text-gray-600
Dark:  text-gray-100, text-gray-400
```

### Borders
```css
Light: border-gray-200, border-white/20
Dark:  border-gray-700, border-gray-700/30
```

### Glassmorphism
```css
Light: bg-white/70 backdrop-blur-xl
Dark:  bg-gray-900/70 backdrop-blur-xl
```

### Interactive Elements
```css
Light: hover:bg-gray-100
Dark:  hover:bg-gray-800
```

## 📱 Usage

### For Users
1. Navigate to Profile page
2. Find the "Appearance" section
3. Click on Light, Dark, or Auto
4. Theme changes instantly and persists across sessions

### For Developers
```tsx
import { useTheme } from './contexts/ThemeContext';

function MyComponent() {
  const { theme, effectiveTheme, setTheme } = useTheme();
  
  // Get current theme setting
  console.log(theme); // 'light' | 'dark' | 'auto'
  
  // Get actual theme being displayed
  console.log(effectiveTheme); // 'light' | 'dark'
  
  // Change theme
  setTheme('dark');
}
```

## 🎯 Dark Mode Classes

### Basic Usage
```tsx
// Text color
<p className="text-gray-900 dark:text-gray-100">

// Background
<div className="bg-white dark:bg-gray-800">

// Border
<div className="border-gray-200 dark:border-gray-700">

// Hover states
<button className="hover:bg-gray-100 dark:hover:bg-gray-800">
```

### Glassmorphism
```tsx
// Automatically adapts to dark mode
<div className="glass">
  Content
</div>
```

### Gradients
```tsx
// Gradients work in both modes
<h1 className="bg-gradient-to-r from-primary-600 to-accent-600 bg-clip-text text-transparent">
  Title
</h1>
```

## 🔄 Auto Mode Behavior

When set to "Auto":
1. Checks system preference on load
2. Listens for system theme changes
3. Updates automatically when system theme changes
4. No page reload required

## 💾 Persistence

Theme preference is saved to `localStorage`:
```javascript
localStorage.getItem('theme') // 'light' | 'dark' | 'auto'
```

## ✅ Browser Support

- ✅ Chrome/Edge (latest)
- ✅ Firefox (latest)
- ✅ Safari (latest)
- ✅ All modern browsers with `prefers-color-scheme` support

## 🎨 Customization

### Adding Dark Mode to New Components

1. **Background colors**:
```tsx
className="bg-white dark:bg-gray-800"
```

2. **Text colors**:
```tsx
className="text-gray-900 dark:text-gray-100"
```

3. **Borders**:
```tsx
className="border-gray-200 dark:border-gray-700"
```

4. **Hover states**:
```tsx
className="hover:bg-gray-100 dark:hover:bg-gray-800"
```

### Custom Dark Colors

Add to `tailwind.config.js`:
```javascript
theme: {
  extend: {
    colors: {
      'custom-dark': '#1a1a1a',
    }
  }
}
```

Use in components:
```tsx
className="bg-custom-dark"
```

## 🐛 Troubleshooting

### Theme not applying?
- Check if ThemeProvider wraps your app in `main.tsx`
- Verify `darkMode: 'class'` in `tailwind.config.js`
- Clear localStorage and try again

### Flashing on page load?
- Theme is applied before React renders
- Check ThemeContext initialization

### System theme not detected?
- Ensure browser supports `prefers-color-scheme`
- Check browser settings allow theme detection

## 📊 Performance

- ✅ No performance impact
- ✅ CSS-only transitions
- ✅ No JavaScript for color changes
- ✅ Instant theme switching

## 🎉 Result

Your app now has:
- ✅ Complete dark mode support
- ✅ Automatic system theme detection
- ✅ Manual theme control
- ✅ Persistent theme preference
- ✅ Smooth transitions
- ✅ All pages and components updated
- ✅ Professional dark color scheme
- ✅ Accessible contrast ratios

The dark mode seamlessly integrates with your existing glassmorphism design and maintains the professional, modern aesthetic across both themes!
