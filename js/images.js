// Image downscaling before storage.
//
// Field phones produce 4-12 MB captures. Storing them raw would exhaust the
// browser storage quota within one job, which is how offline photo evidence
// gets silently dropped. 1600px / JPEG q0.8 keeps defects legible at roughly
// 300-600 KB per photo.

const MAX_EDGE = 1600;
const QUALITY = 0.8;

/**
 * @param {File|Blob} file
 * @returns {Promise<Blob>} a downscaled JPEG, or the original if decoding fails
 */
export async function compressImage(file) {
  try {
    const bitmap = await loadBitmap(file);
    const scale = Math.min(1, MAX_EDGE / Math.max(bitmap.width, bitmap.height));
    const width = Math.round(bitmap.width * scale);
    const height = Math.round(bitmap.height * scale);

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    canvas.getContext('2d').drawImage(bitmap, 0, 0, width, height);
    bitmap.close?.();

    const blob = await new Promise((resolve) =>
      canvas.toBlob(resolve, 'image/jpeg', QUALITY));
    // If re-encoding somehow made it bigger, keep the original bytes.
    return blob && blob.size < file.size ? blob : file;
  } catch (e) {
    console.warn('Image compression failed, storing original', e);
    return file;
  }
}

function loadBitmap(file) {
  if (window.createImageBitmap) {
    // Honours EXIF orientation where the browser supports it.
    return createImageBitmap(file, { imageOrientation: 'from-image' })
      .catch(() => createImageBitmap(file));
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Could not decode image')); };
    img.src = url;
  });
}

export function formatBytes(bytes) {
  if (!bytes) return '0 B';
  const units = ['B', 'KB', 'MB', 'GB'];
  const i = Math.min(units.length - 1, Math.floor(Math.log(bytes) / Math.log(1024)));
  return `${(bytes / 1024 ** i).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
}
