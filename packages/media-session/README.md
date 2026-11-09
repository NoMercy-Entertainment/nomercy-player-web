# media-session

[![npm](https://img.shields.io/npm/v/@nomercy-entertainment/media-session?logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@nomercy-entertainment/media-session)
[![downloads](https://img.shields.io/npm/dm/@nomercy-entertainment/media-session?logo=npm&logoColor=white&color=cb3837)](https://www.npmjs.com/package/@nomercy-entertainment/media-session)
[![license](https://img.shields.io/npm/l/@nomercy-entertainment/media-session)](https://www.apache.org/licenses/LICENSE-2.0)

A small wrapper around the browser Media Session API. Use it to show track details on the lock screen and in notifications, and to answer the media keys and notification buttons.

This package declares no runtime dependencies and ships its own TypeScript declarations. It has no frontend framework imports.

## Install

```bash
npm install @nomercy-entertainment/media-session
```

## Quick start

The package exports the `MediaSession` class as its default export.

```ts
import MediaSession from '@nomercy-entertainment/media-session';

const session = new MediaSession();

session.setActionHandler({
  play: () => audio.play(),
  pause: () => audio.pause(),
});

session.setMetadata({
  title: 'Song Title',
  artist: 'Artist Name',
  album: 'Album Name',
  artwork: 'https://example.com/cover',
});

session.setPlaybackState('playing');

session.setPositionState({
  duration: 300,
  playbackRate: 1,
  position: 100,
});
```

Here `audio` is your own media element. In a browser without the Media Session API, every method returns without doing anything, so the same code is safe to run everywhere.

## Features

- **Metadata.** Set title, artist, album and artwork. A string artwork URL becomes six `MediaImage` entries labeled 96 through 512 pixels square. The library adds `width`, `type=png` and `aspect_ratio=1` query parameters to each URL. It does not resize image files, so your image server must handle those parameters. A `MediaImage[]` you pass is used unchanged.
- **Playback state.** Set the browser's playback state to `none`, `paused` or `playing`. Stop is an action handler, not a playback state.
- **Position state.** Sync duration, position and playback rate.
- **Action handlers.** Respond to play, pause, stop, previous, next, seek and skip-ad actions.
- **Chapters.** Pass a `chapters` array to `setMetadata`. Each chapter needs a `title` and a `startTime` in seconds, and can have `artwork`.
- **Cleanup.** Remove action handlers one at a time or all at once.

## API

| Method | What it does |
| --- | --- |
| `setActionHandler(handlers)` | Registers handlers for `play`, `pause`, `stop`, `previous`, `next` and `skipAd`. |
| `clearActionHandler(names?)` | Removes one action, an array of actions, or all actions when called with no argument. |
| `setMetadata(metadata)` | Sets title, artist, album, artwork and chapters. |
| `setPlaybackState(state)` | Sets `none`, `paused` or `playing`. |
| `setPositionState(state)` | Sets duration, playback rate and position. |

To register the `seekbackward`, `seekforward` and `seekto` actions, pass both `seek` and `getPosition` to `setActionHandler`. If either one is missing, the seek actions are not registered. When the browser gives no seek interval, the library seeks 30 seconds.

```ts
session.setActionHandler({
  seek: time => (audio.currentTime = time),
  getPosition: () => audio.currentTime,
});

session.clearActionHandler(['play', 'pause']);
```

## Browser support

The package does not list supported browsers. It checks for `navigator.mediaSession` and does nothing when the API is missing.

## License

[Apache-2.0](https://www.apache.org/licenses/LICENSE-2.0)

Source: [packages/media-session in nomercy-player-web](https://github.com/NoMercy-Entertainment/nomercy-player-web/tree/master/packages/media-session). Made by [NoMercy Entertainment](https://nomercy.tv).
