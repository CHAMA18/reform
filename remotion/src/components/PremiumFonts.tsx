/**
 * PremiumFonts — Top-class typography for cinematic video
 *
 * Uses Google Fonts:
 *   - Inter: Clean, modern sans-serif (body, UI)
 *   - Space Grotesk: Geometric, tech-forward (headlines)
 *   - Playfair Display: Elegant serif (dramatic moments)
 *
 * Font weights used:
 *   - 400: Regular
 *   - 500: Medium
 *   - 600: Semi-bold
 *   - 700: Bold
 *   - 800: Extra-bold
 *   - 900: Black
 */
import React from 'react';

// Font family constants
export const FONTS = {
  // Primary: Clean, modern (VOX-style)
  sans: "'Inter', ui-sans-serif, system-ui, -apple-system, sans-serif",
  
  // Headlines: Geometric, tech-forward
  display: "'Space Grotesk', 'Inter', ui-sans-serif, sans-serif",
  
  // Dramatic: Elegant serif for special moments
  serif: "'Playfair Display', Georgia, serif",
  
  // Monospace: For URLs, code, data
  mono: "'JetBrains Mono', 'Fira Code', monospace",
} as const;

// Font weights
export const WEIGHTS = {
  regular: 400,
  medium: 500,
  semibold: 600,
  bold: 700,
  extrabold: 800,
  black: 900,
} as const;

// Preload fonts component - include in composition root
export const FontLoader: React.FC = () => {
  return (
    <>
      {/* Inter - Clean sans-serif */}
      <link
        rel="preconnect"
        href="https://fonts.googleapis.com"
      />
      <link
        rel="preconnect"
        href="https://fonts.gstatic.com"
        crossOrigin="anonymous"
      />
      <link
        href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      
      {/* Space Grotesk - Geometric display */}
      <link
        href="https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
      
      {/* Playfair Display - Elegant serif */}
      <link
        href="https://fonts.googleapis.com/css2?family=Playfair+Display:wght@400;500;600;700;800;900&display=swap"
        rel="stylesheet"
      />
      
      {/* JetBrains Mono - Monospace */}
      <link
        href="https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;600;700&display=swap"
        rel="stylesheet"
      />
    </>
  );
};

// Typography presets for consistent styling
export const TYPOGRAPHY = {
  // Hero headline (72px)
  hero: {
    fontFamily: FONTS.display,
    fontSize: 72,
    fontWeight: WEIGHTS.black,
    letterSpacing: '-0.03em',
    lineHeight: 1.1,
  },
  
  // Section headline (56px)
  sectionHeadline: {
    fontFamily: FONTS.display,
    fontSize: 56,
    fontWeight: WEIGHTS.bold,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  
  // Feature title (48px)
  featureTitle: {
    fontFamily: FONTS.display,
    fontSize: 48,
    fontWeight: WEIGHTS.bold,
    letterSpacing: '-0.02em',
    lineHeight: 1.2,
  },
  
  // Subtitle (28px)
  subtitle: {
    fontFamily: FONTS.sans,
    fontSize: 28,
    fontWeight: WEIGHTS.medium,
    letterSpacing: '-0.01em',
    lineHeight: 1.4,
  },
  
  // Body text (20px)
  body: {
    fontFamily: FONTS.sans,
    fontSize: 20,
    fontWeight: WEIGHTS.regular,
    letterSpacing: '0',
    lineHeight: 1.5,
  },
  
  // Caption (16px)
  caption: {
    fontFamily: FONTS.sans,
    fontSize: 16,
    fontWeight: WEIGHTS.medium,
    letterSpacing: '0.02em',
    lineHeight: 1.4,
  },
  
  // Label (14px)
  label: {
    fontFamily: FONTS.sans,
    fontSize: 14,
    fontWeight: WEIGHTS.semibold,
    letterSpacing: '0.1em',
    textTransform: 'uppercase' as const,
  },
  
  // Data/numbers (96px)
  dataLarge: {
    fontFamily: FONTS.display,
    fontSize: 96,
    fontWeight: WEIGHTS.black,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
  
  // Data/numbers medium (56px)
  dataMedium: {
    fontFamily: FONTS.display,
    fontSize: 56,
    fontWeight: WEIGHTS.bold,
    letterSpacing: '-0.02em',
    fontVariantNumeric: 'tabular-nums',
  },
  
  // URL/monospace (22px)
  url: {
    fontFamily: FONTS.mono,
    fontSize: 22,
    fontWeight: WEIGHTS.medium,
    letterSpacing: '0.01em',
  },
} as const;
