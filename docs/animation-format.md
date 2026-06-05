# Animation Data Format

This document defines the data contract between SpriteSheetTool, RootMotionTool,
and downstream game projects.

## Separation

SpriteSheetTool owns visual animation data:

- Which sprite sheet image to draw.
- How the sheet is sliced.
- Which frame range is used.
- How playback behaves.
- How each frame is visually aligned.
- Optional chroma key settings.

RootMotionTool owns movement data:

- Per-frame root position in side-view platformer space.
- The root position is absolute from origin frame `0`, not relative to the previous frame.
- Root motion is linked to animation data by `animationId`.

Game projects combine both files when creating a character state.

```txt
Animation Data = how to draw
RootMotion Data = where the actor root is
Character State = which animation and movement data a state uses
```

## Animation Asset

Recommended file name:

```txt
samples/sample-animation.json
```

Top-level fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schema` | string | yes | Use `anip.animation.v1`. |
| `animationId` | string | yes | Stable unique id. |
| `displayName` | string | no | Human-readable name. |
| `imageUrl` | string | yes | Relative or absolute image path. |
| `sourceTool` | object | no | Tool provenance. |
| `sheet` | object | yes | Sprite sheet slicing data. |
| `playback` | object | yes | Frame range and playback mode. |
| `anchor` | object | yes | Visual anchor in frame-local pixels. |
| `frames` | array | yes | Per-frame visual alignment data. |
| `chromaKey` | object | no | Optional chroma key data. |
| `metadata` | object | no | Free-form notes/tags. |

### Coordinate Rules

Frame-local coordinates use image pixel space:

- `x+` moves right.
- `y+` moves down.
- `anchor.x/y` is measured inside one source frame.
- `frames[].offsetX/Y` is visual correction only. It should not move actor world position.

### Playback

`playback.mode` values:

- `once`
- `loop`
- `pingpong`

`playback.startFrame` and `playback.frameCount` describe the exported animation range.
`frames[].frame` uses the source sheet frame index, not the local range index.

### Frame Data

Each frame item should be small and deterministic:

```json
{
  "frame": 0,
  "offsetX": 0,
  "offsetY": 0
}
```

The frame item may later grow to include crop bounds or hit points, but those
should not be required for RootMotionTool step 1.

## Root Motion Data

See `docs/root-motion-format.md`.

## Compatibility With Current Export

The current SpriteSheetViewer alignment export maps roughly as follows:

| Current export | Animation asset |
| --- | --- |
| `grid.cols` | `sheet.columns` |
| `grid.rows` | `sheet.rows` |
| `grid.frameWidth` | `sheet.frameWidth` |
| `grid.frameHeight` | `sheet.frameHeight` |
| `grid.offsetX` | `sheet.offsetX` |
| `grid.offsetY` | `sheet.offsetY` |
| `grid.spacingX` | `sheet.spacingX` |
| `grid.spacingY` | `sheet.spacingY` |
| `playback.fps` | `playback.fps` |
| `playback.startFrame` | `playback.startFrame` |
| `playback.endFrame` | derive `playback.frameCount` |
| `playback.pingpong` | `playback.mode` |
| `anchor.manualX/Y` | `anchor.x/y` |
| `nudges[]` | `frames[].offsetX/Y` |

The next implementation step can add an Animation Asset export button without
removing the current alignment export.
