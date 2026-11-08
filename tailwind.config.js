/** @type {import('tailwindcss').Config} */
export default {
  darkMode: ['class'],
  content: [
    './index.html',
    './src/**/*.{js,ts,jsx,tsx}',
  ],
  theme: {
    container: {
      center: true,
      padding: '2rem',
      screens: {
        '2xl': '1400px',
      },
    },
    extend: {
      fontFamily: {
        'sans': ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
        // Espace client v2 (jetons dans src/styles/v2-tokens.css)
        'display': ['Plus Jakarta Sans', 'system-ui', '-apple-system', 'sans-serif'],
      },
      colors: {
        // Espace client v2 : bg-se-*, text-se-*, border-se-*
        se: {
          bg: 'var(--se-bg)',
          surface: 'var(--se-surface)',
          'surface-2': 'var(--se-surface-2)',
          line: 'var(--se-line)',
          'line-soft': 'var(--se-line-soft)',
          ink: 'var(--se-ink)',
          muted: 'var(--se-muted)',
          blue: 'var(--se-blue)',
          'blue-ink': 'var(--se-blue-ink)',
          'blue-wash': 'var(--se-blue-wash)',
          success: 'var(--se-success)',
          'success-wash': 'var(--se-success-wash)',
          danger: 'var(--se-danger)',
          'danger-wash': 'var(--se-danger-wash)',
          cascade: 'var(--se-cascade)',
          'cascade-ink': 'var(--se-cascade-ink)',
          'cascade-wash': 'var(--se-cascade-wash)',
          freelance: 'var(--se-freelance)',
          'freelance-ink': 'var(--se-freelance-ink)',
          'freelance-wash': 'var(--se-freelance-wash)',
          extra: 'var(--se-extra)',
          'extra-ink': 'var(--se-extra-ink)',
          'extra-wash': 'var(--se-extra-wash)',
        },
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        popover: {
          DEFAULT: 'hsl(var(--popover))',
          foreground: 'hsl(var(--popover-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        sidebar: {
          DEFAULT: 'hsl(var(--sidebar))',
          foreground: 'hsl(var(--sidebar-foreground))',
          muted: 'hsl(var(--sidebar-muted))',
          accent: 'hsl(var(--sidebar-accent))',
        },
      },
      boxShadow: {
        se: 'var(--se-shadow)',
        'se-md': 'var(--se-shadow-md)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
      },
      keyframes: {
        'accordion-down': {
          from: { height: '0' },
          to: { height: 'var(--radix-accordion-content-height)' },
        },
        'accordion-up': {
          from: { height: 'var(--radix-accordion-content-height)' },
          to: { height: '0' },
        },
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out',
      },
    },
  },
  plugins: [require('tailwindcss-animate')],
}
