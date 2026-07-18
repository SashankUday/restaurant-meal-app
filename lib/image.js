const MAX_FILES = 6;
const MAX_SOURCE_BYTES = 15 * 1024 * 1024;
const MAX_OUTPUT_BYTES = 2 * 1024 * 1024;
const MAX_EDGE = 1600;
const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    const objectUrl = URL.createObjectURL(file);
    image.onload = () => {
      URL.revokeObjectURL(objectUrl);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(objectUrl);
      reject(new Error(`Could not read ${file.name}.`));
    };
    image.src = objectUrl;
  });
}

function canvasBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (blob) resolve(blob);
      else reject(new Error("Could not compress this photo."));
    }, "image/jpeg", quality);
  });
}

export function validatePhotoSelection(files) {
  if (files.length > MAX_FILES) throw new Error(`Add no more than ${MAX_FILES} photos to one meal.`);
  files.forEach((file) => {
    if (!ALLOWED_TYPES.has(file.type)) throw new Error(`${file.name} is not a JPEG, PNG or WebP image.`);
    if (file.size > MAX_SOURCE_BYTES) throw new Error(`${file.name} is larger than 15 MB.`);
  });
}

export async function compressPhoto(file) {
  validatePhotoSelection([file]);
  const image = await loadImage(file);
  const scale = Math.min(1, MAX_EDGE / Math.max(image.naturalWidth, image.naturalHeight));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(image.naturalWidth * scale));
  canvas.height = Math.max(1, Math.round(image.naturalHeight * scale));
  const context = canvas.getContext("2d");
  context.fillStyle = "#fff";
  context.fillRect(0, 0, canvas.width, canvas.height);
  context.drawImage(image, 0, 0, canvas.width, canvas.height);

  let quality = 0.86;
  let blob = await canvasBlob(canvas, quality);
  while (blob.size > MAX_OUTPUT_BYTES && quality > 0.46) {
    quality -= 0.1;
    blob = await canvasBlob(canvas, quality);
  }
  if (blob.size > MAX_OUTPUT_BYTES) throw new Error(`${file.name} could not be compressed below 2 MB.`);

  const baseName = file.name.replace(/\.[^.]+$/, "").replace(/[^a-zA-Z0-9_-]+/g, "-") || "meal";
  return new File([blob], `${baseName}.jpg`, { type: "image/jpeg" });
}
