interface Props {
  message: string
  createdAt: string
}

export function SystemAlertBanner({ message, createdAt }: Props) {
  const ago = Math.floor((Date.now() - new Date(createdAt).getTime()) / 60_000)
  const agoText = ago < 60 ? `hace ${ago}m` : `hace ${Math.floor(ago / 60)}h`

  return (
    <div
      style={{
        padding: '8px 16px',
        background: 'rgba(206,17,38,0.12)',
        borderBottom: '1px solid rgba(206,17,38,0.3)',
        fontSize: '12px',
        color: 'var(--mx-red)',
        display: 'flex',
        alignItems: 'center',
        gap: 8,
      }}
    >
      <span>⚠️</span>
      <span style={{ flex: 1 }}>{message}</span>
      <span style={{ opacity: 0.6, whiteSpace: 'nowrap' }}>{agoText}</span>
    </div>
  )
}
