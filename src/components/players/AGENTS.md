# Players — Agent Guide

## What Lives Here

React wrapper components for each Sunbird player web component.

```
players/
  PdfPlayer.tsx     # Wraps <sunbird-pdf-player>
  VideoPlayer.tsx   # Wraps <sunbird-video-player>
  EpubPlayer.tsx    # Wraps <sunbird-epub-reader>
  QumlPlayer.tsx    # Wraps <sunbird-quml-player>
  EcmlPlayer.tsx    # Wraps ECML content player
  ContentPlayer.tsx # Router — picks the correct player by mimeType
```

---

## Architecture Notes

**Players are Sunbird web components (custom HTML elements), not React components or iframes.** The React wrappers mount them into the DOM and pass config via element properties.

**Offline URL rewriting** — before rendering, `contentPlaybackResolver.ts` (`src/services/content/`) checks `content_state === 2` and rewrites artifact and streaming URLs to local `file://` paths using `Capacitor.convertFileSrc()`. Do not pass raw remote URLs to a player when content is downloaded.

**Telemetry context** — `PlayerContextService.buildPlayerContext()` (`src/services/players/`) assembles the telemetry context object. It sets an empty `host` and `endpoint` so the player SDK does not make its own telemetry calls — all events are routed through `TelemetryService`.

**Player assets** live in `public/assets/` and are copied from `node_modules` at install time via `copy-assets.js`. Do not move, delete, or gitignore them.

---

## Adding a New Player

1. Create a wrapper in `src/components/players/`.
2. Add the mimeType mapping in `ContentPlayer.tsx`.
3. Ensure `contentPlaybackResolver.ts` handles URL rewriting for the new content type.
4. Never pass telemetry `host` or `endpoint` — leave them empty.
