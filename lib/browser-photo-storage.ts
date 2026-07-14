import type {Photo} from '@/types/rams';

export const PHOTO_UPLOAD_ERROR = 'This image could not be added. Please use a JPEG, PNG or WebP image under the permitted size.';
export const MAX_PHOTOS = 20;
export const MAX_IMAGE_BYTES = 12 * 1024 * 1024;
export const MAX_TOTAL_IMAGE_BYTES = 80 * 1024 * 1024;
export const PHOTO_DB_NAME = 'solarfx-rams-photos';
export const PHOTO_STORE_NAME = 'photos';
const MAX_LONG_EDGE = 1800;
const JPEG_QUALITY = 0.82;
const WEBP_QUALITY = 0.82;

type StoredPhotoBlob = {blob: Blob; mimeType: string; filename: string; size: number};

const isBrowser = () => typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
const isSupportedType = (type: string) => ['image/jpeg', 'image/png', 'image/webp'].includes(type);

function quotaMessage(error: unknown) {
  const name = error instanceof DOMException ? error.name : '';
  return name === 'QuotaExceededError' || name === 'NS_ERROR_DOM_QUOTA_REACHED';
}

function openPhotoDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!isBrowser()) {
      reject(new Error('IndexedDB unavailable'));
      return;
    }
    const request = indexedDB.open(PHOTO_DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(PHOTO_STORE_NAME)) db.createObjectStore(PHOTO_STORE_NAME);
    };
    request.onerror = () => reject(request.error || new Error('IndexedDB open failed'));
    request.onsuccess = () => resolve(request.result);
  });
}

function withStore<T>(mode: IDBTransactionMode, run: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  return openPhotoDb().then(db => new Promise<T>((resolve, reject) => {
    const tx = db.transaction(PHOTO_STORE_NAME, mode);
    const store = tx.objectStore(PHOTO_STORE_NAME);
    const request = run(store);
    request.onerror = () => reject(request.error || new Error('IndexedDB request failed'));
    request.onsuccess = () => resolve(request.result);
    tx.oncomplete = () => db.close();
    tx.onerror = () => {
      db.close();
      reject(tx.error || new Error('IndexedDB transaction failed'));
    };
  }));
}

export async function storePhotoBlob(storageRef: string, blob: Blob, filename: string): Promise<void> {
  await withStore('readwrite', store => store.put({blob, mimeType: blob.type, filename, size: blob.size}, storageRef));
}

export async function getPhotoBlob(storageRef?: string): Promise<Blob | null> {
  if (!storageRef) return null;
  try {
    const record = await withStore<StoredPhotoBlob | undefined>('readonly', store => store.get(storageRef));
    return record?.blob || null;
  } catch {
    return null;
  }
}

export async function deletePhotoBlob(storageRef?: string): Promise<void> {
  if (!storageRef) return;
  try {
    await withStore('readwrite', store => store.delete(storageRef));
  } catch {
    // Deleting previews is best effort; never crash the RAMS draft.
  }
}

export function dataUrlToBlob(dataUrl: string): Blob {
  const [header, payload] = dataUrl.split(',');
  if (!header || !payload) throw new Error('Invalid image data');
  const mimeType = /data:([^;]+)/.exec(header)?.[1] || 'image/jpeg';
  if (!isSupportedType(mimeType)) throw new Error('Unsupported image type');
  const binary = atob(payload);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i += 1) bytes[i] = binary.charCodeAt(i);
  return new Blob([bytes], {type: mimeType});
}

async function blobToImage(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  try {
    return await new Promise((resolve, reject) => {
      const image = new Image();
      image.onload = () => resolve(image);
      image.onerror = () => reject(new Error('Image decode failed'));
      image.src = url;
    });
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function compressImage(file: File | Blob, preferredType?: string): Promise<Blob> {
  const sourceType = preferredType || file.type || 'image/jpeg';
  if (!isSupportedType(sourceType)) throw new Error('Unsupported image type');
  if ('size' in file && file.size > MAX_IMAGE_BYTES) throw new Error('Image too large');
  const image = await blobToImage(file);
  const scale = Math.min(1, MAX_LONG_EDGE / Math.max(image.width, image.height));
  const width = Math.max(1, Math.round(image.width * scale));
  const height = Math.max(1, Math.round(image.height * scale));
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) throw new Error('Image compression unavailable');
  ctx.drawImage(image, 0, 0, width, height);
  const outputType = sourceType === 'image/png' ? 'image/jpeg' : sourceType;
  return await new Promise((resolve, reject) => {
    canvas.toBlob(blob => blob ? resolve(blob) : reject(new Error('Image compression failed')), outputType, outputType === 'image/webp' ? WEBP_QUALITY : JPEG_QUALITY);
  });
}

export async function createStoredPhoto(file: File, id: string): Promise<Photo> {
  if (!isSupportedType(file.type) || file.size > MAX_IMAGE_BYTES) throw new Error(PHOTO_UPLOAD_ERROR);
  const blob = await compressImage(file, file.type);
  const storageRef = 'photo-' + id;
  await storePhotoBlob(storageRef, blob, file.name);
  return {
    id,
    name: file.name,
    filename: file.name,
    mimeType: blob.type || file.type,
    size: blob.size,
    storageRef,
    category: 'Potential hazard',
    caption: '',
    includeInPdf: false,
    surveyorNotes: '',
    aiObservation: '',
    confirmedHazard: '',
    confirmedControls: '',
    assessorDecision: '',
    takenAt: new Date().toISOString(),
    originalFilename: file.name
  };
}

export async function migrateLegacyPhoto(photo: Photo): Promise<Photo | null> {
  if (photo.storageRef) return {...photo, dataUrl: undefined};
  if (!photo.dataUrl) return photo;
  const blob = await compressImage(dataUrlToBlob(photo.dataUrl));
  const storageRef = 'photo-' + photo.id;
  await storePhotoBlob(storageRef, blob, photo.originalFilename || photo.name || 'Site photo');
  return {
    ...photo,
    filename: photo.filename || photo.originalFilename || photo.name,
    mimeType: blob.type,
    size: blob.size,
    storageRef,
    dataUrl: undefined
  };
}

export function isQuotaError(error: unknown) {
  return quotaMessage(error);
}

export function photoUploadLimitMessage() {
  return PHOTO_UPLOAD_ERROR;
}
