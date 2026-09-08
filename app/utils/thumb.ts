const TONES = [
  '#629DE0',
  '#009B8E',
  '#C79B54',
  '#A83C47',
  '#0784B1',
  '#4B77AA',
  '#00766C',
  '#977640'
]

export function thumbTone(seed: string) {
  let hash = 0
  for (const char of seed) {
    hash = (hash * 31 + char.charCodeAt(0)) >>> 0
  }
  return TONES[hash % TONES.length] ?? TONES[0]
}

export function thumbLetter(label: string) {
  const trimmed = label.trim()
  return trimmed ? trimmed.slice(0, 1).toUpperCase() : '?'
}
