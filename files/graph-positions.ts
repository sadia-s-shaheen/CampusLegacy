/**
 * Places `count` nodes around a circle, deterministically.
 * The previous version used Math.random() for radius, so nodes visibly
 * jumped to new positions on every refetch/tab switch. Same index now
 * always produces the same position.
 */
export function generateCirclePositions(count: number) {
  const centerX = 50
  const centerY = 50
  const positions: { x: number; y: number }[] = []

  for (let i = 0; i < count; i++) {
    if (i === 0) {
      positions.push({ x: centerX, y: centerY })
      continue
    }
    const angle = (i / count) * 2 * Math.PI
    // Small deterministic radius variation so nodes don't sit on one
    // perfectly even ring — based on index, not randomness.
    const radius = 30 + ((i * 7) % 10)
    positions.push({
      x: centerX + radius * Math.cos(angle),
      y: centerY + radius * Math.sin(angle),
    })
  }

  return positions
}
