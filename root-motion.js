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
};

const ctx = els.canvas.getContext("2d");

let animationData = null;
let spriteImage = null;
let currentFrame = 0;
let manualImageUrl = "";

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
  const anchor = animationData.anchor || {};
  const anchorX = Number(anchor.x ?? rect.width / 2) * scale;
  const anchorY = Number(anchor.y ?? rect.height) * scale;
  const drawX = originX - anchorX + offset.x * scale;
  const drawY = groundY - anchorY + offset.y * scale;

  ctx.imageSmoothingEnabled = false;
  ctx.drawImage(spriteImage, rect.x, rect.y, rect.width, rect.height, drawX, drawY, drawWidth, drawHeight);

  ctx.strokeStyle = "rgba(255, 209, 102, 0.9)";
  ctx.beginPath();
  ctx.moveTo(originX - 9, groundY);
  ctx.lineTo(originX + 9, groundY);
  ctx.moveTo(originX, groundY - 9);
  ctx.lineTo(originX, groundY + 9);
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
  els.rootX.value = "0";
  els.rootY.value = "0";
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
window.addEventListener("resize", drawStage);

updateStats();
drawStage();
