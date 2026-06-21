export default function PartidoLoading() {
  const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 8,
  }

  return (
    <div style={{ padding: '16px 16px 0' }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Back link placeholder */}
      <div style={{ ...shimmer, width: 80, height: 16, marginBottom: 14 }} />

      {/* Match header skeleton */}
      <div className="glass-card" style={{ padding: '20px 16px', marginBottom: 14 }}>
        <div style={{ ...shimmer, width: 100, height: 12, margin: '0 auto 16px' }} />
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ ...shimmer, width: 48, height: 48, borderRadius: '50%' }} />
            <div style={{ ...shimmer, width: 80, height: 14 }} />
          </div>
          <div style={{ minWidth: 80, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ ...shimmer, width: 50, height: 32 }} />
            <div style={{ ...shimmer, width: 80, height: 11 }} />
          </div>
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
            <div style={{ ...shimmer, width: 48, height: 48, borderRadius: '50%' }} />
            <div style={{ ...shimmer, width: 80, height: 14 }} />
          </div>
        </div>
      </div>

      {/* Prediction rows */}
      {[0, 1, 2, 3, 4, 5].map(i => (
        <div key={i} className="glass-card" style={{ padding: '10px 14px', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ ...shimmer, width: 32, height: 32, borderRadius: '50%', flexShrink: 0 }} />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 5 }}>
            <div style={{ ...shimmer, width: 80, height: 13 }} />
            <div style={{ ...shimmer, width: 50, height: 11 }} />
          </div>
          <div style={{ ...shimmer, width: 48, height: 22 }} />
        </div>
      ))}
    </div>
  )
}
