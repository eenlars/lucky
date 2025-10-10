# Design Language

A guide to replicating the visual aesthetic and emotional character of this interface design.

## The Feeling

**Calm competence.** This design creates trustworthy clarity without sterility. Generous space gives room to think. Nothing shouts—elements present themselves with quiet confidence. The aesthetic is professional without being rigid, approachable without being playful.

**Approachable clarity.** Everything sits exactly where it should, with space to breathe. You know where you are through subtle cues, not loud announcements. The design respects intelligence and creates control without constraint—like a well-organized workspace where everything has its place and navigation feels effortless.

## Visual Foundation

### Typography

**Clean, readable type establishes calm hierarchy.**

The interface uses clean sans-serif typefaces that prioritize readability and professionalism. Type is medium-weight, left-aligned, and scannable—creating clear information architecture without decorative flourish.

**Hierarchy levels:**
- **Display**: Large, light-weight headings for page titles and hero sections
- **Heading**: Medium-weight headers for major sections
- **Subheading**: Medium-weight labels for cards and subsections
- **Body**: Standard text for content and navigation
- **Caption**: Small text for supporting information, timestamps, metadata

**Characteristics:**
- **Weights**: Light (300) for display, Medium (500) for body, Semibold (600) for emphasis, Bold (700) for strong hierarchy
- **Line height**: Generous (1.5-1.6) for comfortable reading, tighter (1.3) for headings
- **Alignment**: Left-aligned for natural scanning

Type choices favor clarity over character—readable, approachable, professional.

### Color Philosophy

**Restrained neutrals with intentional accent.**

The palette is fundamentally neutral—soft grays dominate the interface, creating calm visual space. Color appears sparingly as accent, used only to communicate active state, hierarchy, or semantic meaning. This restraint makes colored elements feel significant.

**The approach:**
- **Neutrals**: Soft grays for most interface elements
- **Single accent**: Blue (or brand color) for active/selected states and primary actions
- **Semantic colors**: Distinct hues for success/warning/error, used only when needed
- **High contrast text**: Near-black on light backgrounds for readability
- **Subtle backgrounds**: Very light gray fills for hover and selection states

**Application principle:**
Neutral by default, colored with purpose. The eye finds meaning through selective use of hue—an active icon in blue, an error in red. Everything else recedes into calm gray.

### Spatial System

**Generous space creates breathing room.**

Space follows a consistent base unit, with deliberate preference for vertical generosity. Items are given room to exist independently, separated by empty space rather than dividers.

**Vertical rhythm:**
- **List items**: Generous spacing between navigation items
- **Related groups**: More space between sections
- **Major sections**: Significant breathing room between distinct areas

**Horizontal relationships:**
- **Icon + text**: Comfortable gap between icon and label
- **Component padding**: Internal breathing room
- **Edge margins**: Distance from container edges

**Component proportions:**
- Small, medium, and large interactive elements follow consistent height ratios
- Interactive targets are large enough for comfortable interaction

Generous spacing creates scanability and calm. Elements breathe. The eye moves effortlessly from item to item without clutter or cognitive friction.

### Shape Language

**Soft geometry without decoration.**

**Corners:**
All shapes share subtle rounding that softens rectangles without introducing playfulness. Nested elements use slightly tighter radii, maintaining consistent corner flow.

- Rectangles: Subtle rounding
- Pills: Fully rounded ends
- Nested elements: Tighter radius than container

**Borders:**
Hairline-thin borders in very light gray define boundaries without weight. In dark mode, borders become semi-transparent white overlays, creating separation through luminosity rather than hue.

**Shadows:**
Shadows are barely perceptible—just enough depth to lift elements without creating drama. Most surfaces sit flat. Floating elements like popovers and dialogs get subtle elevation.

### Motion Character

**Brief, purposeful transitions.**

Movement is quick and decisive. Nothing floats or bounces. State changes happen fast enough to feel instant but slow enough to track.

**What moves:**
- Background colors on hover
- Focus ring appearance
- Height for collapsing/expanding content
- Opacity for disabled states

**What doesn't:**
- Position (no sliding)
- Size (no scaling)
- Rotation (no spinning except loaders)

Restraint in motion reinforces the aesthetic of clarity and efficiency.

## Interactive States

### Hover

Hovering reveals interaction potential through whisper-subtle background shifts. Interactive elements gain a very light gray background—barely there, just enough to say "this responds."

The transition is soft and uniform. No borders appear, no shadows grow. Just the quietest background tone shift.

### Active/Selected

**The most important state: understated confidence.**

Selected or active items receive:
- **Light background fill**: Soft rounded rectangle in very light gray
- **Accent color icon**: The icon shifts to brand/accent color while text stays neutral
- **No border**: Selection is communicated through fill alone, no additional outline
- **Maintained spacing**: The background fill is contained, doesn't touch adjacent items

This creates clear "you are here" feedback without shouting. The colored icon draws the eye; the light background provides spatial confirmation.

### Focus

Focus is explicit but gentle: a semi-transparent ring surrounds the focused element. The ring color is mid-gray, visible but not aggressive.

### Disabled

Disabled elements reduce opacity significantly and become non-interactive. No color change, no blur—just transparency to signal unavailability.

## Brand Elements

### Logo Placement

**Simple, unobtrusive identity.**

Brand logos should establish identity without dominating the interface. In navigation contexts, logos are compact and minimal.

**Patterns:**
- **Desktop navigation**: Compact logo or badge, often icon-only or initials
- **Mobile headers**: Slightly larger, may include full wordmark
- **Loading states**: Centered, larger format for brand moments
- **Proportions**: Logos scale with their container but maintain clear space around them

Logos sit in consistent positions—typically top-left for navigation—and use brand colors that integrate with the overall palette.

## Pattern Language

### Buttons

Buttons exist in discrete variants, each with clear purpose:

**Ghost**: Transparent until hovered, then filled with accent gray. Feels like it's "not there" until needed.

**Outline**: Bordered rectangle, gray fill on hover. More present than ghost, less committed than solid.

**Solid**: Dark background (primary color) with white text. The strongest visual weight—use sparingly for primary actions.

**Destructive**: Red background, reserved exclusively for deletion and dangerous actions.

**Proportions**: Buttons come in small, medium, and large sizes. Icon-only buttons are perfect squares. Buttons with text get horizontal padding proportional to their height.

### Input Fields

Input fields compose from multiple parts but appear as single units:

A thin border defines the boundary. Inside, the textarea or input sits flush (no internal border). Addons—icons, buttons, labels—sit within the same bordered container, separated by space rather than additional borders.

This creates composite inputs where all pieces share one outline, one focus ring, one visual envelope.

### Message Bubbles

Two distinct treatments:

**User messages**: Rounded rectangles with dark background, white text. Always right-aligned with visible bubble shape.

**Assistant messages**: Flat layout with minimal background (or none). Left-aligned, less visual weight.

This asymmetry creates conversational rhythm—user input looks "sent," assistant responses look "inline."

### Cards

Cards are rectangular containers with:
- Hair-thin border
- Barely-there shadow
- Generous internal spacing between sections
- Optional divider lines for section breaks

Cards feel like paper laid on a surface—present but not floating.

### Pills and Badges

Suggestion pills are fully rounded rectangles with outline styling. They feel like buttons but softer, inviting exploration without demanding action.

Badges are small, rectangular with subtle rounding, used to label or tag. Text is small, weight is medium.

### Navigation Lists

**Vertical menus with generous breathing room.**

Navigation lists present options with calm, scannable clarity:

**Structure:**
- Icon + label pairs, left-aligned
- Generous vertical spacing between items
- No divider lines—space alone creates separation
- Consistent left edge alignment (icons create visual column)

**Selection state:**
- Light gray background fill with soft rounded corners
- Icon shifts to accent color
- Label stays neutral gray/black
- Background is contained within item bounds

**Visual behavior:**
- Flat depth—no shadows or elevation changes
- Hover adds subtle background tint
- Focus ring on keyboard navigation
- Active state uses same styling as selection

This creates effortless navigation—instantly scannable, obvious selection state, no visual clutter. Each item exists independently with room to breathe.

### Sidebar Navigation

**Adaptive space management with hover expansion.**

Sidebars balance space efficiency with information density through contextual expansion.

**Desktop behavior:**
- **Collapsed state (default)**: Narrow width showing icons only
- **Expanded state (hover)**: Full width revealing labels and additional context
- **Smooth transition**: Brief animation between states
- **Persistent layout**: Content area respects collapsed sidebar width, preventing layout shift on expansion

**Mobile behavior:**
- **Overlay pattern**: Full-width sidebar slides over content with backdrop
- **Modal interaction**: Dismissible via backdrop tap, close button, or navigation selection
- **Touch-optimized**: Larger hit areas and simplified structure

**Submenu system:**
- **Expandable sections**: Chevron indicator with rotation on expand/collapse
- **Visual hierarchy**: Indentation or left border to show parent-child relationships
- **Progressive disclosure**: Submenus collapse when not needed, reducing visual clutter

The sidebar maintains the same visual language as navigation lists—icon + label pairs, accent colors on active states, subtle backgrounds on hover—but adapts its footprint based on context and device.

## Compositional Thinking

**Small pieces, clear relationships.**

Complex interfaces emerge from simple components combined with clear hierarchy. A chat input isn't a monolithic widget—it's a container holding a textarea, an attachment list, a toolbar with buttons.

Each piece maintains its own visual identity while participating in the larger structure. Spacing and borders create the relationships.

**Visual breathing room:**
- Items within a group: Close proximity
- Groups within a section: Medium spacing
- Sections within a page: Significant distance

This creates layers of visual hierarchy through space alone.

## Responsive Behavior

**Adapt interaction patterns, not just layout.**

Responsive design means more than reflowing content—it means adapting interaction patterns to match device capabilities.

**Mobile approach:**
- **Navigation**: Overlays with backdrop blur instead of persistent sidebars
- **Dismissal**: Tap backdrop, close button, or selection to dismiss
- **Touch targets**: Larger, more generous hit areas for finger interaction
- **Simplified structure**: Flatten hierarchies, reduce nesting

**Desktop approach:**
- **Navigation**: Persistent sidebars with hover expansion or always-visible panels
- **Dense layouts**: More information density, tighter spacing acceptable
- **Hover states**: Rich feedback on mouse interaction
- **Keyboard focus**: Full keyboard navigation support

The transition happens at standard breakpoints—mobile patterns below 768px, desktop patterns above. The core visual language stays consistent; only interaction mechanisms adapt.

## Color in Context

### Light Mode

White background, near-black text. Gray accents for hierarchy. The aesthetic is clean paper—maximum contrast, minimum distraction.

Backgrounds step through grays:
- Cards and panels: White or very light gray
- Hover states: Slightly darker gray
- Pressed/active: Mid-gray
- Primary buttons: Near-black

### Dark Mode

Inverted but not simply flipped. The background is deep charcoal (not pure black), text is off-white (not pure white). This reduces eye strain while maintaining the high-contrast aesthetic.

Borders become transparent white overlays rather than solid grays. This creates softer separation against the dark background.

Backgrounds in dark mode use alpha transparency layering:
- Base: Dark charcoal
- Elevated surfaces: Charcoal + white overlay at 15-30% opacity
- Hover: Additional white overlay

Glass effects (backdrop blur) appear on floating elements like overlays and modals.

## Icon Treatment

**Simple line iconography with consistent stroke weight.**

Icons are rendered as line drawings (stroked, not filled) with uniform weight. This creates visual consistency and clarity—icons feel like diagrams rather than illustrations.

**Sizing:**
- **Default**: Medium size for navigation and primary UI
- **Small**: Compact contexts
- **Large**: Feature graphics or empty states

**Pairing with text:**
Icons always precede their labels, separated by comfortable horizontal gap. The icon acts as a visual anchor, making items scannable. In navigation lists, icons align vertically creating a clean left edge.

**Color behavior:**
- **Neutral state**: Mid-gray, matching secondary text
- **Selected/active state**: Accent color while label stays neutral
- **Hover state**: No color change, only background shifts

All icons come from a single family ensuring consistent line weight, style, and optical sizing.

## What This Creates

**Calm competence—design that gets out of the way.**

The aesthetic doesn't announce itself. It creates structure, establishes hierarchy, then steps back. Attention goes to content, not containers. Interaction feels obvious through subtle cues—a colored icon, a light background fill, a whisper of gray on hover.

Everything is aligned, spaced, and proportioned to feel intentional. The generous spacing, neutral palette with selective accent color, and flat depth produce an interface that feels professional without rigidity, approachable without playfulness.

**You feel in control.** Navigation is effortless. Selection states are obvious. Nothing shouts. The design respects your intelligence and creates space for you to think.

**This is design for calm, focused work.**

---

## Replication Checklist

To capture this aesthetic:

1. **Clean sans-serif typography** with medium weight and generous line-height
2. **Neutral palette with accent color**—soft grays dominate, single accent for active states
3. **Generous vertical spacing**—comfortable distance between list items, significant breathing room between sections
4. **Icon + label pattern**—line icons precede text with comfortable gap
5. **Subtle selection state**—light gray fill with soft rounding + accent color icon
6. **No divider lines**—space alone creates separation
7. **Flat depth**—no shadows except barely-there elevation on floating elements
8. **Consistent spacing unit** applied throughout
9. **Subtle border radius** on rounded corners, slightly tighter for selection states
10. **Hairline borders** in very light gray, minimal use
11. **Semi-transparent focus rings** that are visible but not aggressive
12. **Quick transitions** for all state changes
13. **Reduced opacity** for disabled states
14. **Whisper-subtle hover**—very light gray background
15. **Proportional heights** for interactive components
16. **Compositional structure** over monolithic components

**The essence:** Generous space, restrained color, subtle feedback, calm clarity.

---

## Implementation

For technical specifications, code patterns, CSS values, and component examples, see [DESIGN_CODE.md](./DESIGN_CODE.md).
