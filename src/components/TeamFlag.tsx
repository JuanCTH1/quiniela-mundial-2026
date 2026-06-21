import { getTeamFlag } from '@/lib/utils'

function emojiToTwemojiUrl(emoji: string): string {
  const codepoint = [...emoji]
    .map(c => c.codePointAt(0)!.toString(16))
    .filter(cp => parseInt(cp, 16) !== 0xfe0f) // strip variation selector
    .join('-')
  return `https://cdnjs.cloudflare.com/ajax/libs/twemoji/14.0.2/svg/${codepoint}.svg`
}

export function TeamFlag({ name, size = 22 }: { name: string; size?: number }) {
  const emoji = getTeamFlag(name)
  return (
    <img
      src={emojiToTwemojiUrl(emoji)}
      alt={name}
      width={size}
      height={size}
      style={{ display: 'inline-block', verticalAlign: 'middle', objectFit: 'contain' }}
    />
  )
}
