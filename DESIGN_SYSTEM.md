# Getnayi Design Foundation (GDF)

## 1. Brand Personality
Getnayi is:
- **Trustworthy**: Secure, reliable, transparent. We do not use dark patterns or deceptive copy.
- **Intelligent**: Anticipates needs, provides contextual value, reduces cognitive load.
- **Authentic**: Celebrates real creators and genuine shopping experiences.
- **Premium, but Accessible**: High craft, polished details, but fundamentally easy to use for everyone.

## 2. Emotional Design Principles
- **Clarity Over Cleverness**: The user should never have to guess what an element does. 
- **Frictionless Discovery**: Shopping and exploring should feel effortless and delightful, not overwhelming.
- **Reassurance at Every Step**: During checkout or critical actions, provide immediate, calm feedback.
- **Tactile Satisfaction**: Interactions should feel tangible. Buttons should feel pressable, cards should feel layered.

## 3. Visual Identity
- **Minimalist Core, Expressive Accents**: The structural UI is quiet (deep darks or crisp whites) to let the content (videos, products, creators) be the loud, expressive elements.
- **Purposeful Contrast**: High contrast for typography to ensure legibility; subtle contrast for structural borders to reduce visual noise.

## 4. Color Philosophy
- **Primary**: Brand Orange (`#ff5a36`). Used sparingly for primary actions, active states, and critical highlights. It draws the eye but does not overwhelm.
- **Backgrounds**: Deep, rich darks (e.g., `#0c0c0e`, `#121214`) for an immersive media experience.
- **Surfaces**: Subtle elevations (`#18181b`, `#27272a`) to distinguish cards and modals from the background.
- **Text**: High contrast for primary text (`#f8fafc`), muted for secondary (`#a1a1aa`), and subtle for disabled/tertiary (`#52525b`).
- **Semantic**: Clear, standard hues for feedback: Success (Emerald), Warning (Amber), Error (Rose).

## 5. Typography System
- **Font Family**: Primary Sans-serif (e.g., `Inter`, `SF Pro Display`). Clean, legible, modern.
- **Scale**:
  - `Display`: 48px/56px, tracking-tight. (Hero sections, major onboarding)
  - `H1`: 32px/40px, font-bold, tracking-tight. (Page titles)
  - `H2`: 24px/32px, font-semibold. (Section headers)
  - `H3`: 20px/28px, font-semibold. (Card titles, modal headers)
  - `Body Large`: 18px/28px, font-normal. (Articles, long-form descriptions)
  - `Body Base`: 16px/24px, font-normal. (Default UI text)
  - `Body Small`: 14px/20px, font-normal. (Metadata, secondary labels)
  - `Caption`: 12px/16px, font-medium, uppercase, tracking-wider. (Tags, badges)

## 6. Spacing Scale
- Based on an 8px grid.
- `2px` / `4px` (Subtle element separation, icon to text)
- `8px` (Default gap in lists/buttons)
- `12px` / `16px` (Standard padding for components like cards/inputs)
- `24px` / `32px` (Section padding, margins between distinct component groups)
- `48px` / `64px` (Major layout divisions, page padding)

## 7. Elevation System (Shadows & Layers)
- **Level 0 (Flat)**: Backgrounds, base layout.
- **Level 1 (Subtle)**: Cards, list items. (`shadow-sm`, subtle border `border-white/5`).
- **Level 2 (Hover/Focus)**: Interactive states, dropdown menus. (`shadow-md`, slightly lighter background).
- **Level 3 (Modals/Sheets)**: Dialogs, bottom sheets, sticky nav. (`shadow-2xl`, dimming backdrop, border).

## 8. Border Radius System
- `0px`: Full bleed media.
- `4px` / `6px`: Small interactive elements (checkboxes, tags).
- `8px` / `12px`: Standard components (buttons, inputs, standard cards).
- `16px` / `24px`: Major layout containers (modals, bottom sheets, large media cards).
- `9999px` (Full): Avatars, pill buttons, floating action buttons.

## 9. Iconography Rules
- **Library**: Lucide Icons (or equivalent clean, stroke-based set).
- **Style**: 2px stroke width, rounded caps and joins. Consistent bounding boxes.
- **Sizing**: `16x16` (Inline, small buttons), `20x20` (Standard UI), `24x24` (Primary actions, bottom nav).

## 10. Motion Principles
- **Purposeful**: Motion should explain state changes, guide focus, or confirm actions. Never decorate.
- **Natural**: Follow physical laws. Elements should accelerate and decelerate (ease-in-out), not move linearly.
- **Spatial Awareness**: Objects should enter and exit from logical directions (e.g., sheets slide up from the bottom).

## 11. Animation Timing
- **Micro-interactions (Hover, Active, Check)**: `150ms` (Fast, snappy).
- **Component Transitions (Fade, Expand)**: `200ms` - `250ms` (Smooth, noticeable but not blocking).
- **Layout/Page Transitions (Slide, Modal Entry)**: `300ms` - `400ms` (Choreographed, deliberate).
- **Easing**: Use CSS standard `ease-out` for entering elements, `ease-in` for exiting elements.

## 12. Accessibility Standards
- **Contrast**: Minimum `4.5:1` for standard text, `3:1` for large text and UI components.
- **Touch Targets**: Minimum `44x44px` for all interactive elements on mobile.
- **Focus States**: Every interactive element must have a visible, distinct focus ring (`ring-2 ring-brand-orange ring-offset-2 ring-offset-background`).
- **Semantics**: Use correct HTML elements (`<button>`, `<a>`, `<nav>`, `<main>`) for screen reader compatibility.

## 13. Design Tokens (Tailwind Mapping)
- `color.brand.primary` -> `bg-[#ff5a36]` / `text-[#ff5a36]`
- `color.bg.base` -> `bg-[#0c0c0e]`
- `color.surface.1` -> `bg-zinc-900`
- `color.surface.2` -> `bg-zinc-800`
- `color.text.primary` -> `text-white`
- `color.text.secondary` -> `text-zinc-400`
- `color.border.subtle` -> `border-white/10`

## 14. Component Naming Conventions
- **PascalCase** for component files and functions (e.g., `MediaCard.tsx`, `PrimaryButton.tsx`).
- **Semantic Naming**: Name by purpose, not appearance. (e.g., `PrimaryButton`, not `OrangeButton`; `WarningBanner`, not `RedBox`).
- **Variants**: Use standard variant naming conventions: `default`, `outline`, `ghost`, `destructive`.
