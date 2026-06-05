const els = {
  canvas: document.getElementById("rootCanvas"),
  emptyState: document.getElementById("emptyState"),
  motionMeta: document.getElementById("motionMeta"),
  animationInput: document.getElementById("animationInput"),
  imageInput: document.getElementById("imageInput"),
  imageHint: document.getElementById("imageHint"),
  animationId: document.getElementById("animationIdStat"),
  imageUrl: document.getElementById("imageUrlStat"),
  frameCount: document.getElementById("frameCountStat"),
  frameSize: document.getElementById("frameSizeStat"),
  frameSlider: document.getElementById("frameSlider"),
  frameLabel: document.getElementById("frameLabel"),
  rootX: document.getElementById("rootXInput"),
  rootY: document.getElementById("rootYInput"),
  copyPrevious: document.getElementById("copyPreviousButton"),
  linearFill: document.getElementById("linearFillButton"),
  exportRootMotion: document.getElementById("exportRootMotionButton"),
};

const ctx = els.canvas.getContext("2d");

let animationData = null;
let spriteImage = null;
let currentFrame = 0;
let manualImageUrl = "";
let rootFrames = [];
let draggingRoot = false;
let stageView = { originX: 0, groundY: 0, scale: 1 };

function readFileAsText(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
    reader.readAsText(file);
  });
}

function loadImage(url) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error(`Could not load image: ${url}`));
    image.src = url;
  });
}

function loadImageFile(file) {
  return new Promise((resolve, reject) => {
    if (!file || !file.type.startsWith("image/")) {
      reject(new Error("Please select a sprite sheet image."));
      return;
    }
    const objectUrl = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => resolve({ image, objectUrl });
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not load selected image: ${file.name}`));
    };
    image.src = objectUrl;
  });
}

function resolveImageUrl(imageUrl) {
  if (!imageUrl) return "";
  if (/^(https?:)?\/\//.test(imageUrl) || imageUrl.startsWith("data:")) return imageUrl;
  return new URL(imageUrl, document.baseURI).href;
}

function getFrameCount(data) {
  return Math.max(1, Number(data.playback?.frameCount || data.frames?.length || 1));
}

function getSourceFrameIndex(localFrame) {
  return Number(animationData.playback?.startFrame || 0) + localFrame;
}

function initializeRootFrames() {
  const count = animationData ? getFrameCount(animationData) : 0;
  rootFrames = Array.from({ length: count }, (_, localFrame) => ({
    frame: getSourceFrameIndex(localFrame),
    rootX: 0,
    rootY: 0,
  }));
}

function getCurrentRootFrame() {
  return rootFrames[currentFrame] || { frame: getSourceFrameIndex(currentFrame), rootX: 0, rootY: 0 };
}

function setCurrentRootFrame(rootX, rootY) {
  if (!animationData || currentFrame === 0) return;
  rootFrames[currentFrame] = {
    frame: getSourceFrameIndex(currentFrame),
    rootX: Number(rootX) || 0,
    rootY: Number(rootY) || 0,
  };
}

function refreshEditor() {
  updateStats();
  drawStage();
}

function copyPreviousRoot() {
  if (!animationData || currentFrame === 0) return;
  const previous = rootFrames[currentFrame - 1] || { rootX: 0, rootY: 0 };
  setCurrentRootFrame(previous.rootX, previous.rootY);
  refreshEditor();
}

function linearFillToCurrent() {
  if (!animationData || currentFrame === 0) return;
  const target = getCurrentRootFrame();
  for (let index = 1; index <= currentFrame; index += 1) {
    const t = index / currentFrame;
    rootFrames[index] = {
      frame: getSourceFrameIndex(index),
      rootX: Number((target.rootX * t).toFixed(3)),
      rootY: Number((target.rootY * t).toFixed(3)),
    };
  }
  refreshEditor();
}

function canvasPointFromEvent(event) {
  const rect = els.canvas.getBoundingClientRect();
  const scaleX = els.canvas.width / rect.width;
  const scaleY = els.canvas.height / rect.height;
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  };
}

function setRootFromCanvasPoint(point) {
  if (!animationData || currentFrame === 0) return;
  const rootX = Math.round((point.x - stageView.originX) / stageView.scale);
  const rootY = Math.round((point.y - stageView.groundY) / stageView.scale);
  setCurrentRootFrame(rootX, rootY);
  refreshEditor();
}

function nudgeCurrentRoot(dx, dy) {
  if (!animationData || currentFrame === 0) return;
  const root = getCurrentRootFrame();
  setCurrentRootFrame(root.rootX + dx, root.rootY + dy);
  refreshEditor();
}

function toAssetId(value) {
  const normalized = String(value || "")
    .trim()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-zA-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .toLowerCase();
  return normalized || "root_motion";
}

function buildRootMotionV1() {
  if (!animationData) throw new Error("Import animation JSON before exporting root motion.");
  const last = rootFrames[rootFrames.length - 1] || { rootX: 0, rootY: 0 };
  const rootMotionId = `${toAssetId(animationData.animationId)}_root`;
  return {
    schema: "anip.rootMotion.v1",
    rootMotionId,
    animationId: animationData.animationId,
    displayName: `${animationData.displayName || animationData.animationId} Root Motion`,
    sourceTool: {
      name: "RootMotionTool",
      version: 1,
    },
    coordinateSystem: "platformer-side-v1",
    originFrame: 0,
    loop: {
      accumulate: true,
      cycleOffsetX: Number(last.rootX || 0),
      cycleOffsetY: Number(last.rootY || 0),
    },
    frames: rootFrames.map((frame, index) => ({
      frame: frame.frame,
      rootX: index === 0 ? 0 : Number(frame.rootX || 0),
      rootY: index === 0 ? 0 : Number(frame.rootY || 0),
    })),
    metadata: {
      tags: [],
      notes: "",
    },
  };
}

function downloadJson(data, filename) {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
  const link = document.createElement("a");
  link.download = filename;
  link.href = URL.createObjectURL(blob);
  link.click();
  URL.revokeObjectURL(link.href);
}

function getFrameRect(sourceFrame) {
  const sheet = animationData.sheet || {};
  const columns = Math.max(1, Number(sheet.columns || 1));
  const frameWidth = Math.max(1, Number(sheet.frameWidth || spriteImage?.width || 1));
  const frameHeight = Math.max(1, Number(sheet.frameHeight || spriteImage?.height || 1));
  const spacingX = Number(sheet.spacingX || 0);
  const spacingY = Number(sheet.spacingY || 0);
  const offsetX = Number(sheet.offsetX || 0);
  const offsetY = Number(sheet.offsetY || 0);
  const col = sourceFrame % columns;
  const row = Math.floor(sourceFrame / columns);

  return {
    x: offsetX + col * (frameWidth + spacingX),
    y: offsetY + row * (frameHeight + spacingY),
    width: frameWidth,
    height: frameHeight,
  };
}

function getFrameVisualOffset(sourceFrame) {
  const frame = animationData.frames?.find((item) => Number(item.frame) === sourceFrame);
  return {
    x: Number(frame?.offsetX || 0),
    y: Number(frame?.offsetY || 0),
  };
}

function getAnchorPoint(rect) {
  const anchor = animationData.anchor || {};
  const mode = anchor.mode || "bottom-center";
  const hasResolvedPoint = Number.isFinite(Number(anchor.x)) && Number.isFinite(Number(anchor.y));

  if (hasResolvedPoint && (mode === "manual" || anchor.resolved)) {
    return {
      x: Number(anchor.x),
      y: Number(anchor.y),
    };
  }

  if (mode === "cell" || mode === "center") {
    return {
      x: rect.width / 2,
      y: rect.height / 2,
    };
  }

  return {
    x: rect.width / 2,
    y: rect.height,
  };
}

function resizeCanvasToDisplaySize() {
  const rect = els.canvas.getBoundingClientRect();
  const ratio = window.devicePixelRatio || 1;
  const width = Math.max(1, Math.floor(rect.width * ratio));
  const height = Math.max(1, Math.floor(rect.height * ratio));
  if (els.canvas.width !== width || els.canvas.height !== height) {
    els.canvas.width = width;
    els.canvas.height = height;
  }
}

function drawStage() {
  resizeCanvasToDisplaySize();
  const width = els.canvas.width;
  const height = els.canvas.height;
  ctx.clearRect(0, 0, width, height);
  ctx.fillStyle = "#07080b";
  ctx.fillRect(0, 0, width, height);

  const groundY = Math.round(height * 0.72);
  const originX = Math.round(width * 0.5);
  ctx.strokeStyle = "rgba(255, 255, 255, 0.14)";
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(0, groundY + 0.5);
  ctx.lineTo(width, groundY + 0.5);
  ctx.stroke();

  ctx.strokeStyle = "rgba(79, 183, 255, 0.45)";
  ctx.beginPath();
  ctx.moveTo(originX + 0.5, 0);
  ctx.lineTo(originX + 0.5, height);
  ctx.stroke();

  ctx.fillStyle = "rgba(79, 183, 255, 0.9)";
  ctx.fillRect(originX - 3, groundY - 3, 6, 6);

  if (!animationData || !spriteImage) return;

  const sourceFrame = getSourceFrameIndex(currentFrame);
  const rect = getFrameRect(sourceFrame);
  const offset = getFrameVisualOffset(sourceFrame);
  const scale = Math.min((width * 0.42) / rect.width, (height * 0.58) / rect.height, 4);
  const drawWidth = rect.width * scale;
  const drawHeight = rect.height * scale;
  const anchor = getAnchorPoint(rect);
  const anchorX = anchor.x * scale;
  const anchorY = anchor.y * scale;
  const root = getCurrentRootFrame();
  const rootX = root.rootX * scale;
  const rootY = root.rootY * scale;
  stageView = { originX, groundY, scale };
  const drawX = originX + rootX - anchorX + offset.x * scale;
  const drawY = groundY + rootY - anchorY + offset.y * scale;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spriteImage, rect.x, rect.y, rect.width, rect.height, drawX, drawY, drawWidth, drawHeight);

  ctx.strokeStyle = "rgba(255, 209, 102, 0.9)";
  ctx.beginPath();
  ctx.moveTo(originX - 9, groundY);
  ctx.lineTo(originX + 9, groundY);
  ctx.moveTo(originX, groundY - 9);
  ctx.lineTo(originX, groundY + 9);
  ctx.stroke();

  ctx.strokeStyle = "rgba(255, 107, 107, 0.9)";
  ctx.beginPath();
  ctx.moveTo(originX + rootX - 7, groundY + rootY);
  ctx.lineTo(originX + rootX + 7, groundY + rootY);
  ctx.moveTo(originX + rootX, groundY + rootY - 7);
  ctx.lineTo(originX + rootX, groundY + rootY + 7);
  ctx.stroke();
}

function updateStats() {
  const frameCount = animationData ? getFrameCount(animationData) : 1;
  const sheet = animationData?.sheet || {};
  els.animationId.textContent = animationData?.animationId || "-";
  els.imageUrl.textContent = manualImageUrl || animationData?.imageUrl || "-";
  els.frameCount.textContent = animationData ? String(frameCount) : "-";
  els.frameSize.textContent = animationData ? `${sheet.frameWidth || "-"} x ${sheet.frameHeight || "-"}` : "-";
  els.frameSlider.max = String(Math.max(0, frameCount - 1));
  els.frameSlider.value = String(currentFrame);
  els.frameLabel.textContent = `${currentFrame} / ${Math.max(0, frameCount - 1)}`;
  const root = getCurrentRootFrame();
  els.rootX.value = String(root.rootX);
  els.rootY.value = String(root.rootY);
  els.rootX.disabled = !animationData || currentFrame === 0;
  els.rootY.disabled = !animationData || currentFrame === 0;
  els.copyPrevious.disabled = !animationData || currentFrame === 0;
  els.linearFill.disabled = !animationData || currentFrame === 0;
  els.exportRootMotion.disabled = !animationData;
  els.emptyState.style.display = animationData ? "none" : "";
}

function setCurrentFrame(frame) {
  if (!animationData) return;
  currentFrame = Math.max(0, Math.min(getFrameCount(animationData) - 1, Number(frame) || 0));
  updateStats();
  drawStage();
}

async function importAnimation(file) {
  if (!file) return;
  const raw = await readFileAsText(file);
  const data = JSON.parse(raw);
  if (data.schema !== "anip.animation.v1") {
    throw new Error("Unsupported animation schema. Expected anip.animation.v1.");
  }

  animationData = data;
  spriteImage = null;
  manualImageUrl = "";
  currentFrame = 0;
  initializeRootFrames();
  els.motionMeta.textContent = `${data.displayName || data.animationId} loaded`;
  updateStats();
  drawStage();

  try {
    spriteImage = await loadImage(resolveImageUrl(data.imageUrl));
    els.motionMeta.textContent = `${data.displayName || data.animationId} loaded`;
    els.imageHint.textContent = "Sprite sheet loaded from imageUrl.";
  } catch (error) {
    console.warn(error);
    els.motionMeta.textContent = error.message;
    els.imageHint.textContent = "imageUrl could not be loaded. Import the matching sprite sheet image manually.";
  }

  updateStats();
  drawStage();
}

els.animationInput.addEventListener("change", async (event) => {
  try {
    await importAnimation(event.target.files[0]);
  } catch (error) {
    console.error(error);
    els.motionMeta.textContent = error.message;
  } finally {
    event.target.value = "";
  }
});

els.imageInput.addEventListener("change", async (event) => {
  try {
    if (!animationData) throw new Error("Import animation JSON before connecting an image.");
    const { image, objectUrl } = await loadImageFile(event.target.files[0]);
    if (manualImageUrl) URL.revokeObjectURL(manualImageUrl);
    spriteImage = image;
    manualImageUrl = objectUrl;
    els.motionMeta.textContent = `${event.target.files[0].name} connected manually`;
    els.imageHint.textContent = "Manual image is used for this preview. The animation JSON imageUrl is unchanged.";
    updateStats();
    drawStage();
  } catch (error) {
    console.error(error);
    els.motionMeta.textContent = error.message;
  } finally {
    event.target.value = "";
  }
});

els.frameSlider.addEventListener("input", () => setCurrentFrame(els.frameSlider.value));
els.rootX.addEventListener("input", () => {
  setCurrentRootFrame(els.rootX.value, els.rootY.value);
  updateStats();
  drawStage();
});
els.rootY.addEventListener("input", () => {
  setCurrentRootFrame(els.rootX.value, els.rootY.value);
  updateStats();
  drawStage();
});
els.copyPrevious.addEventListener("click", copyPreviousRoot);
els.linearFill.addEventListener("click", linearFillToCurrent);
els.exportRootMotion.addEventListener("click", () => {
  try {
    const data = buildRootMotionV1();
    downloadJson(data, `${data.rootMotionId}.root-motion.json`);
    els.motionMeta.textContent = `${data.rootMotionId}.root-motion.json exported`;
  } catch (error) {
    console.error(error);
    els.motionMeta.textContent = error.message;
  }
});
els.canvas.addEventListener("pointerdown", (event) => {
  if (!animationData || currentFrame === 0) return;
  draggingRoot = true;
  els.canvas.setPointerCapture?.(event.pointerId);
  setRootFromCanvasPoint(canvasPointFromEvent(event));
});
els.canvas.addEventListener("pointermove", (event) => {
  if (!draggingRoot) return;
  setRootFromCanvasPoint(canvasPointFromEvent(event));
});
els.canvas.addEventListener("pointerup", () => {
  draggingRoot = false;
});
els.canvas.addEventListener("pointercancel", () => {
  draggingRoot = false;
});
window.addEventListener("keydown", (event) => {
  if (event.target instanceof HTMLInputElement) return;
  const step = event.shiftKey ? 10 : 1;
  const key = event.key.toLowerCase();
  if (key === "a") nudgeCurrentRoot(-step, 0);
  else if (key === "d") nudgeCurrentRoot(step, 0);
  else if (key === "w") nudgeCurrentRoot(0, -step);
  else if (key === "s") nudgeCurrentRoot(0, step);
  else return;
  event.preventDefault();
});
window.addEventListener("resize", drawStage);

updateStats();
drawStage();
