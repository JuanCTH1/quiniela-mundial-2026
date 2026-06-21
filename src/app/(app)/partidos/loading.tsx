export default function Loading() {
  return (
    <div style={{ paddingTop: 16 }}>
      <div style={{ height: 24, width: 100, background: 'rgba(255,255,255,0.08)', borderRadius: 6, marginBottom: 16 }} />
      <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
        {[80, 70, 80, 80, 70, 90, 60, 60].map((w, i) => (
          <div key={i} style={{ height: 28, width: w, background: 'rgba(255,255,255,0.07)', borderRadius: 20, flexShrink: 0 }} />
        ))}
      </div>
      {[1, 2, 3].map(i => (
        <div key={i} className="glass-card" style={{ padding: '12px 14px', marginBottom: 8, minHeight: 80 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
            <div style={{ height: 10, width: 120, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
            <div style={{ height: 10, width: 60, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
            <div style={{ width: 40, height: 16, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
            <div style={{ flex: 1, height: 16, background: 'rgba(255,255,255,0.07)', borderRadius: 4 }} />
          </div>
        </div>
      ))}
    </div>
  )
}
