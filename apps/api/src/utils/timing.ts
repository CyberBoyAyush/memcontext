export interface TimingContext {
  timings: Record<string, number>;
  startTime: number;
}

export function createTimingContext(): TimingContext {
  return {
    timings: {},
    startTime: performance.now(),
  };
}

export function recordTiming(
  ctx: TimingContext,
  name: string,
  durationMs: number,
): void {
  ctx.timings[name] = Math.round(durationMs * 100) / 100;
}

export async function withTiming<T>(
  ctx: TimingContext,
  name: string,
  fn: () => Promise<T>,
): Promise<T> {
  const start = performance.now();
  try {
    return await fn();
  } finally {
    const duration = performance.now() - start;
    recordTiming(ctx, name, duration);
  }
}

export function getTotalDuration(ctx: TimingContext): number {
  return Math.round((performance.now() - ctx.startTime) * 100) / 100;
}

export function getTimings(ctx: TimingContext): Record<string, number> {
  return { ...ctx.timings };
}
