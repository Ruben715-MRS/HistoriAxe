---
name: Tailored Executive
colors:
  surface: '#f6faff'
  surface-dim: '#d2dbe4'
  surface-bright: '#f6faff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#ecf5fe'
  surface-container: '#e6eff8'
  surface-container-high: '#e0e9f2'
  surface-container-highest: '#dbe4ed'
  on-surface: '#141d23'
  on-surface-variant: '#44464f'
  inverse-surface: '#293138'
  inverse-on-surface: '#e9f2fb'
  outline: '#757780'
  outline-variant: '#c5c6d0'
  surface-tint: '#495d90'
  primary: '#000311'
  on-primary: '#ffffff'
  primary-container: '#001a4b'
  on-primary-container: '#7084ba'
  inverse-primary: '#b2c5ff'
  secondary: '#735c00'
  on-secondary: '#ffffff'
  secondary-container: '#fed65b'
  on-secondary-container: '#745c00'
  tertiary: '#020404'
  on-tertiary: '#ffffff'
  tertiary-container: '#1b1e1f'
  on-tertiary-container: '#848687'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dae2ff'
  primary-fixed-dim: '#b2c5ff'
  on-primary-fixed: '#001847'
  on-primary-fixed-variant: '#314577'
  secondary-fixed: '#ffe088'
  secondary-fixed-dim: '#e9c349'
  on-secondary-fixed: '#241a00'
  on-secondary-fixed-variant: '#574500'
  tertiary-fixed: '#e1e3e4'
  tertiary-fixed-dim: '#c5c7c8'
  on-tertiary-fixed: '#191c1d'
  on-tertiary-fixed-variant: '#454748'
  background: '#f6faff'
  on-background: '#141d23'
  surface-variant: '#dbe4ed'
typography:
  display:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: '1.2'
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '700'
    lineHeight: 32px
    letterSpacing: -0.01em
  headline-md:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
    letterSpacing: 0em
  body-lg:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
    letterSpacing: 0em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 20px
    letterSpacing: 0.01em
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '600'
    lineHeight: 20px
    letterSpacing: 0.05em
  label-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '500'
    lineHeight: 16px
    letterSpacing: 0.08em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 28px
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  base: 8px
  xs: 4px
  sm: 12px
  md: 24px
  lg: 32px
  xl: 48px
  margin-mobile: 20px
  margin-desktop: 64px
  gutter: 16px
---

## Brand & Style

This design system embodies the precision and sophistication of bespoke tailoring. It is crafted for an executive audience that values quality, authority, and meticulous attention to detail. The aesthetic is rooted in **Modern Minimalism** with **Glassmorphic** accents, creating a high-fidelity environment that feels both established and technologically advanced.

The visual narrative relies on "White Space" as a luxury commodity—using generous margins and clear separation to ensure content feels curated rather than crowded. Every interaction is designed to feel smooth and intentional, mirroring the experience of a high-end concierge service.

## Colors

The palette is anchored by **Deep Navy Blue**, representing trust, depth, and formal elegance. This is contrasted against **Clean White** surfaces and **Soft Grey** backgrounds (#F2F4F7) to provide a canvas that feels airy and premium.

**Amber/Gold Accents** are used sparingly for critical interactive highlights, star ratings, and subtle "member-only" indicators. This metallic touch provides the necessary "luxury tailoring" feel without overwhelming the professional core of the system. Semantic colors for success, error, and warning should be desaturated to maintain the sophisticated mood.

## Typography

The system utilizes **Inter** for its modern, clean, and highly legible characteristics. To achieve the "Executive" look, headlines utilize tight tracking and bold weights, while labels and small captions use increased letter spacing to evoke the feeling of luxury watch face typography.

Line heights are generous to ensure readability and to maintain the relaxed yet professional pace of the UI. Paragraphs should always be left-aligned to maintain the strong vertical "grid line" indicative of high-end editorial design.

## Layout & Spacing

The layout follows a **Fluid Grid** model with strict safe-area margins. On mobile, a 20px side margin is mandatory to prevent the UI from feeling cramped. 

The "Executive" feel is achieved through vertical rhythm; sections are separated by large white spaces (32px - 48px) to allow each content block to "breathe." Content containers (cards) should use a consistent internal padding of 24px to ensure text never feels squeezed against the edges.

## Elevation & Depth

This design system uses a combination of **Tonal Layers** and **Subtle Glassmorphism**.

1.  **Bottom & Top Bars:** Use a frosted glass effect (Backdrop Blur: 20px, Opacity: 80% White) to maintain context of the content scrolling underneath.
2.  **Surface Hierarchy:** The base background is a soft grey (#F2F4F7). Cards and primary containers are pure white, creating a natural "lift" without heavy shadows.
3.  **Shadows:** When used (primarily for floating action buttons or primary cards), shadows must be extremely diffused: `0px 10px 30px rgba(0, 26, 75, 0.05)`. The tint of the shadow is a desaturated version of the primary Navy, rather than pure black.

## Shapes

The shape language is defined by **rounded-3xl** (24px-32px) for large containers and cards, creating a friendly yet sophisticated enclosure. Interactive elements like buttons and search bars use a full **Pill-shaped** (100px) radius.

This high degree of roundedness is balanced by the sharp, precise typography, ensuring the design doesn't feel "juvenile" but rather "modern-organic." Icons should be wireframe-style with 1.5pt stroke weights and slightly rounded terminals to match the component containers.

## Components

### Buttons
- **Primary:** Deep Navy Blue background, White text, Pill-shaped.
- **Secondary:** Transparent background, Navy Blue border (1px), Navy Blue text.
- **Ghost:** Amber text for specialized actions (e.g., "See All"), no border or background.

### Cards
- **Product/Profile Cards:** White background, 24px-32px corner radius, subtle 1px border (#E9ECEF) or very soft navy-tinted shadow.
- **Featured Cards:** Deep Navy Blue background with high-contrast white typography.

### Input Fields
- **Search Bars:** Pill-shaped, light grey fill, subtle wireframe icon on the left.
- **Text Inputs:** Bottom-border only for a "minimalist stationery" feel, or 8px rounded corners with a soft grey background.

### Selection Controls
- **Chips/Filters:** Soft grey background, transitioning to Deep Navy with white text when active.
- **Radio Buttons:** Minimalist circles with a Navy Blue center dot for selection.

### Navigation
- **Bottom Bar:** Glassmorphic background with active indicators using the Primary Navy color and a small dot below the icon.