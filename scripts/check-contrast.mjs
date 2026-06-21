// WCAG 2.1 contrast ratio validation for all app themes
// AA normal text: 4.5:1 | AA large text / UI components: 3:1 | AAA: 7:1

function hexToRgb(hex) {
  const h = hex.replace('#', '')
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  }
}

// Blend rgba(r,g,b,a) over an opaque background hex color
function blendRgba(fgHex, alpha, bgHex) {
  const fg = hexToRgb(fgHex)
  const bg = hexToRgb(bgHex)
  return {
    r: Math.round(alpha * fg.r + (1 - alpha) * bg.r),
    g: Math.round(alpha * fg.g + (1 - alpha) * bg.g),
    b: Math.round(alpha * fg.b + (1 - alpha) * bg.b),
  }
}

function linearize(c) {
  c = c / 255
  return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
}

function luminance({ r, g, b }) {
  return 0.2126 * linearize(r) + 0.7152 * linearize(g) + 0.0722 * linearize(b)
}

function contrastRatio(L1, L2) {
  const lighter = Math.max(L1, L2)
  const darker  = Math.min(L1, L2)
  return (lighter + 0.05) / (darker + 0.05)
}

// Parse "rgba(255,255,255,0.78)" or "#0a0f0d"
function parseColor(str, bgHex) {
  const rgbaMatch = str.match(/rgba\((\d+),(\d+),(\d+),([\d.]+)\)/)
  if (rgbaMatch) {
    const [, r, g, b, a] = rgbaMatch.map(Number)
    if (a >= 1) return { r, g, b }
    const bg = hexToRgb(bgHex)
    return {
      r: Math.round(a * r + (1 - a) * bg.r),
      g: Math.round(a * g + (1 - a) * bg.g),
      b: Math.round(a * b + (1 - a) * bg.b),
    }
  }
  if (str.startsWith('#')) return hexToRgb(str)
  return null
}

const WCAG_AA   = 4.5
const WCAG_LARGE = 3.0
const WCAG_AAA  = 7.0

const THEMES = {
  mexico: {
    background: '#0a0f0d',
    text_main:  'rgba(255,255,255,0.97)',
    text_muted: 'rgba(255,255,255,0.78)',
    text_dim:   'rgba(255,255,255,0.42)',
    primary:    '#007850',
    secondary:  '#D4AF37',
    accent:     '#CE1126',
  },
  mexico_dia: {
    background: '#F0F7F3',
    text_main:  'rgba(0,0,0,0.87)',
    text_muted: 'rgba(0,0,0,0.56)',
    text_dim:   'rgba(0,0,0,0.48)',
    primary:    '#006847',
    secondary:  '#A8870F',
    accent:     '#CE1126',
  },
  usa: {
    background: '#050D1E',
    text_main:  '#EEF2FF',
    text_muted: '#94A3B8',
    text_dim:   '#5C7189',
    primary:    '#3B82F6',
    secondary:  '#DC2626',
    accent:     '#DC2626',
  },
  usa_dia: {
    background: '#FFFFFF',
    text_main:  'rgba(0,0,0,0.87)',
    text_muted: 'rgba(0,0,0,0.54)',
    text_dim:   'rgba(0,0,0,0.45)',
    primary:    '#B91C1C',
    secondary:  '#1E3A8A',
    accent:     '#1E3A8A',
  },
  argentina: {
    background: '#08101A',
    text_main:  '#F0FAFF',
    text_muted: '#7FB3CC',
    text_dim:   '#3A6A8A',
    primary:    '#29ABE2',
    secondary:  '#F5C100',
    accent:     '#F5C100',
  },
  argentina_dia: {
    background: '#EEF8FF',
    text_main:  'rgba(0,0,0,0.87)',
    text_muted: 'rgba(0,0,0,0.56)',
    text_dim:   'rgba(0,0,0,0.48)',
    primary:    '#0070B8',
    // secondary #F5C100 (gold) — decorativo únicamente, no usar como texto sobre fondo claro
    secondary:  '#F5C100',
    accent:     '#F5C100',
  },
}

// Which pairs to check and at what level they need to pass
const CHECKS = [
  { key: 'text_main',  against: 'background', role: 'Texto principal',  required: WCAG_AA },
  { key: 'text_muted', against: 'background', role: 'Texto secundario', required: WCAG_LARGE },
  { key: 'text_dim',   against: 'background', role: 'Texto tenue',      required: WCAG_LARGE },
  { key: 'primary',    against: 'background', role: 'Color primario',   required: WCAG_LARGE },
  { key: 'secondary',  against: 'background', role: 'Color secundario', required: WCAG_LARGE },
]

const PASS  = '\x1b[32m✓\x1b[0m'
const FAIL  = '\x1b[31m✗\x1b[0m'
const WARN  = '\x1b[33m⚠\x1b[0m'

let totalFails = 0

for (const [themeName, colors] of Object.entries(THEMES)) {
  console.log(`\n\x1b[1m── ${themeName.toUpperCase()} ─────────────────────\x1b[0m`)
  const bgRgb = hexToRgb(colors.background)
  const bgL = luminance(bgRgb)

  for (const check of CHECKS) {
    const fgStr = colors[check.key]
    if (!fgStr) continue
    const fgRgb = parseColor(fgStr, colors.background)
    if (!fgRgb) continue
    const fgL = luminance(fgRgb)
    const ratio = contrastRatio(fgL, bgL)
    const pass = ratio >= check.required
    const icon = pass ? (ratio >= WCAG_AAA ? PASS : PASS) : (ratio >= WCAG_LARGE ? WARN : FAIL)
    const marker = !pass ? FAIL : ratio >= WCAG_AAA ? PASS : WARN
    const label = `${check.role} (${fgStr} on ${colors.background})`
    const ratioStr = ratio.toFixed(2) + ':1'
    const req = `need ${check.required}:1`
    console.log(`  ${marker} ${ratioStr.padStart(7)} — ${check.role.padEnd(20)} ${pass ? '' : `\x1b[31m← FAIL (${req})\x1b[0m`}${pass && ratio < WCAG_AA && check.required === WCAG_AA ? `\x1b[33m← MARGINAL\x1b[0m` : ''}`)
    if (!pass) totalFails++
  }
}

console.log(`\n${'─'.repeat(48)}`)
console.log(totalFails === 0
  ? `\x1b[32m✓ Todos los checks pasan\x1b[0m`
  : `\x1b[31m✗ ${totalFails} check(s) fallaron\x1b[0m`)
console.log()
