/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"SF Pro Display"', '"Helvetica Neue"', 'Arial', 'sans-serif'],
        mono: ['"SF Mono"', '"JetBrains Mono"', 'monospace'],
      },
      colors: {
        studio: '#F5F5F7',
        charcoal: '#1D1D1F',
        muted: '#86868B',
        sfblue: '#0071E3',
        coral: '#FF9500',
        border: '#E5E5EA',
      },
      boxShadow: {
        card: '0 2px 8px rgba(0,0,0,0.08), 0 0 1px rgba(0,0,0,0.04)',
        'card-hover': '0 4px 16px rgba(0,0,0,0.12), 0 0 1px rgba(0,0,0,0.04)',
      },
      borderRadius: {
        xl: '12px',
        '2xl': '16px',
      }
    }
  },
  plugins: []
}
