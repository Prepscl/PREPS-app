import type { Config } from 'tailwindcss';

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        bebas: ['var(--font-bebas)', 'Impact', 'Arial Black', 'sans-serif'],
        barlow: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
        sans: ['var(--font-barlow)', 'system-ui', 'sans-serif'],
      },
      colors: {
        brand: {
          DEFAULT: '#2EE5C2',
          dim: 'rgba(46,229,194,0.12)',
          hover: '#5CF0D2',
        },
        surface: {
          DEFAULT: '#0f0f0f',
          2: '#161616',
          3: '#1e1e1e',
          4: '#282828',
          5: '#333333',
        },
      },
      letterSpacing: {
        widest2: '0.2em',
        widest3: '0.3em',
      },
      animation: {
        'pulse-fast': 'pulse 0.9s cubic-bezier(0.4,0,0.6,1) infinite',
        'slide-up': 'slideUp 0.25s ease-out',
        'fade-in': 'fadeIn 0.2s ease-out',
      },
      keyframes: {
        slideUp: {
          '0%': { transform: 'translateY(24px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
