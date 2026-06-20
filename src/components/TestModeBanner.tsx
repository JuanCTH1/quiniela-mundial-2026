export function TestModeBanner() {
  return (
    <div
      className="test-mode-banner"
      style={{
        padding: '8px 16px',
        textAlign: 'center',
        fontSize: '12px',
        fontWeight: 500,
        color: 'var(--gold)',
        letterSpacing: '0.04em',
      }}
    >
      ⚗️ Modo prueba — los datos no son reales
    </div>
  )
}
