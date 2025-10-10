# Design Implementation Guide

Technical specifications and code patterns for implementing the design system.

> For the design philosophy, visual language, and conceptual foundations, see [DESIGN_SYSTEM.md](./DESIGN_SYSTEM.md).

## Typography

### Font Stack
```css
font-family: system-ui, sans-serif;
```

### Type Scale
```css
/* Display - Page titles, hero sections */
font-size: 30px;
font-weight: 300; /* Light */
line-height: 1.2;

/* Heading - Major section headers */
font-size: 20px;
font-weight: 500; /* Medium */
line-height: 1.3;

/* Subheading - Card titles, subsections */
font-size: 18px;
font-weight: 500; /* Medium */
line-height: 1.4;

/* Body - Navigation, content */
font-size: 14px;
font-weight: 500; /* Medium */
line-height: 1.5;

/* Caption - Timestamps, metadata */
font-size: 12px;
font-weight: 500; /* Medium */
line-height: 1.5;

/* Emphasis weights */
font-weight: 600; /* Semibold - emphasis */
font-weight: 700; /* Bold - brand, strong hierarchy */
```

## Colors

### Color Space
All colors defined in OKLCH for perceptual uniformity:
```css
/* OKLCH syntax: oklch(lightness chroma hue / alpha) */
/* Example: oklch(0.95 0.01 240 / 1) */
```

### Palette

**Neutrals:**
```css
--gray-50: oklch(0.98 0 0);     /* #F9F9F9 - Lightest */
--gray-100: oklch(0.96 0 0);    /* #F5F5F5 - Hover/selection background */
--gray-200: oklch(0.92 0 0);    /* #EBEBEB - Borders */
--gray-300: oklch(0.86 0 0);    /* #DBDBDB */
--gray-400: oklch(0.70 0 0);    /* #B3B3B3 - Muted text */
--gray-500: oklch(0.56 0 0);    /* #8E8E8E - Secondary text */
--gray-600: oklch(0.45 0 0);    /* #6C6C6C - Icons */
--gray-700: oklch(0.35 0 0);    /* #555555 */
--gray-800: oklch(0.25 0 0);    /* #3D3D3D */
--gray-900: oklch(0.15 0 0);    /* #252525 - Primary text */

--white: oklch(1 0 0);          /* #FFFFFF */
--black: oklch(0 0 0);          /* #000000 */
```

**Accent (Blue):**
```css
--blue-50: oklch(0.95 0.03 240);
--blue-500: oklch(0.55 0.18 240);  /* Primary accent */
--blue-600: oklch(0.45 0.18 240);  /* Hover/pressed */
```

**Semantic:**
```css
/* Success */
--green-500: oklch(0.60 0.15 145);

/* Warning */
--yellow-500: oklch(0.75 0.15 85);

/* Error/Destructive */
--red-500: oklch(0.55 0.20 25);
--red-600: oklch(0.45 0.20 25);
```

### Color Usage

**Text:**
```css
/* Primary text */
color: var(--gray-900);

/* Secondary text */
color: var(--gray-500);

/* Muted text */
color: var(--gray-400);
```

**Backgrounds:**
```css
/* Page background */
background: var(--white);

/* Hover state */
background: var(--gray-100);

/* Selection state */
background: var(--gray-100);
border-radius: 8px;

/* Active icon */
color: var(--blue-500);
```

## Spacing

### Base Unit
```css
--spacing-unit: 4px;
```

### Scale
```css
--spacing-1: 4px;   /* 0.25rem */
--spacing-2: 8px;   /* 0.5rem */
--spacing-3: 12px;  /* 0.75rem */
--spacing-4: 16px;  /* 1rem */
--spacing-6: 24px;  /* 1.5rem */
--spacing-8: 32px;  /* 2rem */
```

### Component Spacing

**List items (vertical):**
```css
gap: 8px;  /* Between items */
/* or */
gap: 12px; /* More generous */
```

**Icon + Label (horizontal):**
```css
gap: 8px;
/* or */
gap: 12px; /* More breathing room */
```

**Section spacing:**
```css
margin-bottom: 24px; /* Between sections */
/* or */
margin-bottom: 32px; /* Major sections */
```

**Component padding:**
```css
padding: 12px 16px; /* Vertical | Horizontal */
```

## Border Radius

```css
--radius-sm: 6px;   /* Nested elements */
--radius: 10px;     /* Default */
--radius-md: 8px;   /* Selection states */
--radius-lg: 12px;  /* Large containers */
--radius-full: 9999px; /* Pills */
```

### Usage
```css
/* Default rounded corners */
border-radius: var(--radius);

/* Selection background */
border-radius: 8px;

/* Pills/fully rounded */
border-radius: 9999px;
```

## Borders

```css
/* Hairline border */
border: 1px solid var(--gray-200);

/* Dark mode border */
border: 1px solid oklch(1 0 0 / 0.1); /* 10% white */
```

## Shadows

```css
/* Barely perceptible */
--shadow-xs: 0 1px 2px 0 rgb(0 0 0 / 0.05);

/* Subtle elevation */
--shadow-sm: 0 1px 3px 0 rgb(0 0 0 / 0.1),
             0 1px 2px -1px rgb(0 0 0 / 0.1);
```

## Focus Rings

**Always use box-shadow, never outline:**
```css
/* Focus state */
outline: none;
box-shadow: 0 0 0 3px oklch(0.56 0 0 / 0.5);

/* Or with utility classes */
@apply ring-2 ring-gray-500/50 ring-offset-2;
```

## Transitions

### Timing Functions

```css
/* Primary transitions - interactive states */
transition: all 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Layout changes - expansions/collapses */
transition: all 300ms ease-out;

/* Color changes */
transition: background-color 200ms linear,
            color 200ms linear;
```

### Specific Timing Values

```css
/* Interactive state changes (hover, focus) */
--transition-fast: 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Layout shifts (sidebar expand, submenu reveal) */
--transition-medium: 300ms ease-out;

/* Staggered animations - delay per item */
--stagger-delay: 20ms; /* multiply by index for sequential reveal */
```

### Animation Patterns

```css
/* Rotation - chevron icons */
transform: rotate(180deg);
transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);

/* Slide in - mobile sidebar */
transform: translateX(-100%); /* hidden */
transform: translateX(0);     /* visible */
transition: transform 300ms ease-out;

/* Fade with stagger - list items */
opacity: 0;
animation: fadeIn 300ms ease-out forwards;
animation-delay: calc(var(--stagger-delay) * var(--item-index));

@keyframes fadeIn {
  to { opacity: 1; }
}
```

**What to animate:**
- Background colors
- Colors
- Opacity
- Height (for expanding/collapsing)
- Transform rotation (chevrons)
- Transform translation (mobile overlays)

**What NOT to animate:**
- Width (except sidebar expansion)
- Scale
- Position (except explicit sliding patterns)

## Component Heights

```css
--height-sm: 32px;  /* Small buttons */
--height-md: 36px;  /* Default buttons */
--height-lg: 40px;  /* Large buttons */
--height-xl: 44px;  /* Extra large */
```

## Interactive States

### Hover
```css
.interactive:hover {
  background: var(--gray-100); /* #F5F5F5 */
  transition: background-color 200ms ease-out;
}
```

### Active/Selected
```css
.selected {
  background: var(--gray-100);
  border-radius: 8px;
}

.selected .icon {
  color: var(--blue-500);
}
```

### Focus
```css
.interactive:focus-visible {
  outline: none;
  box-shadow: 0 0 0 3px oklch(0.56 0 0 / 0.5);
}
```

### Disabled
```css
.disabled {
  opacity: 0.5;
  pointer-events: none;
  cursor: not-allowed;
}
```

## Navigation Lists

### Structure
```tsx
<nav className="flex flex-col gap-2 p-4">
  <button className="
    flex items-center gap-3
    px-3 py-2
    rounded-lg
    transition-colors duration-200
    hover:bg-gray-100
    focus-visible:ring-2 focus-visible:ring-gray-500/50
    data-[active=true]:bg-gray-100
  ">
    <Icon className="
      w-5 h-5
      text-gray-600
      data-[active=true]:text-blue-500
    " />
    <span className="text-sm font-medium text-gray-900">
      Label
    </span>
  </button>
</nav>
```

### CSS Implementation
```css
/* Container */
.nav-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 16px;
}

/* Item */
.nav-item {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 200ms ease-out;
  cursor: pointer;
}

.nav-item:hover {
  background: var(--gray-100);
}

.nav-item[data-active="true"] {
  background: var(--gray-100);
}

/* Icon */
.nav-item-icon {
  width: 20px;
  height: 20px;
  color: var(--gray-600);
  flex-shrink: 0;
}

.nav-item[data-active="true"] .nav-item-icon {
  color: var(--blue-500);
}

/* Label */
.nav-item-label {
  font-size: 14px;
  font-weight: 500;
  color: var(--gray-900);
}
```

## Sidebar Navigation

### Desktop Dimensions

```css
/* Collapsed state (default) */
--sidebar-width-collapsed: 70px;
--sidebar-header-height: 70px;

/* Expanded state (hover) */
--sidebar-width-expanded: 240px;

/* Transition */
transition: width 200ms cubic-bezier(0.4, 0, 0.2, 1);
```

### Mobile Dimensions

```css
/* Mobile sidebar */
--sidebar-width-mobile: 256px; /* w-64 */

/* Overlay */
backdrop-filter: blur(8px);
background: rgba(0, 0, 0, 0.5);
```

### Navigation Item Dimensions

```css
/* Item dimensions */
--nav-item-height: 40px;
--nav-item-gap: 8px; /* Between items */
--nav-item-padding-x: 15px;

/* Icon container */
--icon-container-size: 40px;

/* Background widths */
--nav-bg-collapsed: 40px;
--nav-bg-expanded: calc(100% - 30px); /* Full width minus margins */
```

### Submenu System

```css
/* Chevron rotation */
.chevron {
  transform: rotate(0deg);
  transition: transform 200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.chevron[data-expanded="true"] {
  transform: rotate(180deg);
}

/* Submenu expansion */
.submenu {
  max-height: 0;
  overflow: hidden;
  transition: max-height 300ms ease-out;
}

.submenu[data-expanded="true"] {
  max-height: 500px;
}

/* Submenu items with stagger */
.submenu-item {
  opacity: 0;
  animation: fadeIn 300ms ease-out forwards;
  animation-delay: calc(20ms * var(--item-index));
}
```

### Desktop Implementation

```tsx
<aside className="
  fixed left-0 top-0 h-screen
  transition-all duration-200
  data-[collapsed=true]:w-[70px]
  data-[collapsed=false]:w-[240px]
">
  <div className="flex flex-col gap-2 p-[15px]">
    <button className="
      flex items-center
      h-10 rounded-lg
      transition-colors duration-200
      hover:bg-gray-100
      data-[active=true]:bg-gray-100
    ">
      <div className="w-10 flex justify-center">
        <Icon className="
          w-4 h-4
          text-gray-600
          data-[active=true]:text-blue-500
        " />
      </div>
      <span className="
        text-sm font-medium
        data-[collapsed=true]:hidden
      ">
        Label
      </span>
    </button>
  </div>
</aside>
```

### Mobile Implementation

```tsx
<>
  {/* Trigger button */}
  <button className="md:hidden">
    <MenuIcon />
  </button>

  {/* Overlay sidebar */}
  <div className="
    fixed inset-0 z-50
    md:hidden
    data-[open=false]:hidden
  ">
    {/* Backdrop */}
    <div className="
      absolute inset-0
      bg-black/50 backdrop-blur-sm
    " onClick={close} />

    {/* Sidebar */}
    <aside className="
      absolute left-0 top-0 h-full
      w-64 bg-white
      transform transition-transform duration-300
      data-[open=false]:-translate-x-full
      data-[open=true]:translate-x-0
    ">
      {/* Navigation content */}
    </aside>
  </div>
</>
```

## Icons

### Sizing
```css
/* Default */
width: 20px;
height: 20px;

/* Small */
width: 16px;
height: 16px;

/* Large */
width: 24px;
height: 24px;
```

### Styling
```css
.icon {
  stroke-width: 2; /* For line icons */
  color: var(--gray-600);
}

/* Active state */
.active .icon {
  color: var(--blue-500);
}
```

### Component Pattern
```tsx
interface IconProps {
  icon: React.ComponentType<any>
  className?: string
  size?: number
}

function Icon({ icon: IconComponent, className, size = 20 }: IconProps) {
  return <IconComponent className={className} size={size} strokeWidth={2} />
}
```

## Buttons

### Ghost Button
```css
.btn-ghost {
  background: transparent;
  color: var(--gray-900);
  border: none;
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 200ms ease-out;
}

.btn-ghost:hover {
  background: var(--gray-100);
}
```

### Outline Button
```css
.btn-outline {
  background: transparent;
  color: var(--gray-900);
  border: 1px solid var(--gray-200);
  padding: 8px 12px;
  border-radius: 8px;
  transition: background-color 200ms ease-out;
}

.btn-outline:hover {
  background: var(--gray-100);
}
```

### Solid Button
```css
.btn-solid {
  background: var(--gray-900);
  color: var(--white);
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background-color 200ms ease-out;
}

.btn-solid:hover {
  background: var(--gray-800);
}
```

### Destructive Button
```css
.btn-destructive {
  background: var(--red-500);
  color: var(--white);
  border: none;
  padding: 8px 16px;
  border-radius: 8px;
  transition: background-color 200ms ease-out;
}

.btn-destructive:hover {
  background: var(--red-600);
}
```

## Dark Mode

### Background Colors
```css
/* Base background */
--dark-bg: oklch(0.15 0 0);

/* Elevated surfaces */
--dark-surface: oklch(0.20 0 0);

/* Hover overlay */
--dark-hover: oklch(1 0 0 / 0.05);
```

### Borders in Dark Mode
```css
/* Use transparent white overlays */
border: 1px solid oklch(1 0 0 / 0.1);
```

### Text in Dark Mode
```css
/* Primary text */
color: oklch(0.95 0 0);

/* Secondary text */
color: oklch(0.65 0 0);
```

## Tailwind Configuration

```js
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        gray: {
          50: 'oklch(0.98 0 0)',
          100: 'oklch(0.96 0 0)',
          // ... rest of scale
        },
        blue: {
          500: 'oklch(0.55 0.18 240)',
          600: 'oklch(0.45 0.18 240)',
        }
      },
      spacing: {
        // Uses default 4px base unit (0.25rem)
      },
      borderRadius: {
        DEFAULT: '10px',
        'md': '8px',
        'lg': '12px',
      },
      boxShadow: {
        'xs': '0 1px 2px 0 rgb(0 0 0 / 0.05)',
        'sm': '0 1px 3px 0 rgb(0 0 0 / 0.1), 0 1px 2px -1px rgb(0 0 0 / 0.1)',
      },
      transitionDuration: {
        DEFAULT: '200ms',
      },
      transitionTimingFunction: {
        DEFAULT: 'cubic-bezier(0, 0, 0.2, 1)', // ease-out
      }
    }
  }
}
```

## Common Patterns

### Card
```css
.card {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 10px;
  box-shadow: var(--shadow-xs);
  padding: 24px;
}
```

### Input Field
```css
.input {
  background: var(--white);
  border: 1px solid var(--gray-200);
  border-radius: 8px;
  padding: 8px 12px;
  font-size: 14px;
  transition: border-color 200ms ease-out;
}

.input:focus {
  outline: none;
  border-color: var(--blue-500);
  box-shadow: 0 0 0 3px oklch(0.55 0.18 240 / 0.1);
}
```

### Pill/Badge
```css
.pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 4px 12px;
  background: transparent;
  border: 1px solid var(--gray-200);
  border-radius: 9999px;
  font-size: 12px;
  font-weight: 500;
  transition: background-color 200ms ease-out;
}

.pill:hover {
  background: var(--gray-100);
}
```
