import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Html5VideoBackend } from '../adapters/video-backend/html5';

vi.mock('hls.js', () => {
  class FakeHls {
    levels: unknown[] = [];
    audioTracks: unknown[] = [];
    subtitleTracks: unknown[] = [];
    audioTrack = 0;
    subtitleTrack = -1;
    currentLevel = 0;
    loadLevel = 0;
    nextLevel = -1;
    autoLevelCapping = -1;
    static isSupported = (): boolean => true;
    static Events: Record<string, string> = {
      MANIFEST_PARSED: 'm',
      ERROR: 'e',
      FRAG_LOADED: 'f',
      LEVEL_SWITCHED: 'l',
      FRAG_CHANGED: 'c',
    };

    static ErrorTypes: Record<string, string> = {};
    on(): void {}
    attachMedia(): void {}
    loadSource(): void {}
    detachMedia(): void {}
    destroy(): void {}
    startLoad(): void {}
    stopLoad(): void {}
  }

  return { default: FakeHls };
});

const BASE = 'https://media.example.test/ep2';

function details(prefix: string) {
  return {
    fragments: Array.from({ length: 30 }, (_item, index) => ({
      start: index * 4,
      duration: 4,
      url: `${BASE}/${prefix}/seg_${index}.ts`,
    })),
  };
}

describe('Html5VideoBackend prefetchAt', () => {
  let backend: Html5VideoBackend;
  let fetchSpy: ReturnType<typeof vi.fn>;

  beforeEach(async () => {
    fetchSpy = vi.fn(async () => new Response(new Uint8Array(10)));
    vi.stubGlobal('fetch', fetchSpy);
    backend = new Html5VideoBackend(document.body.appendChild(document.createElement('div')));
    void backend.load('https://example.invalid/master.m3u8');
    await new Promise<void>((resolve) => setTimeout(resolve, 20));

    const hls = (backend as unknown as { hls: Record<string, unknown> }).hls;

    hls['levels'] = [{ details: details('v0') }];
    hls['audioTracks'] = [{ details: details('audio_ja') }];
  });

  afterEach(() => {
    backend.dispose();
    vi.unstubAllGlobals();
    document.body.innerHTML = '';
  });

  it('fetches the current level and audio fragments for the window and reports prerolled', async () => {
    expect(backend.isPrerolled(40)).toBe(false);
    await backend.prefetchAt(40);

    const urls = fetchSpy.mock.calls.map(([url]) => String(url));

    expect(urls).toContain(`${BASE}/v0/seg_10.ts`);
    expect(urls).toContain(`${BASE}/audio_ja/seg_10.ts`);
    expect(urls).not.toContain(`${BASE}/v0/seg_20.ts`);
    expect(backend.isPrerolled(41)).toBe(true);
  });

  it('does nothing when the level has no parsed fragments yet', async () => {
    const hls = (backend as unknown as { hls: Record<string, unknown> }).hls;

    hls['levels'] = [{}];
    hls['audioTracks'] = [];
    await backend.prefetchAt(40);
    expect(fetchSpy).not.toHaveBeenCalled();
    expect(backend.isPrerolled(40)).toBe(false);
  });
});
