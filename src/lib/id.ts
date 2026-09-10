let counter = 0

/** Prefixed, monotonic ids. Deterministic within a session, unique across one. */
export function createId(prefix: string): string {
  counter += 1
  return `${prefix}_${Date.now().toString(36)}${counter.toString(36)}`
}

export function resetIdCounter(): void {
  counter = 0
}
