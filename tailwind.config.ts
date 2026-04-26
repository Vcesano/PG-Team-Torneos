import type { Config } from 'tailwindcss'
import animate from 'tailwindcss-animate'

const config: Config = {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: { center: true, padding: '1rem', screens: { '2xl': '1400px' } },
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Bebas Neue"', '"Oswald"', 'Impact', 'sans-serif']
      },
      colors: {
        border: 'hsl(0 0% 18%)',
        input: 'hsl(0 0% 18%)',
        ring: 'hsl(0 72% 50%)',
        background: 'hsl(0 0% 5%)',
        foreground: 'hsl(0 0% 96%)',
        primary: {
          DEFAULT: 'hsl(0 72% 50%)',
          foreground: 'hsl(0 0% 100%)'
        },
        secondary: {
          DEFAULT: 'hsl(0 0% 14%)',
          foreground: 'hsl(0 0% 96%)'
        },
        destructive: {
          DEFAULT: 'hsl(0 84% 55%)',
          foreground: 'hsl(0 0% 100%)'
        },
        muted: {
          DEFAULT: 'hsl(0 0% 12%)',
          foreground: 'hsl(0 0% 60%)'
        },
        accent: {
          DEFAULT: 'hsl(0 72% 50%)',
          foreground: 'hsl(0 0% 100%)'
        },
        card: {
          DEFAULT: 'hsl(0 0% 8%)',
          foreground: 'hsl(0 0% 96%)'
        },
        popover: {
          DEFAULT: 'hsl(0 0% 8%)',
          foreground: 'hsl(0 0% 96%)'
        }
      },
      borderRadius: {
        lg: '0.625rem',
        md: '0.5rem',
        sm: '0.375rem'
      },
      keyframes: {
        'accordion-down': { from: { height: '0' }, to: { height: 'var(--radix-accordion-content-height)' } },
        'accordion-up': { from: { height: 'var(--radix-accordion-content-height)' }, to: { height: '0' } }
      },
      animation: {
        'accordion-down': 'accordion-down 0.2s ease-out',
        'accordion-up': 'accordion-up 0.2s ease-out'
      }
    }
  },
  plugins: [animate]
}

export default config
