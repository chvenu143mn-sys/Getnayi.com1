---
name: Getnayi Design Foundation
colors:
  primary: "#ff5a36"
  background: "#0c0c0e"
  surface-1: "#18181b"
  surface-2: "#27272a"
  text-primary: "#f8fafc"
  text-secondary: "#a1a1aa"
  border-subtle: "#ffffff14"
typography:
  display:
    fontFamily: "Outfit"
    fontSize: 48px
  h1:
    fontFamily: "Outfit"
    fontSize: 32px
  h2:
    fontFamily: "Outfit"
    fontSize: 24px
  h3:
    fontFamily: "Outfit"
    fontSize: 20px
  body-lg:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 18px
  body-base:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 16px
  body-sm:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 14px
  caption:
    fontFamily: "Plus Jakarta Sans"
    fontSize: 12px
rounded:
  sm: 4px
  md: 8px
  lg: 16px
  full: 9999px
spacing:
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.background}"
    rounded: "{rounded.md}"
    padding: "12px"
  card-base:
    backgroundColor: "{colors.surface-1}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded.lg}"
    padding: "{spacing.md}"
  card-secondary:
    backgroundColor: "{colors.surface-2}"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "{spacing.sm}"
  divider:
    backgroundColor: "{colors.border-subtle}"
    height: "1px"
---

## Overview

Getnayi Design Foundation (GDF) is a production-quality design system centered on immersive vertical media, high-contrast aesthetics, and extreme readability. 

- **Trustworthy**: Secure, reliable, transparent. We do not use dark patterns or deceptive copy.
- **Intelligent**: Anticipates needs, provides contextual value, reduces cognitive load.
- **Authentic**: Celebrates real creators and genuine shopping experiences.
- **Premium, but Accessible**: High craft, polished details, but fundamentally easy to use for everyone.

## Colors

The color palette is built for deep immersion and clear visual hierarchy in dark mode.

- **Primary (#ff5a36)**: Brand Orange. Used for primary call-to-actions, active states, and focus rings.
- **Background (#0c0c0e)**: Deep black foundation that sets an atmospheric backdrop for media consumption.
- **Surface-1 (#18181b)**: Cards, listings, and secondary containers.
- **Surface-2 (#27272a)**: Hover states, inputs, and elevated modals.
- **Text Primary (#f8fafc)**: High-contrast off-white for crisp, readable headlines.
- **Text Secondary (#a1a1aa)**: Muted zinc grey for descriptions, timestamps, and secondary labels.
- **Border Subtle (#ffffff14)**: Soft borders that partition components without creating visual noise.

## Typography

We use modern, highly legible typefaces imported from Google Fonts.

- **Display (48px)**: Hero visual headlines and major onboarding titles utilizing **Outfit**.
- **H1 (32px)**: Main page titles utilizing **Outfit**.
- **H2 (24px)**: Major section headers utilizing **Outfit**.
- **H3 (20px)**: Component, dialog, and card headers utilizing **Outfit**.
- **Body Large (18px)**: Long-form descriptions utilizing **Plus Jakarta Sans**.
- **Body Base (16px)**: Standard content body text utilizing **Plus Jakarta Sans**.
- **Body Small (14px)**: Form fields, metadata labels, and comments utilizing **Plus Jakarta Sans**.
- **Caption (12px)**: Uppercase, letter-spaced labels, and tags utilizing **Plus Jakarta Sans**.

## Layout

Our layout scales on an 8px grid to ensure rhythmic spacing across all viewports.

- **Grid foundation**: Standard padding leverages 16px (md) and 24px (lg).
- **Component gaps**: Internal spacing uses 8px (sm) for consistent vertical flow.

## Elevation & Depth

- **Level 0 (Flat)**: Immersive vertical media feeds.
- **Level 1 (Subtle)**: Base feed cards with solid borders.
- **Level 2 (Active)**: Modals, overlays, bottom navigation, and sticky headers.

## Shapes

Consistency in corners ensures tactile visual harmony.

- **Interactive controls**: Small elements like buttons and inputs use `rounded.md` (8px).
- **Content units**: Cards, bottom sheets, and modal panels use `rounded.lg` (16px) for a modern feel.
- **Pills & Avatars**: Circular frames use `rounded.full` (9999px).

## Components

The system reusable components map directly to our typography and color tokens.

### Button Primary

Our primary call-to-action inherits the brand accent color.
- Background: `{colors.primary}`
- Text Color: `{colors.background}`
- Rounded: `{rounded.md}`

### Card Base

Standard container for key features.
- Background: `{colors.surface-1}`
- Text Color: `{colors.text-primary}`
- Rounded: `{rounded.lg}`

### Card Secondary

Subtle secondary panels and details.
- Background: `{colors.surface-2}`
- Text Color: `{colors.text-secondary}`
- Rounded: `{rounded.md}`

### Divider

Clean separators for list boundaries.
- Background: `{colors.border-subtle}`
- Height: `1px`

## Do's and Don'ts

### Do's
- Pair `#ff5a36` primarily with deep dark backgrounds for high visual impact and compliance.
- Maintain WCAG contrast compliance for all buttons (e.g., using a dark background color like `#0c0c0e` for labels on vibrant orange backdrops).
- Use generous negative space between large display text and descriptive blocks.

### Don'ts
- Do not use more than one vibrant brand orange accent button on a single screen to prevent cognitive overload.
- Do not use absolute positioning for components where responsive fluid flexbox layouts are applicable.
