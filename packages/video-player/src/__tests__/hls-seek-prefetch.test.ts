import type { HlsLoaderConstructor } from '../adapters/video-backend/hls-warm-cache';
import { describe, expect, it, vi } from 'vitest';
import { SeekPrefetch } from '../adapters/video-backend/hls-seek-prefetch';
import { createWarmLoader, warmKey } from '../adapters/video-backend/hls-warm-cache';

const BASE = 'https://media.example.test/ep2';

function frags(prefix: string, count: number, duration = 4) {
  return Array.from({ length: count }, (_item, index) => ({
    start: index * duration,
    duration,
    url: `${BASE}/${prefix}/seg_${String(index).padStart(3, '0')}.ts`,
  }));
}

function fakeFetch() {
  const calls: string[] = [];
  const release: Array<() => void> = [];
  const impl = vi.fn(async (input: RequestInfo | URL): Promise<Response> => {
    calls.push(String(input));
    await new Promise<void>((resolve) => release.push(resolve));

    return new Response(new Uint8Array(100));
  });

  return {
    calls,
    impl,
    release,
  };
}

describe('SeekPrefetch', () => {
  it('fetches the video and audio fragments covering the window, and nothing else', async () => {
    const { calls, impl, release } = fakeFetch();
    const prefetch = new SeekPrefetch();

    const done = prefetch.prefetch([frags('v1', 30), frags('audio_ja', 30)], 40, { seconds: 10, fetch: impl });

    // 40..50 s with 4 s segments = segments 10, 11, 12 per stream.
    expect(calls.sort()).toEqual([
      `${BASE}/audio_ja/seg_010.ts`,
      `${BASE}/audio_ja/seg_011.ts`,
      `${BASE}/audio_ja/seg_012.ts`,
      `${BASE}/v1/seg_010.ts`,
      `${BASE}/v1/seg_011.ts`,
      `${BASE}/v1/seg_012.ts`,
    ]);

    release.forEach((fn) => fn());
    await done;
  });

  it('isPrerolled is false until every fragment of the window has resolved', async () => {
    const { impl, release } = fakeFetch();
    const prefetch = new SeekPrefetch();

    const done = prefetch.prefetch([frags('v1', 30)], 40, { seconds: 10, fetch: impl });

    expect(prefetch.isPrerolled(41)).toBe(false);
    release.forEach((fn) => fn());
    await done;
    expect(prefetch.isPrerolled(41)).toBe(true);
    expect(prefetch.isPrerolled(48)).toBe(true);
    expect(prefetch.isPrerolled(200)).toBe(false);
  });

  it('a failed fetch leaves the window not prerolled', async () => {
    const impl = vi.fn(async () => new Response('nope', { status: 500 }));
    const prefetch = new SeekPrefetch();

    await prefetch.prefetch([frags('v1', 30)], 40, { seconds: 10, fetch: impl });
    expect(prefetch.isPrerolled(41)).toBe(false);
  });

  it('does not fetch the same fragment twice', async () => {
    const { impl, release } = fakeFetch();
    const prefetch = new SeekPrefetch();
    const first = prefetch.prefetch([frags('v1', 30)], 40, { seconds: 10, fetch: impl });
    const second = prefetch.prefetch([frags('v1', 30)], 41, { seconds: 10, fetch: impl });

    release.forEach((fn) => fn());
    await Promise.all([first, second]);
    expect(impl.mock.calls.filter(([url]) => String(url).endsWith('seg_010.ts'))).toHaveLength(1);
  });

  it('feeds the warm loader so hls.js is answered from memory', async () => {
    const { impl, release } = fakeFetch();
    const prefetch = new SeekPrefetch();
    const done = prefetch.prefetch([frags('v1', 30)], 40, { seconds: 10, fetch: impl });

    release.forEach((fn) => fn());
    await done;
    expect(prefetch.entries.has(warmKey(`${BASE}/v1/seg_010.ts`))).toBe(true);

    const inner = vi.fn();
    const Base = class {
      stats = {
        loading: {},
        loaded: 0,
        total: 0,
      };

      context = null;
      load = inner;
      abort() {}
      destroy() {}
    } as unknown as HlsLoaderConstructor;
    const Loader = createWarmLoader(Base, prefetch.entries);
    const onSuccess = vi.fn();

    new Loader({} as never).load(
      { url: `${BASE}/v1/seg_010.ts`, responseType: 'arraybuffer' } as never,
      {} as never,
      { onSuccess } as never,
    );

    await vi.waitFor(() => expect(onSuccess).toHaveBeenCalled());
    expect(inner).not.toHaveBeenCalled();
  });

  it('clear aborts in-flight fetches and forgets the windows', async () => {
    const { impl } = fakeFetch();
    const prefetch = new SeekPrefetch();

    void prefetch.prefetch([frags('v1', 30)], 40, { seconds: 10, fetch: impl });
    prefetch.clear();
    expect(prefetch.entries.size).toBe(0);
    expect(prefetch.isPrerolled(41)).toBe(false);
  });
});
