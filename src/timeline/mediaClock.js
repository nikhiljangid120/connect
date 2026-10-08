let clock = null;

// The DOM remains the authoritative playback clock; Redux holds user intent.
export function attachMediaClock(route, read) {
  const owner = { route, read };
  clock = owner;
  return () => { if (clock === owner) clock = null; };
}

export function readMediaClock(route) {
  if (!clock || clock.route !== route) return null;
  const value = clock.read();
  return Number.isFinite(value) ? value : null;
}
