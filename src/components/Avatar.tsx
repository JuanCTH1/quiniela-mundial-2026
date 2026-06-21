interface Props {
  name: string
  avatarUrl?: string | null
  size?: number
  rank?: number
}

export function Avatar({ name, avatarUrl, size = 36, rank }: Props) {
  const initials = name
    .split(' ')
    .map(w => w[0])
    .join('')
    .slice(0, 2)
    .toUpperCase()

  const ring =
    rank === 1 ? '2px solid var(--gold)' :
    rank === 6 ? '2px solid var(--shame-red)' : 'none'

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name}
        width={size}
        height={size}
        style={{
          borderRadius: '50%',
          objectFit: 'cover',
          outline: ring,
          outlineOffset: '2px',
          flexShrink: 0,
        }}
      />
    )
  }

  return (
    <div
      aria-label={name}
      style={{
        width: size,
        height: size,
        borderRadius: '50%',
        background: 'rgba(0,104,71,0.3)',
        border: '1px solid rgba(255,255,255,0.15)',
        outline: ring,
        outlineOffset: '2px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        fontSize: size * 0.36,
        fontWeight: 600,
        color: 'var(--text-main)',
        flexShrink: 0,
      }}
    >
      {initials}
    </div>
  )
}
