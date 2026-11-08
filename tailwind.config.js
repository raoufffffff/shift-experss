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
        // Espace client v2 (jetons dans src/styles/se-tokens.css)
        'display': ['Urbanist', 'Plus Jakarta Sans', 'system-ui', 'sans-serif'],
      },
      colors: {
        // Espace client v2 : bg-se-*, text-se-*, border-se-*
        // ⚠ Valeurs = miroir de src/styles/se-tokens.css, en hexadécimal : Tailwind 3 ne sait pas
        // appliquer un modificateur d'opacité (bg-se-ink/40) à une couleur `var(--…)`.
        // Si un jeton change dans se-tokens.css, le changer ici aussi.
        se: {
          bg: '#f7f6f2',
          surface: '#ffffff',
          'surface-2': '#fafaf7',
          ink: '#121417',
          muted: '#5a6473',
          line: '#e7e5df',
          'line-soft': '#eeede7',
          blue: '#2250f4',
          'blue-ink': '#1a3fc4',
          'blue-wash': '#e8eeff',
          cascade: '#f28c28',
          'cascade-ink': '#9a4e00',
          'cascade-wash': '#fff1e0',
          freelance: '#ff0058',
          'freelance-ink': '#a3123c',
          'freelance-wash': '#fde8ec',
          extra: '#7b61ff',
          'extra-ink': '#4a33b8',
          'extra-wash': '#efeaff',
          success: '#136c36',
          'success-wash': '#e6f6ec',
          danger: '#a3123c',
          'danger-wash': '#fde8ec',
          'neutral-ink': '#3a4250',
          'neutral-wash': '#f1f0eb',
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
        se: 'var(--se-shadow-sm)',
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
