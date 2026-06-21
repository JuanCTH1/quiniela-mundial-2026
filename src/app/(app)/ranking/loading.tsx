export default function Loading() {
  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ height: 24, width: 120, background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: 4 }} />
      <div style={{ height: 12, width: 200, background: 'rgba(255,255,255,0.05)', borderRadius: 4, marginBottom: 16 }} />
      {[1, 2, 3, 4, 5, 6].map(i => (
        <div key={i} className="glass-card" style={{ padding: '12px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 20, height: 20, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
          <div style={{ width: 40, height: 40, background: 'rgba(255,255,255,0.07)', borderRadius: '50%' }} />
          <div style={{ flex: 1 }}>
            <div style={{ height: 14, width: 120, background: 'rgba(255,255,255,0.07)', borderRadius: 4, marginBottom: 6 }} />
            <div style={{ height: 10, width: 160, background: 'rgba(255,255,255,0.05)', borderRadius: 4 }} />
          </div>
          <div style={{ width: 48, height: 24, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
        </div>
      ))}
    </div>
  )
}
