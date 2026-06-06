# Sprite Sheet Tester

Open `index.html` in a browser and drop an image onto the canvas.

Root motion preview starts at `root-motion.html`.
If an imported Animation v1 JSON cannot load `imageUrl`, use `Import Image`
in RootMotionTool to connect the matching local sprite sheet for preview.
RootMotionTool supports Root X/Y editing, drag editing on the stage, W/A/S/D
nudge, Shift+W/A/S/D fast nudge, linear fill, root path display, and
RootMotion v1 import/export.

Main tools:

- Grid slicing with columns, rows, frame size, offset, and spacing.
- Frame preview with FPS, zoom, range, loop, ping-pong playback, and onion skin.
- Anchor alignment with bottom-center, center, manual, and cell-center modes.
- Per-frame manual nudge with buttons, inputs, or W/A/S/D.
- Chroma key with color picker, tolerance, edge softness, and sheet eyedropper.
- Click a frame on the sheet to select it.
- Use Left/Right arrows for frame stepping and Space for play/pause.
- Save the currently selected frame as a PNG.
- Export the aligned playback range as an animated GIF.
- Export a new aligned PNG sprite sheet with range, output columns, gap, padding, and tight-bounds options.
- Export/import Animation v1 JSON for RootMotionTool and game projects.

## Character Data Pipeline

The project is being split into two tool roles:

- `SpriteSheetTool`: exports visual animation data.
- `RootMotionTool`: imports animation data and exports per-frame root motion data.

Format drafts:

- `docs/animation-format.md`
- `docs/root-motion-format.md`

Sample files:

- `samples/sample-animation.json`
- `samples/sample-root-motion.json`
