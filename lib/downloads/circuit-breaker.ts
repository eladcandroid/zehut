interface BreakerState {
  failures: number;
  firstFailAt: number;
  openedUntil: number | null;
}

const FAILURE_THRESHOLD = 3;
const FAILURE_WINDOW_MS = 60 * 1000;
const OPEN_DURATION_MS = 5 * 60 * 1000;

const breakers = new Map<string, BreakerState>();

function getState(backend: string): BreakerState {
  let state = breakers.get(backend);
  if (!state) {
    state = { failures: 0, firstFailAt: 0, openedUntil: null };
    breakers.set(backend, state);
  }
  return state;
}

export function shouldSkip(backend: string): boolean {
  const state = breakers.get(backend);
  if (!state || state.openedUntil === null) return false;
  if (Date.now() < state.openedUntil) return true;
  state.openedUntil = null;
  state.failures = 0;
  state.firstFailAt = 0;
  return false;
}

export function record(backend: string, success: boolean): void {
  const state = getState(backend);

  if (success) {
    state.failures = 0;
    state.firstFailAt = 0;
    state.openedUntil = null;
    return;
  }

  const now = Date.now();
  if (state.failures === 0 || now - state.firstFailAt > FAILURE_WINDOW_MS) {
    state.failures = 1;
    state.firstFailAt = now;
  } else {
    state.failures += 1;
  }

  if (state.failures >= FAILURE_THRESHOLD) {
    state.openedUntil = now + OPEN_DURATION_MS;
  }
}

export function reset(backend: string): void {
  breakers.delete(backend);
}
