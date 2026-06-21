export default function PerfilLoading() {
  const shimmer: React.CSSProperties = {
    background: 'linear-gradient(90deg, rgba(255,255,255,0.04) 0%, rgba(255,255,255,0.08) 50%, rgba(255,255,255,0.04) 100%)',
    backgroundSize: '200% 100%',
    animation: 'shimmer 1.4s infinite',
    borderRadius: 8,
  }

  return (
    <div style={{ paddingTop: 14 }}>
      <style>{`@keyframes shimmer { 0%{background-position:200% 0} 100%{background-position:-200% 0} }`}</style>

      {/* Avatar */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: 24, gap: 10 }}>
        <div style={{ ...shimmer, width: 80, height: 80, borderRadius: '50%' }} />
        <div style={{ ...shimmer, width: 60, height: 13 }} />
      </div>

      {/* Form fields */}
      <div className="glass-card" style={{ padding: '16px', marginBottom: 12 }}>
        <div style={{ ...shimmer, width: 100, height: 12, marginBottom: 8 }} />
        <div style={{ ...shimmer, width: '100%', height: 40, borderRadius: 10 }} />
      </div>
      <div className="glass-card" style={{ padding: '16px', marginBottom: 12 }}>
        <div style={{ ...shimmer, width: 80, height: 12, marginBottom: 8 }} />
        <div style={{ ...shimmer, width: '100%', height: 40, borderRadius: 10 }} />
      </div>
      <div style={{ ...shimmer, width: '100%', height: 44, borderRadius: 12, marginTop: 8 }} />
    </div>
  )
}
