# Root Motion Data Format

RootMotionTool edits movement data for an existing animation asset.

## Core Rule

`rootX` and `rootY` are absolute coordinates from origin frame `0`.

They are not previous-frame deltas.

```json
[
  { "frame": 0, "rootX": 0, "rootY": 0 },
  { "frame": 1, "rootX": 4, "rootY": 0 },
  { "frame": 2, "rootX": 9, "rootY": -1 }
]
```

This means:

```txt
frame 0 root = (0, 0)
frame 1 root = (4, 0)
frame 2 root = (9, -1)
```

If a game runtime needs frame delta, it calculates:

```txt
delta = currentFrameRoot - previousFrameRoot
```

## Coordinate System

`coordinateSystem` should be `platformer-side-v1`.

- `rootX+` moves right.
- `rootX-` moves left.
- `rootY-` moves up.
- `rootY+` moves down.
- The origin frame is locked to `(0, 0)`.

This intentionally matches a 2D canvas coordinate system while keeping
platformer meaning clear.

## Root Motion Asset

Recommended file name:

```txt
samples/sample-root-motion.json
```

Top-level fields:

| Field | Type | Required | Notes |
| --- | --- | --- | --- |
| `schema` | string | yes | Use `anip.rootMotion.v1`. |
| `rootMotionId` | string | yes | Stable unique id. |
| `animationId` | string | yes | Must match the Animation Asset. |
| `displayName` | string | no | Human-readable name. |
| `sourceTool` | object | no | Tool provenance. |
| `coordinateSystem` | string | yes | Use `platformer-side-v1`. |
| `originFrame` | number | yes | Usually `0`. |
| `loop` | object | yes | Loop accumulation policy. |
| `frames` | array | yes | Absolute root coordinates per source frame. |
| `metadata` | object | no | Free-form notes/tags. |

### Loop Policy

`loop.accumulate` controls whether the final root offset is added each loop.

- `false`: preview returns to origin each loop.
- `true`: walking/running style animation continues moving.

`loop.cycleOffsetX/Y` can be explicit. If omitted, the runtime can derive it
from the last frame root.

## Editing Behavior

RootMotionTool step 1 should implement these rules:

- Load an Animation Asset JSON.
- Create root frames for every animation frame.
- Set origin frame root to `(0, 0)`.
- Keep origin frame locked unless an explicit unlock mode is added later.
- Dragging edits the current frame absolute root position.
- `W/A/S/D` nudges the current frame by 1 pixel.
- `Shift + W/A/S/D` nudges by 10 pixels.

## Runtime Composition

Game projects should compose:

```txt
visualPosition = actorBase + rootMotion(frame) + frameVisualOffset(frame)
```

Where:

- `rootMotion(frame)` moves the actor root/world position.
- `frameVisualOffset(frame)` only corrects sprite drawing alignment.
- Character state decides when this animation/root motion pair is used.
