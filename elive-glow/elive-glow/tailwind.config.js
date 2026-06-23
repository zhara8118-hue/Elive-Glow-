/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        brand: {
          rose: '#C9748A',
          gold: '#C9A84C',
          champagne: '#F5E6C8',
          blush: '#F7E8EC',
          plum: '#3D1F2F',
          charcoal: '#1C1C2E',
          lavender: '#8B6FA8',
          cream: '#FAF7F4',
        },
      },
      fontFamily: {
        display: ['Georgia', 'serif'],
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
      backgroundImage: {
        'gradient-brand': 'linear-gradient(135deg, #3D1F2F 0%, #8B6FA8 50%, #C9748A 100%)',
        'gradient-gold': 'linear-gradient(135deg, #C9A84C 0%, #F5E6C8 100%)',
        'gradient-card': 'linear-gradient(145deg, #FFFFFF 0%, #FAF7F4 100%)',
      },
      boxShadow: {
        'luxury': '0 4px 24px rgba(61, 31, 47, 0.10)',
        'luxury-hover': '0 8px 32px rgba(61, 31, 47, 0.18)',
        'card': '0 2px 16px rgba(61, 31, 47, 0.07)',
      },
      animation: {
        'fade-in': 'fadeIn 0.3s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
      },
      keyframes: {
        fadeIn: { '0%': { opacity: '0' }, '100%': { opacity: '1' } },
        slideUp: { '0%': { transform: 'translateY(16px)', opacity: '0' }, '100%': { transform: 'translateY(0)', opacity: '1' } },
      },
    },
  },
  plugins: [],
};
