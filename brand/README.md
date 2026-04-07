# Reisbloc Brand Guidelines

## Brand Identity System

### Logo

#### Primary Logo (Horizontal)
- **File:** `brand/logo/logo-horizontal-light.svg`
- **Use:** Fondos claros
- **Minimum size:** 160px width

#### Logo Dark
- **File:** `brand/logo/logo-horizontal-dark.svg`
- **Use:** Fondos oscuros

#### Logo Gradient
- **File:** `brand/logo/logo-horizontal-gradient.svg`
- **Use:** Fondos con gradiente o hero sections

---

### Isotipo (Icon Only)

#### Isotipo Light
- **File:** `brand/isotipo/isotipo-light.svg`
- **Use:** Fondos claros, iconos de navegación

#### Isotipo Dark
- **File:** `brand/isotipo/isotipo-dark.svg`
- **Use:** Fondos oscuros

#### Isotipo Gradient
- **File:** `brand/isotipo/isotipo-gradient.svg`
- **Use:** Botones, badges

#### Isotipo Outline
- **File:** `brand/isotipo/isotipo-outline.svg`
- **Use:** Iconos outline, productos gráficos minimalistas

---

## Color Palette

### Primary Colors

| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| Slate Dark | `#1F293B` | 31, 41, 59 | Backgrounds, headers |
| Slate Mid | `#2d3f55` | 45, 63, 85 | Gradients, hover states |
| Slate Light | `#64748B` | 100, 116, 139 | Text muted, secondary |
| Canvas | `#F8FAFC` | 248, 250, 252 | Main background |

### Accent Colors

| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| Cyan Brand | `#00F5FF` | 0, 245, 255 | Hexagon strokes, highlights |
| Blue Accent | `#3B82F6` | 59, 130, 246 | CTAs, links, badges |

### Status Colors

| Name | Hex | RGB | Use |
|------|-----|-----|-----|
| Success | `#10B981` | 16, 185, 129 | Success states, checkmarks |
| Warning | `#F59E0B` | 245, 158, 11 | Coming soon, alerts |
| Danger | `#EF4444` | 239, 68, 68 | Errors, destructive actions |

### WhatsApp Brand

| Name | Hex | RGB |
|------|-----|-----|
| WhatsApp Green | `#25D366` | 37, 211, 102 |
| WhatsApp Dark | `#128C7E` | 18, 140, 126 |

---

## Typography

### Primary Font: Outfit

**Google Fonts:** `https://fonts.googleapis.com/css2?family=Outfit:wght@300;400;500;600;700;800;900&display=swap`

### Font Weights

| Weight | Value | Use |
|--------|-------|-----|
| Light | 300 | Subtítulos, texto secundario |
| Regular | 400 | Cuerpo de texto |
| Medium | 500 | Labels, captions |
| Semibold | 600 | Subtítulos destacados |
| Bold | 700 | Subtítulos, énfasis |
| ExtraBold | 800 | Títulos principales |
| Black | 900 | Headlines, hero text |

### Type Scale

| Element | Size | Weight | Line Height |
|---------|------|--------|-------------|
| H1 | 48-60px | 800 | 1.1 |
| H2 | 36-48px | 800 | 1.2 |
| H3 | 24-30px | 700 | 1.3 |
| H4 | 20-24px | 600 | 1.4 |
| Body | 16-18px | 400 | 1.5-1.6 |
| Small | 14px | 400 | 1.5 |
| Caption | 12px | 500 | 1.4 |

---

## Icon System

### Primary Icon: Hexagon

El icono principal es un hexágono estilizado con:
- Trazo cyan (`#00F5FF`)
- Líneas punteadas internas
- Círculo central decorativo

### Icon Files

| File | Size | Use |
|------|------|-----|
| `public/icon.svg` | 512x512 | Main app icon |
| `brand/favicon/favicon.svg` | 32x32 | Favicon browser |
| `brand/favicon/favicon-16.svg` | 16x16 | Small favicon |
| `brand/favicon/apple-touch-icon.svg` | 192x192 | Apple touch |

---

## Spacing System

Basado en múltiplos de 4px:

| Token | Value | Use |
|-------|-------|-----|
| xs | 4px | Icon gaps |
| sm | 8px | Tight spacing |
| md | 16px | Default spacing |
| lg | 24px | Section gaps |
| xl | 32px | Component spacing |
| 2xl | 48px | Section spacing |
| 3xl | 64px | Major sections |

---

## Border Radius

| Token | Value | Use |
|-------|-------|-----|
| sm | 6px | Small buttons, inputs |
| md | 8px | Cards, panels |
| lg | 12px | Large cards |
| xl | 16px | Modal backgrounds |
| 2xl | 24px | Feature cards |
| full | 9999px | Pills, avatars |

---

## Shadows

### Elevation System

```css
/* Subtle */
box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);

/* Small */
box-shadow: 0 4px 6px rgba(0, 0, 0, 0.07);

/* Medium */
box-shadow: 0 10px 15px rgba(0, 0, 0, 0.1);

/* Large */
box-shadow: 0 20px 25px rgba(0, 0, 0, 0.15);

/* Card hover */
box-shadow: 0 20px 40px rgba(31, 41, 59, 0.12);
```

---

## Social Media

### Open Graph Image
- **File:** `brand/social/social-card.svg`
- **Size:** 1200x630px
- **Format:** SVG (exportar a PNG para uso)

### Social Square
- **File:** `brand/social/social-square.svg`
- **Size:** 400x400px
- **Use:** Twitter, Instagram

---

## Mobile Assets

### App Icon
- **File:** `brand/mobile/app-icon.svg`
- **Size:** 1024x1024px
- **Corner radius:** 200px

### Adaptive Icon
- **File:** `brand/mobile/adaptive-icon.svg`
- **Background:** Transparent
- **Use:** Android adaptive icons

### Splash Screen
- **File:** `brand/mobile/splash-icon.svg`
- **Size:** 1024x1024px

---

## Do's and Don'ts

### ✅ Do
- Usa el color cyan `#00F5FF` para destacar elementos
- Mantén el espacio libre alrededor del logo
- Usa la tipografía Outfit的一致
- Combina colores del paleta definida

### ❌ Don't
- No modifiques los colores del logo
- No estires o deformes el isotipo
- No uses más de 2 fuentes diferentes
- No uses colores fuera del paleta definida

---

## Files Structure

```
brand/
├── logo/
│   ├── logo-horizontal-light.svg
│   ├── logo-horizontal-dark.svg
│   └── logo-horizontal-gradient.svg
├── isotipo/
│   ├── isotipo-light.svg
│   ├── isotipo-dark.svg
│   ├── isotipo-gradient.svg
│   └── isotipo-outline.svg
├── favicon/
│   ├── favicon.svg
│   ├── favicon-16.svg
│   └── apple-touch-icon.svg
├── social/
│   ├── social-card.svg
│   └── social-square.svg
└── mobile/
    ├── app-icon.svg
    ├── adaptive-icon.svg
    └── splash-icon.svg
```

---

*Last updated: 2026*
