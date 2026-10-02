import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './app/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg:         '#0a0a0b',
        surface:    '#121214',
        raised:     '#1a1a1e',
        fg:         '#f4f4f5',
        muted:      '#a1a1aa',
        subtle:     '#71717a',
        line:       'rgba(255,255,255,0.08)',
        accent:     '#c8ccd4',
        'accent-fg':'#0a0a0b',
        success:    '#8fad98',
        warn:       '#c4b08a',
        danger:     '#c48a8a',
      },
      fontFamily: {
        sans:    ['var(--font-sans)', 'IBM Plex Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono:    ['var(--font-mono)', 'IBM Plex Mono', 'ui-monospace', 'monospace'],
        display: ['var(--font-display)', 'Newsreader', 'Georgia', 'serif'],
      },
      borderRadius: {
        xs: '4px',
        sm: '8px',
        md: '12px',
        lg: '16px',
        xl: '24px',
      },
      boxShadow: {
        hairline:       '0 0 0 1px rgba(255,255,255,0.08)',
        'hairline-md':  '0 0 0 1px rgba(255,255,255,0.13)',
      },
    },
  },
  plugins: [],
}

export default config
