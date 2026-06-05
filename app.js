const els = {
  fileInput: document.getElementById("fileInput"),
  dropZone: document.getElementById("dropZone"),
  sheetCanvas: document.getElementById("sheetCanvas"),
  previewCanvas: document.getElementById("previewCanvas"),
  emptyState: document.getElementById("emptyState"),
  sheetMeta: document.getElementById("sheetMeta"),
  cols: document.getElementById("colsInput"),
  rows: document.getElementById("rowsInput"),
  frameWidth: document.getElementById("frameWidthInput"),
  frameHeight: document.getElementById("frameHeightInput"),
  offsetX: document.getElementById("offsetXInput"),
  offsetY: document.getElementById("offsetYInput"),
  spacingX: document.getElementById("spacingXInput"),
  spacingY: document.getElementById("spacingYInput"),
  fps: document.getElementById("fpsInput"),
  zoom: document.getElementById("zoomInput"),
  startFrame: document.getElementById("startFrameInput"),
  endFrame: document.getElementById("endFrameInput"),
  frameSlider: document.getElementById("frameSlider"),
  frameLabel: document.getElementById("frameLabel"),
  play: document.getElementById("playButton"),
  prev: document.getElementById("prevButton"),
  next: document.getElementById("nextButton"),
  fitGrid: document.getElementById("fitGridButton"),
  download: document.getElementById("downloadButton"),
  showGrid: document.getElementById("showGridInput"),
  showIndex: document.getElementById("showIndexInput"),
  checker: document.getElementById("checkerInput"),
  pingpong: document.getElementById("pingpongInput"),
  showGuides: document.getElementById("showGuidesInput"),
  onionSkin: document.getElementById("onionSkinInput"),
  previewStage: document.querySelector(".preview-stage"),
  anchorMode: document.getElementById("anchorModeInput"),
  anchorBase: document.getElementById("anchorBaseInput"),
  manualAnchorX: document.getElementById("manualAnchorXInput"),
  manualAnchorY: document.getElementById("manualAnchorYInput"),
  analyze: document.getElementById("analyzeButton"),
  nudgeX: document.getElementById("nudgeXInput"),
  nudgeY: document.getElementById("nudgeYInput"),
  nudgeUp: document.getElementById("nudgeUpButton"),
  nudgeLeft: document.getElementById("nudgeLeftButton"),
  nudgeReset: document.getElementById("nudgeResetButton"),
  nudgeRight: document.getElementById("nudgeRightButton"),
  nudgeDown: document.getElementById("nudgeDownButton"),
  chromaEnabled: document.getElementById("chromaEnabledInput"),
  chromaColor: document.getElementById("chromaColorInput"),
  chromaHex: document.getElementById("chromaHexInput"),
  chromaTolerance: document.getElementById("chromaToleranceInput"),
  chromaSoftness: document.getElementById("chromaSoftnessInput"),
  eyedropper: document.getElementById("eyedropperInput"),
  eyedropperHint: document.getElementById("eyedropperHint"),
  sheetRange: document.getElementById("sheetRangeInput"),
  sheetCols: document.getElementById("sheetColsInput"),
  sheetCellMode: document.getElementById("sheetCellModeInput"),
  sheetAlign: document.getElementById("sheetAlignInput"),
  sheetGap: document.getElementById("sheetGapInput"),
  sheetPadding: document.getElementById("sheetPaddingInput"),
  exportGif: document.getElementById("exportGifButton"),
  exportSheet: document.getElementById("exportSheetButton"),
  exportConfig: document.getElementById("exportConfigButton"),
  importConfig: document.getElementById("importConfigInput"),
  totalFramesStat: document.getElementById("totalFramesStat"),
  sheetSizeStat: document.getElementById("sheetSizeStat"),
  cellSizeStat: document.getElementById("cellSizeStat"),
  boundsStat: document.getElementById("boundsStat"),
  autoOffsetStat: document.getElementById("autoOffsetStat"),
};

const sheetCtx = els.sheetCanvas.getContext("2d", { willReadFrequently: true });
const previewCtx = els.previewCanvas.getContext("2d", { willReadFrequently: true });
const workCanvas = document.createElement("canvas");
const workCtx = workCanvas.getContext("2d", { willReadFrequently: true });
const sourceFrameCanvas = document.createElement("canvas");
const sourceFrameCtx = sourceFrameCanvas.getContext("2d", { willReadFrequently: true });

let image = null;
let imageName = "";
let currentFrame = 0;
let playing = false;
let playDirection = 1;
let lastTick = 0;
let sheetView = { originX: 0, originY: 0, scale: 1 };
let frameBounds = [];
let frameNudges = [];
let anchorTarget = null;

const numberInputs = [
  els.cols,
  els.rows,
  els.frameWidth,
  els.frameHeight,
  els.offsetX,
  els.offsetY,
  els.spacingX,
  els.spacingY,
  els.fps,
  els.zoom,
  els.startFrame,
  els.endFrame,
  els.manualAnchorX,
  els.manualAnchorY,
  els.nudgeX,
  els.nudgeY,
  els.chromaTolerance,
  els.chromaSoftness,
  els.sheetCols,
  els.sheetGap,
  els.sheetPadding,
];

const sliceInputs = [
  els.cols,
  els.rows,
  els.frameWidth,
  els.frameHeight,
  els.offsetX,
  els.offsetY,
  els.spacingX,
  els.spacingY,
];

function readSettings() {
  const cols = clampInt(els.cols.value, 1, 999);
  const rows = clampInt(els.rows.value, 1, 999);
  const total = cols * rows;

  return {
    cols,
    rows,
    frameWidth: clampInt(els.frameWidth.value, 1, 99999),
    frameHeight: clampInt(els.frameHeight.value, 1, 99999),
    offsetX: clampInt(els.offsetX.value, 0, 99999),
    offsetY: clampInt(els.offsetY.value, 0, 99999),
    spacingX: clampInt(els.spacingX.value, 0, 99999),
    spacingY: clampInt(els.spacingY.value, 0, 99999),
    fps: clampInt(els.fps.value, 1, 60),
    zoom: clampInt(els.zoom.value, 1, 12),
    startFrame: clampInt(els.startFrame.value, 0, Math.max(0, total - 1)),
    endFrame: clampInt(els.endFrame.value, 0, Math.max(0, total - 1)),
    manualAnchorX: clampInt(els.manualAnchorX.value, 0, 99999),
    manualAnchorY: clampInt(els.manualAnchorY.value, 0, 99999),
    chromaTolerance: clampInt(els.chromaTolerance.value, 0, 255),
    chromaSoftness: clampInt(els.chromaSoftness.value, 0, 255),
    sheetCols: clampInt(els.sheetCols.value, 0, 999),
    sheetGap: clampInt(els.sheetGap.value, 0, 9999),
    sheetPadding: clampInt(els.sheetPadding.value, 0, 9999),
    total,
  };
}

function clampInt(value, min, max) {
  const parsed = Number.parseInt(value, 10);
  if (Number.isNaN(parsed)) return min;
  return Math.min(max, Math.max(min, parsed));
}

function getFrameRect(index, settings = readSettings()) {
  const col = index % settings.cols;
  const row = Math.floor(index / settings.cols);
  return {
    x: settings.offsetX + col * (settings.frameWidth + settings.spacingX),
    y: settings.offsetY + row * (settings.frameHeight + settings.spacingY),
    width: settings.frameWidth,
    height: settings.frameHeight,
  };
}

function getFrameAtImagePoint(imageX, imageY, settings = readSettings()) {
  for (let i = 0; i < settings.total; i += 1) {
    const rect = getFrameRect(i, settings);
    if (
      imageX >= rect.x &&
      imageX <= rect.x + rect.width &&
      imageY >= rect.y &&
      imageY <= rect.y + rect.height
    ) {
      return i;
    }
  }
  return -1;
}

function ensureFrameState() {
  const total = readSettings().total;
  while (frameNudges.length < total) frameNudges.push({ x: 0, y: 0 });
  if (frameNudges.length > total) frameNudges.length = total;
  while (frameBounds.length < total) frameBounds.push(null);
  if (frameBounds.length > total) frameBounds.length = total;
}

function parseHexColor(hex) {
  const clean = /^#[0-9a-fA-F]{6}$/.test(hex) ? hex.slice(1) : "000000";
  return {
    r: Number.parseInt(clean.slice(0, 2), 16),
    g: Number.parseInt(clean.slice(2, 4), 16),
    b: Number.parseInt(clean.slice(4, 6), 16),
  };
}

function colorToHex(r, g, b) {
  return `#${[r, g, b].map((value) => value.toString(16).padStart(2, "0")).join("")}`;
}

function colorDistance(r, g, b, key) {
  const dr = r - key.r;
  const dg = g - key.g;
  const db = b - key.b;
  return Math.sqrt(dr * dr + dg * dg + db * db);
}

function isVisiblePixel(r, g, b, a, settings = readSettings()) {
  if (a < 8) return false;
  if (!els.chromaEnabled.checked) return true;
  return colorDistance(r, g, b, parseHexColor(els.chromaHex.value)) > settings.chromaTolerance;
}

function makeFrameImageData(index) {
  const rect = getFrameRect(index);
  workCanvas.width = rect.width;
  workCanvas.height = rect.height;
  workCtx.clearRect(0, 0, rect.width, rect.height);
  workCtx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

  const imageData = workCtx.getImageData(0, 0, rect.width, rect.height);
  if (!els.chromaEnabled.checked) return imageData;

  const settings = readSettings();
  const key = parseHexColor(els.chromaHex.value);
  const hard = settings.chromaTolerance;
  const soft = settings.chromaSoftness;
  const data = imageData.data;

  for (let i = 0; i < data.length; i += 4) {
    const distance = colorDistance(data[i], data[i + 1], data[i + 2], key);
    if (distance <= hard) {
      data[i + 3] = 0;
    } else if (soft > 0 && distance <= hard + soft) {
      data[i + 3] = Math.round(data[i + 3] * ((distance - hard) / soft));
    }
  }

  return imageData;
}

function analyzeFrame(index) {
  if (!image) return null;
  const rect = getFrameRect(index);
  workCanvas.width = rect.width;
  workCanvas.height = rect.height;
  workCtx.clearRect(0, 0, rect.width, rect.height);
  workCtx.drawImage(image, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

  const settings = readSettings();
  const data = workCtx.getImageData(0, 0, rect.width, rect.height).data;
  let left = rect.width;
  let top = rect.height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < rect.height; y += 1) {
    for (let x = 0; x < rect.width; x += 1) {
      const i = (y * rect.width + x) * 4;
      if (isVisiblePixel(data[i], data[i + 1], data[i + 2], data[i + 3], settings)) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) return null;
  return {
    left,
    top,
    right,
    bottom,
    width: right - left + 1,
    height: bottom - top + 1,
  };
}

function analyzeAllFrames() {
  ensureFrameState();
  const settings = readSettings();
  frameBounds = Array.from({ length: settings.total }, (_, index) => analyzeFrame(index));
  anchorTarget = computeAnchorTarget();
}

function getAnchorPoint(index) {
  const settings = readSettings();
  const bounds = frameBounds[index] || analyzeFrame(index);
  const mode = els.anchorMode.value;

  if (mode === "manual") {
    return { x: settings.manualAnchorX, y: settings.manualAnchorY };
  }

  if (mode === "cell" || !bounds) {
    return { x: settings.frameWidth / 2, y: settings.frameHeight / 2 };
  }

  if (mode === "center") {
    return {
      x: bounds.left + bounds.width / 2,
      y: bounds.top + bounds.height / 2,
    };
  }

  return {
    x: bounds.left + bounds.width / 2,
    y: bounds.bottom,
  };
}

function computeAnchorTarget() {
  const settings = readSettings();
  if (els.anchorBase.value === "first") return getAnchorPoint(0);

  let x = 0;
  let y = 0;
  let count = 0;
  for (let i = 0; i < settings.total; i += 1) {
    const point = getAnchorPoint(i);
    x += point.x;
    y += point.y;
    count += 1;
  }
  return count > 0 ? { x: x / count, y: y / count } : null;
}

function getAutoOffset(index) {
  if (!anchorTarget) anchorTarget = computeAnchorTarget();
  if (!anchorTarget) return { x: 0, y: 0 };
  const point = getAnchorPoint(index);
  return {
    x: anchorTarget.x - point.x,
    y: anchorTarget.y - point.y,
  };
}

function getNudge(index) {
  ensureFrameState();
  return frameNudges[index] || { x: 0, y: 0 };
}

function setCurrentNudge(x, y) {
  ensureFrameState();
  frameNudges[currentFrame] = { x, y };
  els.nudgeX.value = String(x);
  els.nudgeY.value = String(y);
}

function fitCanvasToContainer() {
  const rect = els.dropZone.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  els.sheetCanvas.width = Math.max(1, Math.floor(rect.width * ratio));
  els.sheetCanvas.height = Math.max(1, Math.floor(rect.height * ratio));
  sheetCtx.setTransform(ratio, 0, 0, ratio, 0, 0);
}

function drawSheet() {
  fitCanvasToContainer();
  const width = els.sheetCanvas.width / (window.devicePixelRatio || 1);
  const height = els.sheetCanvas.height / (window.devicePixelRatio || 1);

  sheetCtx.clearRect(0, 0, width, height);
  sheetCtx.fillStyle = "#050607";
  sheetCtx.fillRect(0, 0, width, height);

  if (!image) return;

  const scale = Math.min(width / image.width, height / image.height);
  const drawWidth = image.width * scale;
  const drawHeight = image.height * scale;
  const originX = (width - drawWidth) / 2;
  const originY = (height - drawHeight) / 2;
  sheetView = { originX, originY, scale };

  sheetCtx.imageSmoothingEnabled = false;
  sheetCtx.drawImage(image, originX, originY, drawWidth, drawHeight);

  const settings = readSettings();
  if (els.showGrid.checked) drawFrameGrid(settings, originX, originY, scale);
  drawCurrentFrameBox(settings, originX, originY, scale);
}

function drawFrameGrid(settings, originX, originY, scale) {
  sheetCtx.save();
  sheetCtx.lineWidth = 1;
  sheetCtx.strokeStyle = "rgba(79, 183, 255, 0.85)";
  sheetCtx.fillStyle = "rgba(255, 209, 102, 0.95)";
  sheetCtx.font = "12px Segoe UI, Arial, sans-serif";

  for (let i = 0; i < settings.total; i += 1) {
    const rect = getFrameRect(i, settings);
    const x = originX + rect.x * scale;
    const y = originY + rect.y * scale;
    const w = rect.width * scale;
    const h = rect.height * scale;
    sheetCtx.strokeRect(x + 0.5, y + 0.5, w, h);
    if (els.showIndex.checked) sheetCtx.fillText(String(i), x + 6, y + 16);
  }
  sheetCtx.restore();
}

function drawCurrentFrameBox(settings, originX, originY, scale) {
  const rect = getFrameRect(currentFrame, settings);
  sheetCtx.save();
  sheetCtx.strokeStyle = els.eyedropper.checked ? "#ffd166" : "#ff6b6b";
  sheetCtx.lineWidth = 2;
  sheetCtx.strokeRect(
    originX + rect.x * scale + 1,
    originY + rect.y * scale + 1,
    rect.width * scale - 2,
    rect.height * scale - 2
  );
  sheetCtx.restore();
}

function updateEyedropperState() {
  els.dropZone.classList.toggle("picking", els.eyedropper.checked);
  els.eyedropperHint.classList.toggle("active", els.eyedropper.checked);
}

function drawPreview() {
  previewCtx.clearRect(0, 0, els.previewCanvas.width, els.previewCanvas.height);
  previewCtx.imageSmoothingEnabled = false;

  if (!image) {
    previewCtx.fillStyle = "#a8afbd";
    previewCtx.textAlign = "center";
    previewCtx.fillText("No frame", 180, 180);
    updateStats();
    return;
  }

  ensureFrameState();
  if (els.onionSkin.checked) {
    const prevFrame = Math.max(0, currentFrame - 1);
    const nextFrame = Math.min(readSettings().total - 1, currentFrame + 1);
    drawAlignedFrame(prevFrame, 0.28);
    drawAlignedFrame(nextFrame, 0.28);
  }
  drawAlignedFrame(currentFrame, 1);
  if (els.showGuides.checked) drawPreviewGuides();

  updateStats();
}

function drawAlignedFrame(index, alpha) {
  const settings = readSettings();
  const rect = getFrameRect(index, settings);
  const scale = Math.min(
    (els.previewCanvas.width - 32) / rect.width,
    (els.previewCanvas.height - 32) / rect.height,
    settings.zoom
  );
  const width = rect.width * scale;
  const height = rect.height * scale;
  const baseX = (els.previewCanvas.width - width) / 2;
  const baseY = (els.previewCanvas.height - height) / 2;
  const auto = getAutoOffset(index);
  const nudge = getNudge(index);
  const drawX = baseX + (auto.x + nudge.x) * scale;
  const drawY = baseY + (auto.y + nudge.y) * scale;

  const imageData = makeFrameImageData(index);
  workCanvas.width = rect.width;
  workCanvas.height = rect.height;
  workCtx.putImageData(imageData, 0, 0);

  previewCtx.save();
  previewCtx.globalAlpha = alpha;
  previewCtx.drawImage(workCanvas, drawX, drawY, width, height);
  previewCtx.restore();
}

function renderAlignedFrameToCanvas(index, canvas) {
  const settings = readSettings();
  const rect = getFrameRect(index, settings);
  canvas.width = rect.width;
  canvas.height = rect.height;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  ctx.clearRect(0, 0, rect.width, rect.height);
  ctx.imageSmoothingEnabled = false;

  const imageData = makeFrameImageData(index);
  sourceFrameCanvas.width = rect.width;
  sourceFrameCanvas.height = rect.height;
  sourceFrameCtx.clearRect(0, 0, rect.width, rect.height);
  sourceFrameCtx.putImageData(imageData, 0, 0);

  const auto = getAutoOffset(index);
  const nudge = getNudge(index);
  ctx.drawImage(sourceFrameCanvas, Math.round(auto.x + nudge.x), Math.round(auto.y + nudge.y));
  return canvas;
}

function getCanvasAlphaBounds(canvas) {
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  const { width, height } = canvas;
  const data = ctx.getImageData(0, 0, width, height).data;
  let left = width;
  let top = height;
  let right = -1;
  let bottom = -1;

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const alpha = data[(y * width + x) * 4 + 3];
      if (alpha > 0) {
        left = Math.min(left, x);
        top = Math.min(top, y);
        right = Math.max(right, x);
        bottom = Math.max(bottom, y);
      }
    }
  }

  if (right < left || bottom < top) return { left: 0, top: 0, right: 0, bottom: 0, width: 1, height: 1 };
  return { left, top, right, bottom, width: right - left + 1, height: bottom - top + 1 };
}

function drawPreviewGuides() {
  const settings = readSettings();
  const rect = getFrameRect(currentFrame, settings);
  const scale = Math.min(
    (els.previewCanvas.width - 32) / rect.width,
    (els.previewCanvas.height - 32) / rect.height,
    settings.zoom
  );
  const width = rect.width * scale;
  const height = rect.height * scale;
  const baseX = (els.previewCanvas.width - width) / 2;
  const baseY = (els.previewCanvas.height - height) / 2;
  const target = anchorTarget || computeAnchorTarget() || { x: rect.width / 2, y: rect.height / 2 };
  const anchorX = baseX + target.x * scale;
  const anchorY = baseY + target.y * scale;

  previewCtx.save();
  previewCtx.strokeStyle = "rgba(255, 209, 102, 0.95)";
  previewCtx.lineWidth = 1;
  previewCtx.beginPath();
  previewCtx.moveTo(anchorX, 0);
  previewCtx.lineTo(anchorX, els.previewCanvas.height);
  previewCtx.moveTo(0, anchorY);
  previewCtx.lineTo(els.previewCanvas.width, anchorY);
  previewCtx.stroke();
  previewCtx.fillStyle = "#ff6b6b";
  previewCtx.fillRect(anchorX - 3, anchorY - 3, 6, 6);
  previewCtx.restore();
}

function updateStats() {
  ensureFrameState();
  const settings = readSettings();
  const maxFrame = Math.max(0, settings.total - 1);
  currentFrame = Math.min(currentFrame, maxFrame);
  const nudge = getNudge(currentFrame);
  const auto = getAutoOffset(currentFrame);
  const bounds = frameBounds[currentFrame];

  els.frameSlider.max = String(maxFrame);
  els.frameSlider.value = String(currentFrame);
  els.frameLabel.textContent = `${currentFrame} / ${maxFrame}`;
  els.totalFramesStat.textContent = String(settings.total);
  els.sheetSizeStat.textContent = image ? `${image.width} x ${image.height}` : "-";
  els.cellSizeStat.textContent = `${settings.frameWidth} x ${settings.frameHeight}`;
  els.boundsStat.textContent = bounds ? `${bounds.width} x ${bounds.height}` : "-";
  els.autoOffsetStat.textContent = `${auto.x.toFixed(1)}, ${auto.y.toFixed(1)}`;
  els.endFrame.max = String(maxFrame);
  els.startFrame.max = String(maxFrame);
  els.nudgeX.value = String(nudge.x);
  els.nudgeY.value = String(nudge.y);
}

function syncRangeInputs() {
  const settings = readSettings();
  if (settings.startFrame > settings.endFrame) els.endFrame.value = String(settings.startFrame);
}

function render() {
  syncRangeInputs();
  ensureFrameState();
  anchorTarget = computeAnchorTarget();
  drawSheet();
  drawPreview();
}

function loadFile(file) {
  if (!file || !file.type.startsWith("image/")) return;
  const reader = new FileReader();
  reader.onload = () => {
    const nextImage = new Image();
    nextImage.onload = () => {
      image = nextImage;
      imageName = file.name;
      els.emptyState.hidden = true;
      els.sheetMeta.textContent = `${file.name} - ${image.width} x ${image.height}`;
      fitGridToImage();
      analyzeAllFrames();
      render();
    };
    nextImage.src = reader.result;
  };
  reader.readAsDataURL(file);
}

function fitGridToImage() {
  if (!image) return;
  const cols = clampInt(els.cols.value, 1, 999);
  const rows = clampInt(els.rows.value, 1, 999);
  const offsetX = clampInt(els.offsetX.value, 0, 99999);
  const offsetY = clampInt(els.offsetY.value, 0, 99999);
  const spacingX = clampInt(els.spacingX.value, 0, 99999);
  const spacingY = clampInt(els.spacingY.value, 0, 99999);
  const width = Math.floor((image.width - offsetX - spacingX * (cols - 1)) / cols);
  const height = Math.floor((image.height - offsetY - spacingY * (rows - 1)) / rows);
  els.frameWidth.value = String(Math.max(1, width));
  els.frameHeight.value = String(Math.max(1, height));
  els.manualAnchorX.value = String(Math.floor(Math.max(1, width) / 2));
  els.manualAnchorY.value = String(Math.max(1, height) - 1);
  els.startFrame.value = "0";
  els.endFrame.value = String(cols * rows - 1);
  currentFrame = 0;
  frameNudges = [];
  frameBounds = [];
  ensureFrameState();
}

function stepFrame(delta) {
  const settings = readSettings();
  const start = Math.min(settings.startFrame, settings.endFrame);
  const end = Math.max(settings.startFrame, settings.endFrame);
  currentFrame += delta;
  if (currentFrame > end) currentFrame = start;
  if (currentFrame < start) currentFrame = end;
  render();
}

function animationLoop(time) {
  if (!playing) return;
  const settings = readSettings();
  const interval = 1000 / settings.fps;

  if (time - lastTick >= interval) {
    lastTick = time;
    if (els.pingpong.checked) {
      const start = Math.min(settings.startFrame, settings.endFrame);
      const end = Math.max(settings.startFrame, settings.endFrame);
      currentFrame += playDirection;
      if (currentFrame >= end || currentFrame <= start) {
        currentFrame = Math.min(end, Math.max(start, currentFrame));
        playDirection *= -1;
      }
      render();
    } else {
      stepFrame(1);
    }
  }

  requestAnimationFrame(animationLoop);
}

function togglePlay() {
  playing = !playing;
  els.play.textContent = playing ? "II" : ">";
  lastTick = 0;
  if (playing) requestAnimationFrame(animationLoop);
}

function downloadCurrentFrame() {
  if (!image) return;
  const settings = readSettings();
  const rect = getFrameRect(currentFrame, settings);
  const canvas = document.createElement("canvas");
  canvas.width = rect.width;
  canvas.height = rect.height;
  renderAlignedFrameToCanvas(currentFrame, canvas);

  const link = document.createElement("a");
  const baseName = imageName.replace(/\.[^.]+$/, "") || "sprite";
  link.download = `${baseName}_frame_${String(currentFrame).padStart(3, "0")}.png`;
  link.href = canvas.toDataURL("image/png");
  link.click();
}

function exportAlignedSpriteSheet() {
  if (!image) return;
  analyzeAllFrames();
  const settings = readSettings();
  const sequence = getExportSequence(els.sheetRange.value);
  const sourceFrames = sequence.map((index) => {
    const canvas = document.createElement("canvas");
    renderAlignedFrameToCanvas(index, canvas);
    return {
      canvas,
      bounds: getCanvasAlphaBounds(canvas),
    };
  });
  const tight = els.sheetCellMode.value === "tight";
  const padding = settings.sheetPadding;
  const gap = settings.sheetGap;
  const outCols = Math.max(1, settings.sheetCols || Math.ceil(Math.sqrt(sourceFrames.length)));
  const outRows = Math.ceil(sourceFrames.length / outCols);
  const cellWidth = tight
    ? Math.max(...sourceFrames.map((frame) => frame.bounds.width)) + padding * 2
    : settings.frameWidth + padding * 2;
  const cellHeight = tight
    ? Math.max(...sourceFrames.map((frame) => frame.bounds.height)) + padding * 2
    : settings.frameHeight + padding * 2;
  const canvas = document.createElement("canvas");
  canvas.width = outCols * cellWidth + Math.max(0, outCols - 1) * gap;
  canvas.height = outRows * cellHeight + Math.max(0, outRows - 1) * gap;
  const ctx = canvas.getContext("2d");

  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.imageSmoothingEnabled = false;

  sourceFrames.forEach((frame, outputIndex) => {
    const col = outputIndex % outCols;
    const row = Math.floor(outputIndex / outCols);
    const cellX = col * (cellWidth + gap);
    const cellY = row * (cellHeight + gap);
    const source = tight ? frame.bounds : { left: 0, top: 0, width: settings.frameWidth, height: settings.frameHeight };
    const target = getSheetTargetRect(source.width, source.height, cellWidth, cellHeight, padding);
    ctx.drawImage(
      frame.canvas,
      source.left,
      source.top,
      source.width,
      source.height,
      cellX + target.x,
      cellY + target.y,
      source.width,
      source.height
    );
  });

  const baseName = imageName.replace(/\.[^.]+$/, "") || "sprite";
  downloadUrl(canvas.toDataURL("image/png"), `${baseName}_aligned_sheet.png`);
}

function exportAlignedGif() {
  if (!image) return;
  analyzeAllFrames();
  const settings = readSettings();
  const frameCanvas = document.createElement("canvas");
  const frames = [];
  const sequence = getPlaybackSequence();

  sequence.forEach((index) => {
    renderAlignedFrameToCanvas(index, frameCanvas);
    const ctx = frameCanvas.getContext("2d", { willReadFrequently: true });
    frames.push(ctx.getImageData(0, 0, frameCanvas.width, frameCanvas.height));
  });

  const delayCs = Math.max(2, Math.round(100 / settings.fps));
  const blob = encodeGif(frames, settings.frameWidth, settings.frameHeight, delayCs);
  const baseName = imageName.replace(/\.[^.]+$/, "") || "sprite";
  downloadBlob(blob, `${baseName}_aligned.gif`);
}

function getPlaybackSequence() {
  const settings = readSettings();
  const start = Math.min(settings.startFrame, settings.endFrame);
  const end = Math.max(settings.startFrame, settings.endFrame);
  const sequence = [];
  for (let index = start; index <= end; index += 1) sequence.push(index);
  if (els.pingpong.checked && end > start) {
    for (let index = end - 1; index > start; index -= 1) sequence.push(index);
  }
  return sequence;
}

function getExportSequence(rangeMode) {
  const settings = readSettings();
  if (rangeMode === "all") {
    return Array.from({ length: settings.total }, (_, index) => index);
  }
  return getPlaybackSequence();
}

function getSheetTargetRect(sourceWidth, sourceHeight, cellWidth, cellHeight, padding) {
  const innerWidth = cellWidth - padding * 2;
  const innerHeight = cellHeight - padding * 2;
  if (els.sheetAlign.value === "top-left") {
    return { x: padding, y: padding };
  }
  if (els.sheetAlign.value === "center") {
    return {
      x: padding + Math.floor((innerWidth - sourceWidth) / 2),
      y: padding + Math.floor((innerHeight - sourceHeight) / 2),
    };
  }
  return {
    x: padding + Math.floor((innerWidth - sourceWidth) / 2),
    y: padding + innerHeight - sourceHeight,
  };
}

function downloadUrl(url, filename) {
  const link = document.createElement("a");
  link.download = filename;
  link.href = url;
  link.click();
}

function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  downloadUrl(url, filename);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

function encodeGif(frames, width, height, delayCs) {
  const out = [];
  writeString(out, "GIF89a");
  writeShort(out, width);
  writeShort(out, height);
  out.push(0xf7, 0x00, 0x00);
  writePalette(out);
  writeString(out, "!\xff\x0bNETSCAPE2.0\x03\x01");
  writeShort(out, 0);
  out.push(0x00);

  frames.forEach((frame) => {
    const indexed = rgbaToIndexed(frame.data);
    writeString(out, "!\xf9\x04");
    out.push(0x09);
    writeShort(out, delayCs);
    out.push(0x00, 0x00);
    out.push(0x2c);
    writeShort(out, 0);
    writeShort(out, 0);
    writeShort(out, width);
    writeShort(out, height);
    out.push(0x00);
    out.push(0x08);
    writeSubBlocks(out, lzwEncode(indexed, 8));
  });

  out.push(0x3b);
  return new Blob([new Uint8Array(out)], { type: "image/gif" });
}

function writeString(out, value) {
  for (let i = 0; i < value.length; i += 1) out.push(value.charCodeAt(i) & 0xff);
}

function writeShort(out, value) {
  out.push(value & 0xff, (value >> 8) & 0xff);
}

function writePalette(out) {
  for (let i = 0; i < 256; i += 1) {
    if (i <= 1) {
      out.push(0, 0, 0);
    } else {
      const r = Math.round(((i >> 5) & 0x07) * 255 / 7);
      const g = Math.round(((i >> 2) & 0x07) * 255 / 7);
      const b = Math.round((i & 0x03) * 255 / 3);
      out.push(r, g, b);
    }
  }
}

function rgbaToIndexed(data) {
  const indexed = new Uint8Array(data.length / 4);
  for (let i = 0, p = 0; i < data.length; i += 4, p += 1) {
    if (data[i + 3] < 128) {
      indexed[p] = 0;
    } else {
      const index = ((data[i] >> 5) << 5) | ((data[i + 1] >> 5) << 2) | (data[i + 2] >> 6);
      indexed[p] = index === 0 ? 1 : index;
    }
  }
  return indexed;
}

function lzwEncode(indices, minCodeSize) {
  const clearCode = 1 << minCodeSize;
  const endCode = clearCode + 1;
  let codeSize = minCodeSize + 1;
  let nextCode = endCode + 1;
  let dict = createLzwDictionary(clearCode);
  const bytes = [];
  let bitBuffer = 0;
  let bitCount = 0;

  function writeCode(code) {
    bitBuffer |= code << bitCount;
    bitCount += codeSize;
    while (bitCount >= 8) {
      bytes.push(bitBuffer & 0xff);
      bitBuffer >>= 8;
      bitCount -= 8;
    }
  }

  writeCode(clearCode);
  let prefix = String(indices[0]);

  for (let i = 1; i < indices.length; i += 1) {
    const current = String(indices[i]);
    const combined = `${prefix},${current}`;
    if (dict.has(combined)) {
      prefix = combined;
    } else {
      writeCode(dict.get(prefix));
      if (nextCode < 4096) {
        dict.set(combined, nextCode);
        nextCode += 1;
        if (nextCode === (1 << codeSize) && codeSize < 12) codeSize += 1;
      } else {
        writeCode(clearCode);
        dict = createLzwDictionary(clearCode);
        codeSize = minCodeSize + 1;
        nextCode = endCode + 1;
      }
      prefix = current;
    }
  }

  writeCode(dict.get(prefix));
  writeCode(endCode);
  if (bitCount > 0) bytes.push(bitBuffer & 0xff);
  return bytes;
}

function createLzwDictionary(clearCode) {
  const dict = new Map();
  for (let i = 0; i < clearCode; i += 1) dict.set(String(i), i);
  return dict;
}

function writeSubBlocks(out, data) {
  for (let i = 0; i < data.length; i += 255) {
    const chunk = data.slice(i, i + 255);
    out.push(chunk.length, ...chunk);
  }
  out.push(0x00);
}

function pickChromaColor(event) {
  const bounds = els.sheetCanvas.getBoundingClientRect();
  const imageX = Math.floor((event.clientX - bounds.left - sheetView.originX) / sheetView.scale);
  const imageY = Math.floor((event.clientY - bounds.top - sheetView.originY) / sheetView.scale);
  if (!image || imageX < 0 || imageY < 0 || imageX >= image.width || imageY >= image.height) return false;

  workCanvas.width = image.width;
  workCanvas.height = image.height;
  workCtx.drawImage(image, 0, 0);
  const data = workCtx.getImageData(imageX, imageY, 1, 1).data;
  const hex = colorToHex(data[0], data[1], data[2]);
  els.chromaColor.value = hex;
  els.chromaHex.value = hex;
  els.chromaEnabled.checked = true;
  els.eyedropper.checked = false;
  updateEyedropperState();
  analyzeAllFrames();
  render();
  return true;
}

function adjustNudge(dx, dy) {
  const nudge = getNudge(currentFrame);
  setCurrentNudge(nudge.x + dx, nudge.y + dy);
  render();
}

function exportConfig() {
  const settings = readSettings();
  const config = {
    version: 1,
    grid: {
      cols: settings.cols,
      rows: settings.rows,
      frameWidth: settings.frameWidth,
      frameHeight: settings.frameHeight,
      offsetX: settings.offsetX,
      offsetY: settings.offsetY,
      spacingX: settings.spacingX,
      spacingY: settings.spacingY,
    },
    playback: {
      fps: settings.fps,
      zoom: settings.zoom,
      startFrame: settings.startFrame,
      endFrame: settings.endFrame,
      pingpong: els.pingpong.checked,
    },
    anchor: {
      mode: els.anchorMode.value,
      base: els.anchorBase.value,
      manualX: settings.manualAnchorX,
      manualY: settings.manualAnchorY,
    },
    chroma: {
      enabled: els.chromaEnabled.checked,
      color: els.chromaHex.value,
      tolerance: settings.chromaTolerance,
      softness: settings.chromaSoftness,
    },
    sheetExport: {
      range: els.sheetRange.value,
      cols: settings.sheetCols,
      cellMode: els.sheetCellMode.value,
      align: els.sheetAlign.value,
      gap: settings.sheetGap,
      padding: settings.sheetPadding,
    },
    nudges: frameNudges,
  };

  const blob = new Blob([JSON.stringify(config, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  const baseName = imageName.replace(/\.[^.]+$/, "") || "sprite";
  link.download = `${baseName}_alignment.json`;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function importConfig(file) {
  if (!file) return;
  const reader = new FileReader();
  reader.onload = () => {
    const config = JSON.parse(reader.result);
    const grid = config.grid || {};
    const playback = config.playback || {};
    const anchor = config.anchor || {};
    const chroma = config.chroma || {};
    const sheetExport = config.sheetExport || {};

    els.cols.value = grid.cols ?? els.cols.value;
    els.rows.value = grid.rows ?? els.rows.value;
    els.frameWidth.value = grid.frameWidth ?? els.frameWidth.value;
    els.frameHeight.value = grid.frameHeight ?? els.frameHeight.value;
    els.offsetX.value = grid.offsetX ?? els.offsetX.value;
    els.offsetY.value = grid.offsetY ?? els.offsetY.value;
    els.spacingX.value = grid.spacingX ?? els.spacingX.value;
    els.spacingY.value = grid.spacingY ?? els.spacingY.value;
    els.fps.value = playback.fps ?? els.fps.value;
    els.zoom.value = playback.zoom ?? els.zoom.value;
    els.startFrame.value = playback.startFrame ?? els.startFrame.value;
    els.endFrame.value = playback.endFrame ?? els.endFrame.value;
    els.pingpong.checked = Boolean(playback.pingpong);
    els.anchorMode.value = anchor.mode || els.anchorMode.value;
    els.anchorBase.value = anchor.base || els.anchorBase.value;
    els.manualAnchorX.value = anchor.manualX ?? els.manualAnchorX.value;
    els.manualAnchorY.value = anchor.manualY ?? els.manualAnchorY.value;
    els.chromaEnabled.checked = Boolean(chroma.enabled);
    els.chromaColor.value = chroma.color || els.chromaColor.value;
    els.chromaHex.value = chroma.color || els.chromaHex.value;
    els.chromaTolerance.value = chroma.tolerance ?? els.chromaTolerance.value;
    els.chromaSoftness.value = chroma.softness ?? els.chromaSoftness.value;
    els.sheetRange.value = sheetExport.range || els.sheetRange.value;
    els.sheetCols.value = sheetExport.cols ?? els.sheetCols.value;
    els.sheetCellMode.value = sheetExport.cellMode || els.sheetCellMode.value;
    els.sheetAlign.value = sheetExport.align || els.sheetAlign.value;
    els.sheetGap.value = sheetExport.gap ?? els.sheetGap.value;
    els.sheetPadding.value = sheetExport.padding ?? els.sheetPadding.value;
    frameNudges = Array.isArray(config.nudges) ? config.nudges : [];
    analyzeAllFrames();
    render();
  };
  reader.readAsText(file);
}

els.fileInput.addEventListener("change", (event) => loadFile(event.target.files[0]));

["dragenter", "dragover"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.add("dragging");
  });
});

["dragleave", "drop"].forEach((eventName) => {
  els.dropZone.addEventListener(eventName, (event) => {
    event.preventDefault();
    els.dropZone.classList.remove("dragging");
  });
});

els.dropZone.addEventListener("drop", (event) => loadFile(event.dataTransfer.files[0]));

els.sheetCanvas.addEventListener("click", (event) => {
  if (!image) return;
  if (els.eyedropper.checked && pickChromaColor(event)) return;

  const bounds = els.sheetCanvas.getBoundingClientRect();
  const imageX = (event.clientX - bounds.left - sheetView.originX) / sheetView.scale;
  const imageY = (event.clientY - bounds.top - sheetView.originY) / sheetView.scale;
  const frame = getFrameAtImagePoint(imageX, imageY);
  if (frame >= 0) {
    currentFrame = frame;
    render();
  }
});

numberInputs.forEach((input) => {
  input.addEventListener("input", () => {
    if (input === els.nudgeX || input === els.nudgeY) {
      setCurrentNudge(clampInt(els.nudgeX.value, -9999, 9999), clampInt(els.nudgeY.value, -9999, 9999));
    }
    if (
      sliceInputs.includes(input) ||
      input === els.chromaTolerance ||
      input === els.chromaSoftness
    ) {
      analyzeAllFrames();
    }
    render();
  });
});

els.frameSlider.addEventListener("input", () => {
  currentFrame = clampInt(els.frameSlider.value, 0, readSettings().total - 1);
  render();
});
els.showGrid.addEventListener("change", drawSheet);
els.showIndex.addEventListener("change", drawSheet);
els.showGuides.addEventListener("change", drawPreview);
els.onionSkin.addEventListener("change", drawPreview);
els.checker.addEventListener("change", () => {
  els.previewStage.classList.toggle("no-checker", !els.checker.checked);
});
els.anchorMode.addEventListener("change", render);
els.anchorBase.addEventListener("change", render);
els.chromaEnabled.addEventListener("change", () => {
  analyzeAllFrames();
  render();
});
els.eyedropper.addEventListener("change", () => {
  updateEyedropperState();
  drawSheet();
});
els.chromaColor.addEventListener("input", () => {
  els.chromaHex.value = els.chromaColor.value;
  analyzeAllFrames();
  render();
});
els.chromaHex.addEventListener("input", () => {
  if (/^#[0-9a-fA-F]{6}$/.test(els.chromaHex.value)) {
    els.chromaColor.value = els.chromaHex.value;
    analyzeAllFrames();
    render();
  }
});
els.prev.addEventListener("click", () => stepFrame(-1));
els.next.addEventListener("click", () => stepFrame(1));
els.fitGrid.addEventListener("click", () => {
  fitGridToImage();
  analyzeAllFrames();
  render();
});
els.play.addEventListener("click", togglePlay);
els.download.addEventListener("click", downloadCurrentFrame);
els.exportGif.addEventListener("click", exportAlignedGif);
els.exportSheet.addEventListener("click", exportAlignedSpriteSheet);
els.analyze.addEventListener("click", () => {
  analyzeAllFrames();
  render();
});
els.nudgeUp.addEventListener("click", () => adjustNudge(0, -1));
els.nudgeDown.addEventListener("click", () => adjustNudge(0, 1));
els.nudgeLeft.addEventListener("click", () => adjustNudge(-1, 0));
els.nudgeRight.addEventListener("click", () => adjustNudge(1, 0));
els.nudgeReset.addEventListener("click", () => {
  setCurrentNudge(0, 0);
  render();
});
els.exportConfig.addEventListener("click", exportConfig);
els.importConfig.addEventListener("change", (event) => importConfig(event.target.files[0]));

window.addEventListener("resize", drawSheet);
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement || event.target instanceof HTMLSelectElement) return;
  if (event.key === "ArrowLeft") stepFrame(-1);
  if (event.key === "ArrowRight") stepFrame(1);
  if (event.key === "w" || event.key === "W") adjustNudge(0, -1);
  if (event.key === "s" || event.key === "S") adjustNudge(0, 1);
  if (event.key === "a" || event.key === "A") adjustNudge(-1, 0);
  if (event.key === "d" || event.key === "D") adjustNudge(1, 0);
  if (event.key === " ") {
    event.preventDefault();
    togglePlay();
  }
});

updateEyedropperState();
render();
