---
name: Clarion Documentation System
colors:
  surface: '#f8f9ff'
  surface-dim: '#cbdbf5'
  surface-bright: '#f8f9ff'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#eff4ff'
  surface-container: '#e5eeff'
  surface-container-high: '#dce9ff'
  surface-container-highest: '#d3e4fe'
  on-surface: '#0b1c30'
  on-surface-variant: '#434655'
  inverse-surface: '#213145'
  inverse-on-surface: '#eaf1ff'
  outline: '#737686'
  outline-variant: '#c3c6d7'
  surface-tint: '#0053db'
  primary: '#004ac6'
  on-primary: '#ffffff'
  primary-container: '#2563eb'
  on-primary-container: '#eeefff'
  inverse-primary: '#b4c5ff'
  secondary: '#006c49'
  on-secondary: '#ffffff'
  secondary-container: '#6cf8bb'
  on-secondary-container: '#00714d'
  tertiary: '#943700'
  on-tertiary: '#ffffff'
  tertiary-container: '#bc4800'
  on-tertiary-container: '#ffede6'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#dbe1ff'
  primary-fixed-dim: '#b4c5ff'
  on-primary-fixed: '#00174b'
  on-primary-fixed-variant: '#003ea8'
  secondary-fixed: '#6ffbbe'
  secondary-fixed-dim: '#4edea3'
  on-secondary-fixed: '#002113'
  on-secondary-fixed-variant: '#005236'
  tertiary-fixed: '#ffdbcd'
  tertiary-fixed-dim: '#ffb596'
  on-tertiary-fixed: '#360f00'
  on-tertiary-fixed-variant: '#7d2d00'
  background: '#f8f9ff'
  on-background: '#0b1c30'
  surface-variant: '#d3e4fe'
typography:
  display:
    fontFamily: Inter
    fontSize: 48px
    fontWeight: '800'
    lineHeight: 56px
    letterSpacing: -0.02em
  headline-lg:
    fontFamily: Inter
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.01em
  headline-lg-mobile:
    fontFamily: Inter
    fontSize: 28px
    fontWeight: '700'
    lineHeight: 36px
  headline-md:
    fontFamily: Inter
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  headline-sm:
    fontFamily: Inter
    fontSize: 20px
    fontWeight: '600'
    lineHeight: 28px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 30px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '500'
    lineHeight: 20px
  code-md:
    fontFamily: JetBrains Mono
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 22px
rounded:
  sm: 0.125rem
  DEFAULT: 0.25rem
  md: 0.375rem
  lg: 0.5rem
  xl: 0.75rem
  full: 9999px
spacing:
  container-max: 1280px
  content-well-max: 800px
  sidebar-width: 280px
  gutter: 24px
  margin-page: 32px
  stack-sm: 8px
  stack-md: 16px
  stack-lg: 32px
---

## Brand & Style

This design system is engineered for high-performance information architecture, blending the systematic efficiency of technical documentation with the polished aesthetic of premium fintech interfaces. The design narrative centers on **Corporate Minimalism**—prioritizing clarity, legibility, and a sense of "technical luxury."

The target audience consists of developers, engineers, and product managers who require rapid access to complex information. The UI evokes a feeling of precision, reliability, and calm. Visual interest is achieved not through decorative elements, but through exceptional typography, purposeful whitespace, and a sophisticated use of color for functional wayfinding.

## Colors

The palette is anchored by a vibrant **Primary Blue (#2563eb)**, used strategically for primary actions, active navigation states, and text links. The secondary **Emerald Green (#10b981)** is reserved for success states and highlighting growth or positive completion within technical guides.

The background uses a pure white surface to maximize contrast for long-form reading. A neutral scale based on cool slates provides structural definitions:
- **Borders:** Subtle `#e5e7eb` defines the boundaries between navigation, content, and the table of contents without visual clutter.
- **Surface Tints:** Use `#f8fafc` for code block backgrounds and sidebar areas to create a soft distinction from the main content well.
- **Callouts:** Use highly desaturated versions of status colors (e.g., 5% opacity) for background fills, paired with high-contrast saturated borders and icons.

## Typography

The system utilizes **Inter** for all UI and prose elements to ensure maximum readability and a modern, neutral feel. **JetBrains Mono** is specified for code blocks and inline code snippets, chosen for its increased x-height and clear character distinction.

- **Scale:** A tight typographic scale ensures that even deep document hierarchies (H1 through H4) remain distinct.
- **Line Height:** Body text uses a generous 1.5x to 1.6x line height to prevent reader fatigue during long-form consumption.
- **Vertical Rhythm:** Headings feature significant top-margin spacing (typically 2x the bottom margin) to clearly associate the title with its following content block.
- **Letter Spacing:** Headlines utilize slight negative tracking (-0.01em to -0.02em) to maintain a cohesive, high-end editorial appearance.

## Layout & Spacing

This design system uses a **Fixed-Fluid Hybrid Grid**. 
- **The Sidebar:** Fixed width (280px) on the left for navigation.
- **The Content Well:** Centered or left-aligned with a max-width of 800px. This "optimal line length" prevents eye strain and improves comprehension.
- **Table of Contents:** Optional right-hand sidebar (fixed 240px) that disappears on smaller viewports.

**Responsive Behavior:**
- **Desktop:** 3-column layout (Sidebar | Content | TOC).
- **Tablet:** 2-column layout (Sidebar becomes a drawer or toggle, Content | TOC).
- **Mobile:** Single column content with a sticky top-bar navigation and 16px horizontal margins.
- **Gaps:** Use a standard 8px-based spacing system for all internal component padding and margins.

## Elevation & Depth

This system avoids heavy shadows, instead using **Tonal Layers** and **Soft Ambient Shadows** to denote interactivity and hierarchy.

- **Level 0 (Flat):** Main background and sidebar.
- **Level 1 (Surface):** Cards and code blocks. Use a 1px border (`#e5e7eb`) with no shadow.
- **Level 2 (Interactive):** Hover states on cards or floating navigation menus. Use a very soft, diffused shadow: `0 4px 12px rgba(0, 0, 0, 0.05)`.
- **Level 3 (Overlay):** Modals or search dialogues. Use a more pronounced shadow: `0 12px 32px rgba(0, 0, 0, 0.1)` with a subtle backdrop blur (8px) to maintain context.

Depth is primarily communicated through color shifts (e.g., a light gray background for code blocks) rather than heavy 3D effects.

## Shapes

The shape language is **Soft and Professional**. 
- **Standard Elements:** Buttons, inputs, and small callouts use a `0.25rem` (4px) radius.
- **Large Elements:** Code blocks, cards, and container-level sections use a `rounded-lg` (8px) radius.
- **Interactive States:** Navigation highlights use a `0.25rem` radius to match the text baseline.

This consistent, low-radius approach maintains the "technical" feel of the system while avoiding the starkness of sharp corners.

## Components

### Buttons
- **Primary:** Solid `#2563eb` with white text. No gradient.
- **Secondary:** White background with `#e5e7eb` border and `#1f2937` text.
- **Ghost:** No background or border; text color matches Primary. Used for navigation.

### Sidebar Navigation
- **Active State:** Text color shifts to Primary Blue with a subtle light blue (`#eff6ff`) background pill.
- **Hierarchy:** Nested items should have a 12px left-border or indentation to show parent-child relationships.

### Callouts (Admonitions)
- **Structure:** 1px solid left-border (4px width), light tinted background, and a bold header with a corresponding icon.
- **Info:** Blue border/icon.
- **Warning:** Amber border/icon.
- **Danger:** Red border/icon.

### Code Blocks
- **Container:** Background `#f8fafc` with a 1px `#e5e7eb` border.
- **Header:** Include a top bar with the language name and a "Copy" button that appears on hover.
- **Syntax Highlighting:** Use a professional, low-contrast theme (like Sarah Drasner's Night Owl or a custom Slate theme) to ensure long-term readability.

### Inputs & Search
- **Search Bar:** Large, rounded (8px), with a subtle "CMD+K" indicator on the right side. Use a 1px border that thickens and turns Primary Blue on focus.