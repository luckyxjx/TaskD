# Design System Documentation

## 🎨 Color Palette

### Primary (Blue)
```
50:  #f0f9ff  - Lightest backgrounds
100: #e0f2fe  - Light backgrounds
200: #bae6fd  - Subtle accents
300: #7dd3fc  - Borders, hover states
400: #38bdf8  - Interactive elements
500: #0ea5e9  - Primary brand color
600: #0284c7  - Primary buttons, links
700: #0369a1  - Hover states
800: #075985  - Active states
900: #0c4a6e  - Text, dark elements
```

### Accent (Purple/Pink)
```
50:  #fdf4ff  - Lightest backgrounds
100: #fae8ff  - Light backgrounds
200: #f5d0fe  - Subtle accents
300: #f0abfc  - Borders
400: #e879f9  - Interactive elements
500: #d946ef  - Accent color
600: #c026d3  - Accent buttons
700: #a21caf  - Hover states
800: #86198f  - Active states
900: #701a75  - Dark elements
```

### Success (Green)
```
400: #4ade80  - Success indicators
500: #22c55e  - Success buttons
600: #16a34a  - Success hover
```

### Warning (Amber)
```
400: #fbbf24  - Warning indicators
500: #f59e0b  - Warning buttons
600: #d97706  - Warning hover
```

### Danger (Red)
```
400: #f87171  - Danger indicators
500: #ef4444  - Danger buttons
600: #dc2626  - Danger hover
```

## 🎭 Effects

### Glassmorphism
```css
/* Base Glass */
.glass {
  background: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.15);
}

/* Glass Card */
.glass-card {
  @apply glass rounded-2xl p-6;
  transition: all 300ms;
}

.glass-card:hover {
  box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.25);
}
```

### Gradients
```css
/* Primary Gradient */
.gradient-primary {
  background: linear-gradient(to bottom right, 
    #0ea5e9, #0284c7, #c026d3);
}

/* Text Gradient */
.text-gradient {
  background: linear-gradient(to right, #0284c7, #c026d3);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}
```

## ✨ Animations

### Entrance Animations
```css
/* Fade In */
@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Fade In Up */
@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* Scale In */
@keyframes scaleIn {
  from {
    opacity: 0;
    transform: scale(0.9);
  }
  to {
    opacity: 1;
    transform: scale(1);
  }
}
```

### Continuous Animations
```css
/* Float */
@keyframes float {
  0%, 100% { transform: translateY(0px); }
  50% { transform: translateY(-20px); }
}

/* Bounce Subtle */
@keyframes bounceSubtle {
  0%, 100% { transform: translateY(0); }
  50% { transform: translateY(-10px); }
}

/* Shimmer */
@keyframes shimmer {
  0% { background-position: -1000px 0; }
  100% { background-position: 1000px 0; }
}
```

## 🔘 Button Variants

### Primary
```tsx
<Button variant="primary">
  Click Me
</Button>
```
- Gradient background (primary-500 to primary-600)
- White text
- Shadow on hover
- Scale 1.05 on hover, 0.95 on active

### Secondary
```tsx
<Button variant="secondary">
  Cancel
</Button>
```
- White background
- Gray text
- Border
- Hover: primary-50 background

### Ghost
```tsx
<Button variant="ghost">
  More
</Button>
```
- Transparent background
- Gray text
- Hover: gray-100 background

### Danger
```tsx
<Button variant="danger">
  Delete
</Button>
```
- Gradient background (danger-500 to danger-600)
- White text
- Shadow on hover

### Success
```tsx
<Button variant="success">
  Save
</Button>
```
- Gradient background (success-500 to success-600)
- White text
- Shadow on hover

## 📝 Input Styles

### Standard Input
```tsx
<Input
  label="Email"
  icon={Mail}
  placeholder="you@example.com"
  error="Invalid email"
  helperText="We'll never share your email"
/>
```

### Features
- Icon support (left-aligned)
- Label with proper spacing
- Error states with red border
- Helper text
- Focus ring (primary-500)
- Rounded corners (xl)

## 🎴 Card Variants

### Standard Card
```tsx
<Card>
  Content
</Card>
```
- White background
- Subtle shadow
- Border
- Hover: larger shadow

### Glass Card
```tsx
<Card glass>
  Content
</Card>
```
- Glassmorphism effect
- Backdrop blur
- Semi-transparent

### Interactive Card
```tsx
<Card interactive onClick={handleClick}>
  Content
</Card>
```
- Cursor pointer
- Scale 1.02 on hover
- Scale 0.98 on active

## 🪟 Modal System

### Usage
```tsx
<Modal
  isOpen={isOpen}
  onClose={handleClose}
  title="Modal Title"
  size="md" // sm, md, lg, xl
>
  <div>Modal content</div>
</Modal>
```

### Features
- Glassmorphism design
- Backdrop blur
- ESC key to close
- Click outside to close
- Scale-in animation
- Body scroll lock when open

## 📏 Spacing Scale

```
0.5 → 2px
1   → 4px
2   → 8px
3   → 12px
4   → 16px
5   → 20px
6   → 24px
8   → 32px
10  → 40px
12  → 48px
16  → 64px
20  → 80px
24  → 96px
```

## 🔤 Typography

### Font Weights
```
font-normal    → 400
font-medium    → 500
font-semibold  → 600
font-bold      → 700
```

### Font Sizes
```
text-xs    → 12px
text-sm    → 14px
text-base  → 16px
text-lg    → 18px
text-xl    → 20px
text-2xl   → 24px
text-3xl   → 30px
text-4xl   → 36px
```

## 🎯 Interactive States

### Hover
```css
.interactive:hover {
  transform: scale(1.05);
  box-shadow: 0 10px 40px rgba(0, 0, 0, 0.1);
}
```

### Active
```css
.interactive:active {
  transform: scale(0.95);
}
```

### Focus
```css
.interactive:focus {
  outline: none;
  ring: 2px solid #0284c7;
  ring-offset: 2px;
}
```

## 📱 Breakpoints

```
sm:  640px   - Small devices
md:  768px   - Medium devices
lg:  1024px  - Large devices
xl:  1280px  - Extra large devices
2xl: 1536px  - 2X large devices
```

## 🎨 Usage Examples

### Page Layout
```tsx
<div className="min-h-screen bg-gradient-to-br from-gray-50 via-primary-50/30 to-accent-50/30">
  <header className="glass border-b border-white/20">
    {/* Header content */}
  </header>
  <main className="flex-1 p-6">
    {/* Main content */}
  </main>
</div>
```

### Card Grid
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
  {items.map((item, index) => (
    <Card
      key={item.id}
      glass
      interactive
      style={{ animationDelay: `${index * 50}ms` }}
      className="animate-fade-in-up"
    >
      {/* Card content */}
    </Card>
  ))}
</div>
```

### Form
```tsx
<form className="space-y-5">
  <Input
    label="Email"
    type="email"
    icon={Mail}
    placeholder="you@example.com"
  />
  <Input
    label="Password"
    type="password"
    icon={Lock}
    placeholder="Enter password"
  />
  <Button type="submit" variant="primary" className="w-full">
    Sign In
  </Button>
</form>
```

## 🎭 Best Practices

### Do's ✅
- Use glassmorphism for overlays and cards
- Apply consistent spacing (4px grid)
- Use gradient text for headings
- Add hover/active states to interactive elements
- Stagger animations for lists
- Use semantic color variants
- Maintain consistent border radius

### Don'ts ❌
- Don't mix different animation durations randomly
- Don't use too many different colors
- Don't forget focus states
- Don't use heavy animations on mobile
- Don't skip loading states
- Don't ignore accessibility

## 🚀 Performance Tips

1. **Use CSS Transforms**: Better performance than changing position
2. **Limit Backdrop Blur**: Can be expensive on low-end devices
3. **Debounce Animations**: Don't trigger too frequently
4. **Use will-change**: For elements that will animate
5. **Optimize Images**: Use appropriate formats and sizes

## ✅ Accessibility Checklist

- [ ] Sufficient color contrast (WCAG AA)
- [ ] Focus indicators visible
- [ ] Keyboard navigation works
- [ ] Screen reader friendly
- [ ] Touch targets 44x44px minimum
- [ ] Error messages clear
- [ ] Loading states indicated
- [ ] Animations respect prefers-reduced-motion

## 🎉 Result

A cohesive, modern design system that provides:
- Consistent visual language
- Reusable components
- Smooth animations
- Professional appearance
- Great user experience
- Accessibility compliance
- Performance optimization
