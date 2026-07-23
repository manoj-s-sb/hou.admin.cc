/** @type {import('tailwindcss').Config} */
const plugin = require('tailwindcss/plugin');

module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      screens: {
        desktop: '1500px',
      },
      // Centre Management / Membership design tokens (formerly centres.css :root vars).
      colors: {
        navy: '#1a2340',
        'cmx-red': '#d42b2b',
        'cmx-blue': '#21295a',
        'cmx-blue-light': '#ecedf4',
        'cmx-body': '#f4f6fb',
        'cmx-text': '#1a2340',
        sub: '#6b7280',
        muted: '#9ca3af',
        'cmx-border': '#e5e7eb',
        'cmx-green': '#008482',
        'cmx-green-bg': '#d0f0f0',
        'cmx-amber': '#d97706',
        'cmx-amber-bg': '#fef3c7',
      },
      boxShadow: {
        cmx: '0 1px 3px rgba(16, 24, 40, 0.06)',
        'cmx-md': '0 6px 20px rgba(16, 24, 40, 0.1)',
      },
      keyframes: {
        cmxFadeIn: {
          from: { opacity: '0.4', transform: 'translateY(4px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        cmxFadeUp: {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
      },
      animation: {
        'cmx-fade-in': 'cmxFadeIn 0.2s ease',
        'cmx-fade-up': 'cmxFadeUp 0.3s ease both',
      },
    },
  },
  plugins: [
    // Shared component classes for the Centre Management / Membership UI.
    // These replace the repeated multi-utility strings (pills, fields, buttons…)
    // so the markup stays terse and the styling lives in one place.
    plugin(({ addComponents }) => {
      addComponents({
        // ── Pills ──
        '.cmx-pill': {
          display: 'inline-flex',
          alignItems: 'center',
          borderRadius: '9999px',
          padding: '0.125rem 0.5rem',
          fontSize: '11px',
          fontWeight: '600',
        },
        '.cmx-pill-green': { backgroundColor: '#d0f0f0', color: '#008482' },
        '.cmx-pill-red': { backgroundColor: '#fee2e2', color: '#dc2626' },
        '.cmx-pill-blue': { backgroundColor: '#ecedf4', color: '#21295a' },
        '.cmx-pill-amber': { backgroundColor: '#fef3c7', color: '#d97706' },
        '.cmx-pill-gray': { backgroundColor: '#f3f4f6', color: '#6b7280' },
        '.cmx-pill-navy': { backgroundColor: '#1a2340', color: '#fff' },

        // ── Form fields ──
        '.cmx-field': {
          width: '100%',
          borderRadius: '7px',
          borderWidth: '1px',
          borderColor: '#e5e7eb',
          backgroundColor: '#fff',
          padding: '0.5rem 0.625rem',
          fontSize: '13px',
          color: '#1a2340',
          outline: 'none',
          '&:focus': { borderColor: '#21295a', boxShadow: '0 0 0 2px rgba(37, 99, 235, 0.1)' },
          '&:disabled': { backgroundColor: '#f9fafb', color: '#9ca3af' },
        },
        '.cmx-field-label': {
          fontSize: '11px',
          fontWeight: '600',
          textTransform: 'uppercase',
          letterSpacing: '0.04em',
          color: '#6b7280',
        },

        // ── Eyebrow / hint / note ──
        '.cmx-eyebrow': {
          fontSize: '12px',
          fontWeight: '700',
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: '#6b7280',
        },
        '.cmx-hint': { marginTop: '3px', fontSize: '11px', color: '#6b7280' },
        '.cmx-note': {
          borderRadius: '0.5rem',
          borderWidth: '1px',
          borderColor: '#b3b7d4',
          backgroundColor: '#ecedf4',
          padding: '0.75rem 0.875rem',
          fontSize: '12px',
          color: '#21295a',
        },

        // ── Buttons ── (use `.cmx-btn` + a variant, e.g. `cmx-btn cmx-btn-navy`)
        '.cmx-btn': {
          display: 'inline-flex',
          cursor: 'pointer',
          alignItems: 'center',
          gap: '5px',
          borderRadius: '7px',
          padding: '0.375rem 0.75rem',
          fontSize: '12.5px',
          fontWeight: '600',
          transitionProperty: 'all',
          transitionDuration: '150ms',
          '&:disabled': { cursor: 'not-allowed', opacity: '0.5' },
        },
        '.cmx-btn-navy': { backgroundColor: '#1a2340', color: '#fff', '&:hover': { opacity: '0.9' } },
        '.cmx-btn-blue': { backgroundColor: '#21295a', color: '#fff', '&:hover': { opacity: '0.9' } },
        '.cmx-btn-outline': {
          borderWidth: '1px',
          borderColor: '#e5e7eb',
          backgroundColor: '#fff',
          color: '#6b7280',
          '&:hover': { backgroundColor: '#f9fafb' },
        },
        '.cmx-btn-danger': {
          borderWidth: '1px',
          borderColor: '#fecaca',
          backgroundColor: '#fff',
          color: '#d42b2b',
          '&:hover': { backgroundColor: '#fef2f2' },
        },
      });
    }),
  ],
};
