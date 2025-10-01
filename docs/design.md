# Design System Documentation

## Overview

This document defines the design system for the application, establishing consistent visual patterns, interaction behaviors, and styling conventions. The system is designed to be generic and extensible, allowing for brand customization and future component additions.

## Sidebar Navigation System

### Layout & Dimensions

#### Desktop States

- **Collapsed (Default)**: 70px width
- **Expanded (Hover)**: 240px width
- **Header Height**: 70px (consistent across states)
- **Header Width**: 69px (collapsed) / full width (expanded)
- **Transition**: 200ms cubic-bezier(0.4, 0, 0.2, 1)

#### Mobile

- **Width**: 256px (w-64)
- **Overlay**: Semi-transparent backdrop with blur effect
- **Animation**: Transform-based slide in/out

### Visual Hierarchy

#### Navigation Items

- **Height**: 40px per item
- **Spacing**: 8px gap between items (gap-2)
- **Margins**: 15px left/right padding
- **Background Width**:
  - Collapsed: 40px
  - Expanded: calc(100% - 30px)

#### Icons

- **Size**: 16px × 16px (w-4 h-4)
- **Position**: Fixed at left 15px + 40px container
- **Color States**:
  - Default: `text-sidebar-foreground/70`
  - Active: `text-sidebar-primary`
  - Hover: `text-sidebar-primary`

#### Text Labels

- **Font**: text-sm font-medium (14px, 500 weight)
- **Position**: Left 55px (40px icon container + 15px margin)
- **Visibility**: Hidden when collapsed, visible when expanded
- **Color States**:
  - Default: `text-[#666]`
  - Active: `text-primary`
  - Hover: `text-primary`

### Color System

#### Semantic Color Tokens

```css
/* Sidebar-specific colors */
--sidebar-background: /* Main sidebar background */ --sidebar-foreground: /* Primary text color */
  --sidebar-primary: /* Brand/accent color */ --sidebar-primary-foreground: /* Text on primary background */
  --sidebar-accent: /* Active state background */ --sidebar-accent-foreground: /* Text on accent background */
  --sidebar-border: /* Border color */ --sidebar-muted: /* Secondary text (#666) */
  --sidebar-muted-foreground: /* Muted text variants */;
```

#### State-Based Color Applications

- **Default State**: `sidebar-foreground/70` for icons, `#666` for text
- **Active State**: `sidebar-primary` for icons/text, `sidebar-accent` background
- **Hover State**: `sidebar-primary` for icons/text
- **Disabled State**: 50% opacity with `cursor-not-allowed`

### Interaction Patterns

#### Desktop Behavior

- **Trigger**: Mouse enter/leave on sidebar container
- **Collapse Logic**: `!isHovered` (collapses when not hovered)
- **Tooltip Behavior**: None (labels appear/disappear with expansion)
- **Focus Management**: Keyboard navigation maintained

#### Mobile Behavior

- **Trigger**: Menu button (hamburger icon) in top-left
- **Modal Behavior**: Full overlay with backdrop
- **Dismissal**: Backdrop tap, close button, or navigation selection
- **Header**: Custom "App Navigation" title with close button

#### Submenu System (Extensible)

- **Expand/Collapse**: Chevron button with 180° rotation
- **Animation**: max-height transition (0 → 500px)
- **Staggered Entry**: 20ms delay per item
- **Visual Connection**: Left border with hierarchical indentation

### Typography Scale

#### Navigation Text

- **Primary Labels**: text-sm font-medium (14px, 500 weight)
- **Submenu Items**: text-xs font-medium (12px, 500 weight)
- **Brand Logo**: font-bold text-sm (14px, 700 weight)
- **Mobile Header**: text-base font-semibold (16px, 600 weight)

#### Page Content (Tools Page Example)

- **Page Title**: text-3xl font-light (30px, 300 weight)
- **Section Headers**: text-xl font-medium (20px, 500 weight)
- **Card Titles**: text-lg font-medium (18px, 500 weight)
- **Descriptions**: text-sm leading-relaxed (14px, 1.625 line-height)

### Animation & Transitions

#### Timing Functions

- **Primary Transitions**: `cubic-bezier(0.4, 0, 0.2, 1)` - 200ms
- **Layout Changes**: `ease-out` - 300ms
- **Color Changes**: `duration-200` (200ms linear)
- **Submenu Animations**: `ease-out` - 300ms with staggered delays

#### Transform Patterns

- **Width Changes**: Sidebar collapse/expand
- **Opacity Transitions**: Text labels fade in/out
- **Rotation**: Chevron icons (0° → 180°)
- **Translation**: Mobile sidebar slide (-100% → 0%)
- **Scale**: Hover button effects (`hover:scale-105`)

### Responsive Breakpoints

- **Mobile**: `< 768px` (md breakpoint)
  - Overlay sidebar with backdrop
  - Simplified navigation structure
  - Touch-optimized interaction targets
- **Desktop**: `≥ 768px`
  - Fixed sidebar with hover expansion
  - Preserved layout space (70px margin-left on main content)
  - Enhanced hover states and transitions

## Brand Identity

### Logo System

- **Desktop**: Compact circular badge with initials
- **Dimensions**: 28px × 28px (w-7 h-7)
- **Background**: `bg-sidebar-primary`
- **Text**: `text-sidebar-primary-foreground font-bold text-sm`
- **Current Placeholder**: "AW" initials

### Color Palette (Extensible)

```css
/* Base theme structure - customizable per brand */
:root {
  /* Primary brand color */
  --brand-primary: #your-brand-color;
  --brand-primary-foreground: #ffffff;

  /* Sidebar theme mapping */
  --sidebar-primary: var(--brand-primary);
  --sidebar-primary-foreground: var(--brand-primary-foreground);

  /* Neutral palette */
  --sidebar-background: #fafafa; /* Light mode */
  --sidebar-foreground: #171717;
  --sidebar-accent: #f4f4f5;
  --sidebar-border: #e4e4e7;
}

@media (prefers-color-scheme: dark) {
  :root {
    --sidebar-background: #0a0a0a; /* Dark mode */
    --sidebar-foreground: #fafafa;
    --sidebar-accent: #18181b;
    --sidebar-border: #27272a;
  }
}
```

## Component Architecture

### Sidebar Component Structure

```
IntegratedAside/
├── Desktop Sidebar (hover behavior)
├── Mobile Trigger Button
├── Mobile Sidebar (overlay)
└── Navigation Items
    ├── Icon (fixed position)
    ├── Text Label (conditional)
    ├── Background (dynamic width)
    └── Submenu (expandable)
```

### Page Layout Pattern (Tools Page)

```
Page Layout/
├── Full-height container (min-h-screen)
├── Sidebar background inheritance
├── Content container (max-w-6xl, centered)
├── Header section (icon + title + description)
├── Grid layout (responsive columns)
└── Action sections (quick actions, etc.)
```

## Future Extensibility

### Planned Brand Elements

- [ ] Custom logo integration
- [ ] Brand color theming system
- [ ] Typography scale refinement
- [ ] Icon library standardization
- [ ] Animation library expansion

### Component Additions

- [ ] Breadcrumb navigation
- [ ] Search functionality within sidebar
- [ ] User avatar/profile customization
- [ ] Theme switcher (light/dark mode)
- [ ] Notification badges
- [ ] Contextual help tooltips

### Accessibility Considerations

- [ ] ARIA labels for screen readers
- [ ] Keyboard navigation patterns
- [ ] Focus management for modal states
- [ ] High contrast mode support
- [ ] Reduced motion preferences

### Performance Optimizations

- [ ] Icon sprite system
- [ ] CSS custom properties optimization
- [ ] Animation performance monitoring
- [ ] Mobile touch response optimization

## Implementation Notes

### CSS Architecture

- Uses Tailwind CSS utility classes
- Follows design token system for consistent theming
- Responsive design with mobile-first approach
- Component-scoped styling with conditional classes

### State Management

- React hooks for local UI state
- Context API for shared sidebar state
- URL-based active state detection
- Persistent user preferences (future)

### Browser Support

- Modern evergreen browsers (Chrome, Firefox, Safari, Edge)
- CSS custom properties support required
- CSS Grid and Flexbox support required
- Transform3d hardware acceleration utilized

---

_This design system is living documentation and should be updated as the application evolves. All measurements, colors, and patterns should be validated against actual implementation._
