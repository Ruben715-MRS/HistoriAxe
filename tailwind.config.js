/** @type {import('tailwindcss').Config} */
// Configuration migrée telle quelle depuis le bloc `tailwind.config = {...}`
// qui accompagnait le Tailwind Play CDN dans index.html (voir historique
// git). Ne pas modifier les valeurs sans vérifier leur usage dans
// index.html / js/app.js — ce sont les tokens de couleur/espacement du
// design "Tailored Executive".
module.exports = {
  content: [
    './index.html',
    './js/**/*.js'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        'secondary-fixed-dim': '#e9c349',
        'on-surface-variant': '#44464f',
        'outline': '#757780',
        'on-primary': '#ffffff',
        'on-tertiary': '#ffffff',
        'surface-container-highest': '#dbe4ed',
        'primary-fixed': '#dae2ff',
        'on-primary-fixed': '#001847',
        'inverse-surface': '#293138',
        'on-tertiary-fixed-variant': '#454748',
        'on-background': '#141d23',
        'surface': '#f6faff',
        'tertiary-container': '#1b1e1f',
        'tertiary-fixed-dim': '#c5c7c8',
        'on-primary-container': '#7084ba',
        'on-secondary': '#ffffff',
        'on-secondary-fixed-variant': '#574500',
        'error': '#ba1a1a',
        'surface-tint': '#495d90',
        'on-error-container': '#93000a',
        'on-tertiary-fixed': '#191c1d',
        'on-primary-fixed-variant': '#314577',
        'on-secondary-container': '#745c00',
        'surface-container-lowest': '#ffffff',
        'secondary': '#735c00',
        'surface-variant': '#dbe4ed',
        'primary-container': '#001a4b',
        'tertiary': '#020404',
        'on-surface': '#141d23',
        'secondary-fixed': '#ffe088',
        'on-error': '#ffffff',
        'secondary-container': '#fed65b',
        'surface-container-low': '#ecf5fe',
        'on-tertiary-container': '#848687',
        'surface-bright': '#f6faff',
        'error-container': '#ffdad6',
        'background': '#f6faff',
        'inverse-on-surface': '#e9f2fb',
        'surface-container-high': '#e0e9f2',
        'primary-fixed-dim': '#b2c5ff',
        'inverse-primary': '#b2c5ff',
        'surface-container': '#e6eff8',
        'surface-dim': '#d2dbe4',
        'on-secondary-fixed': '#241a00',
        'outline-variant': '#c5c6d0',
        'primary': '#000311',
        'tertiary-fixed': '#e1e3e4'
      },
      borderRadius: {
        DEFAULT: '1rem',
        lg: '2rem',
        xl: '3rem',
        full: '9999px'
      },
      spacing: {
        md: '24px',
        gutter: '16px',
        xl: '48px',
        lg: '32px',
        'margin-desktop': '64px',
        base: '8px',
        sm: '12px',
        xs: '4px',
        'margin-mobile': '20px'
      },
      fontFamily: {
        'body-lg': ['Inter'],
        'headline-lg': ['Inter'],
        'headline-md': ['Inter'],
        'label-sm': ['Inter'],
        'headline-lg-mobile': ['Inter'],
        'label-lg': ['Inter'],
        'display': ['Inter'],
        'body-md': ['Inter']
      },
      boxShadow: {
        'executive': '0px 10px 30px rgba(0, 26, 75, 0.05)'
      }
    }
  },
  plugins: [
    require('@tailwindcss/forms'),
    require('@tailwindcss/container-queries')
  ]
};
