const colors = require('tailwindcss/colors');

// The UI uses in-between shades (150, 250 ... 850) that Tailwind does not ship;
// without this they produced no CSS at all. Each is the midpoint of its neighbours.
function withHalfSteps(palette) {
  const mix = (a, b) => '#' + [1, 3, 5]
    .map(i => Math.round((parseInt(a.slice(i, i + 2), 16) + parseInt(b.slice(i, i + 2), 16)) / 2).toString(16).padStart(2, '0'))
    .join('');
  const out = { ...palette };
  for (let s = 150; s <= 850; s += 100) out[s] = mix(palette[s - 50], palette[s + 50]);
  return out;
}

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/frontend/**/*.{js,ts,jsx,tsx}",
    "./src/frontend/index.html"
  ],
  theme: {
    extend: {
      colors: Object.fromEntries(
        ['slate', 'indigo', 'blue', 'cyan', 'emerald', 'rose', 'red', 'amber']
          .map(name => [name, withHalfSteps(colors[name])])
      ),
      fontFamily: {
        // Inter is bundled with the app (@fontsource-variable/inter), so it works offline.
        sans: ['"Inter Variable"', '"Segoe UI"', 'system-ui', 'sans-serif'],
        mono: ['"Cascadia Mono"', 'Consolas', 'ui-monospace', 'monospace']
      },
      fontSize: {
        // One step larger than Tailwind's 12px default: most labels and table text use this.
        xs: ['13px', { lineHeight: '18px' }]
      }
    },
  },
  plugins: [],
}
