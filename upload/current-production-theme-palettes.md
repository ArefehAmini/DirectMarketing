# Current Production Theme Palettes

Source: Continental production revision `5e26c8ec`, verified on 2026-08-16.

Production provides eight selectable themes plus a **System** option. System mode selects **Graphite** when the operating system prefers dark mode and **Daylight** otherwise.

## 1. The Platform / Continental

Theme ID: `continental`  
Style: Dark walnut with classic gold.

| Role | Color |
|---|---|
| Page background | `#1D1410` |
| Card / panel | `#2A1D16` |
| Muted surface | `#38271D` |
| Primary text | `#F5E9D9` |
| Secondary text | `#C9B08A` |
| Muted text | `#8A7558` |
| Border | `#4A3424` |
| Accent | `#D4AF37` |
| Light accent | `#F0C54A` |
| Success | `#6DB488` |
| Information | `#B78C5B` |
| Warning | `#E2A93C` |
| Error / danger | `#CF5C4D` |

## 2. Graphite

Theme ID: `graphite`  
Style: Neutral dark interface with gold accents.

| Role | Color |
|---|---|
| Page background | `#0F1117` |
| Card / panel | `#1A1D27` |
| Muted surface | `#252836` |
| Primary text | `#F1F5F9` |
| Secondary text | `#94A3B8` |
| Muted text | `#64748B` |
| Border | `#2E3347` |
| Accent | `#DAA520` |
| Light accent | `#F0C040` |
| Success | `#10B981` |
| Information | `#60A5FA` |
| Warning | `#F59E0B` |
| Error / danger | `#EF4444` |

## 3. Midnight Indigo

Theme ID: `midnight_indigo`  
Style: Near-black indigo with saturated violet.

| Role | Color |
|---|---|
| Page background | `#0E0D1A` |
| Card / panel | `#181631` |
| Muted surface | `#221F44` |
| Primary text | `#E8E6FA` |
| Secondary text | `#A5A1C7` |
| Muted text | `#6B6890` |
| Border | `#2F2D57` |
| Accent | `#7B6CFF` |
| Light accent | `#9C8FFF` |
| Success | `#5DD49E` |
| Information | `#5FA9FF` |
| Warning | `#FFC25C` |
| Error / danger | `#FF6B8A` |

## 4. Daylight

Theme ID: `daylight`  
Style: Warm neutral light theme with restrained gold.

| Role | Color |
|---|---|
| Page background | `#F8F6F1` |
| Card / panel | `#FFFFFF` |
| Muted surface | `#F3F4F6` |
| Primary text | `#1F2937` |
| Secondary text | `#4B5563` |
| Muted text | `#9CA3AF` |
| Border | `#E5E7EB` |
| Accent | `#B8860B` |
| Light accent | `#DAA520` |
| Success | `#10B981` |
| Information | `#3B82F6` |
| Warning | `#F59E0B` |
| Error / danger | `#EF4444` |

## 5. Saramad Rose

Theme ID: `saramad_rose`  
Style: Warm ivory with muted rose-gold accents.

| Role | Color |
|---|---|
| Page background | `#FDF6F2` |
| Card / panel | `#FFFFFF` |
| Muted surface | `#F6E7DF` |
| Primary text | `#4A2C2C` |
| Secondary text | `#7A4D4D` |
| Muted text | `#B9928F` |
| Border | `#F0D7CD` |
| Accent | `#C46B6B` |
| Light accent | `#D98686` |
| Success | `#6DB488` |
| Information | `#9C6F9C` |
| Warning | `#D49250` |
| Error / danger | `#C44545` |

## 6. Lavande

Theme ID: `lavande`  
Style: Cream and pale lavender.

| Role | Color |
|---|---|
| Page background | `#F8F5FB` |
| Card / panel | `#FFFFFF` |
| Muted surface | `#ECE5F3` |
| Primary text | `#2E2440` |
| Secondary text | `#5A4778` |
| Muted text | `#A596B7` |
| Border | `#DDD0EB` |
| Accent | `#8B6FC4` |
| Light accent | `#A48BDA` |
| Success | `#6DB488` |
| Information | `#6F9EC4` |
| Warning | `#D4A558` |
| Error / danger | `#C4566A` |

## 7. Sakura

Theme ID: `sakura`  
Style: White and soft pink with a stronger pink accent.

| Role | Color |
|---|---|
| Page background | `#FFF3F6` |
| Card / panel | `#FFFFFF` |
| Muted surface | `#FFE1EC` |
| Primary text | `#4A1F33` |
| Secondary text | `#7A3A55` |
| Muted text | `#C08AA1` |
| Border | `#FFD0DF` |
| Accent | `#E85A8A` |
| Light accent | `#F378A4` |
| Success | `#69B889` |
| Information | `#5FA1D4` |
| Warning | `#E2A647` |
| Error / danger | `#CC4060` |

## 8. Forest

Theme ID: `forest`  
Style: Evergreen typography and actions on parchment surfaces.

| Role | Color |
|---|---|
| Page background | `#F5F2E9` |
| Card / panel | `#FDFAF2` |
| Muted surface | `#E8E2D2` |
| Primary text | `#1F3326` |
| Secondary text | `#3D5A44` |
| Muted text | `#87967F` |
| Border | `#CCC8AE` |
| Accent | `#357A4A` |
| Light accent | `#4A955F` |
| Success | `#4A955F` |
| Information | `#4A7595` |
| Warning | `#C8965A` |
| Error / danger | `#B65A4A` |

## Shared Behavior

- **System mode:** Graphite for dark OS preference; Daylight otherwise.
- **Primary action text:** `#0B0D12` in all themes except Forest, which uses `#FFFFFF`.
- **Modal and drawer scrim:** `rgba(8, 10, 14, 0.55)` across all themes.
- **Hover, selected, and focus states:** generated with `color-mix()` from the active theme's accent, text, border, and surface tokens.
- **Production picker order:** The Platform, Graphite, Midnight Indigo, Daylight, Saramad Rose, Lavande, Sakura, Forest.

