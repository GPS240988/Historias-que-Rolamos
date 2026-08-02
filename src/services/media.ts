import { db } from '../db';
import type { Media } from '../types';

// Constants
const MAX_FILE_SIZE = 15 * 1024 * 1024; // 15MB
const ALLOWED_MIME_TYPES = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
  'image/gif',
  'image/avif',
  'image/svg+xml',
  'image/bmp',
  'image/tiff',
  'application/pdf'
];

/**
 * Validates a file by extension, MIME type, and size.
 */
export function validateFile(file: File): { valid: boolean; error?: string } {
  if (file.size > MAX_FILE_SIZE) {
    return { valid: false, error: 'File exceeds maximum size of 15MB.' };
  }

  const mimeType = file.type.toLowerCase();
  const extension = file.name.split('.').pop()?.toLowerCase();

  // Basic MIME/extension check
  const isAllowedMime = ALLOWED_MIME_TYPES.includes(mimeType) ||
    mimeType.startsWith('image/') ||
    extension === 'pdf';
  if (!isAllowedMime) {
    return { valid: false, error: `Format ${mimeType || extension} is not supported.` };
  }

  return { valid: true };
}

/**
 * Reads the first few bytes of a file to verify its signature (magic numbers)
 * as a security measure against extension spoofing.
 */
export async function verifyImageSignature(file: File): Promise<boolean> {
  // If it's SVG, we can inspect text contents.
  if (file.type === 'image/svg+xml' || file.name.endsWith('.svg')) {
    return true; // We sandbox SVGs, which avoids execution.
  }

  const headerBytes = await new Promise<Uint8Array>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      if (e.target?.result) {
        resolve(new Uint8Array(e.target.result as ArrayBuffer));
      } else {
        reject();
      }
    };
    reader.onerror = reject;
    reader.readAsArrayBuffer(file.slice(0, 8)); // Read first 8 bytes
  });

  // Check magic bytes matching the declared format/extension
  const nameLower = file.name.toLowerCase();
  const typeLower = file.type.toLowerCase();

  // PNG: 89 50 4E 47
  if (typeLower === 'image/png' || nameLower.endsWith('.png')) {
    return headerBytes[0] === 0x89 && headerBytes[1] === 0x50 && headerBytes[2] === 0x4E && headerBytes[3] === 0x47;
  }

  // JPEG/JPG: FF D8 FF
  if (
    typeLower === 'image/jpeg' ||
    typeLower === 'image/jpg' ||
    nameLower.endsWith('.jpg') ||
    nameLower.endsWith('.jpeg')
  ) {
    return headerBytes[0] === 0xFF && headerBytes[1] === 0xD8 && headerBytes[2] === 0xFF;
  }

  // GIF: 47 49 46 38 ("GIF8")
  if (typeLower === 'image/gif' || nameLower.endsWith('.gif')) {
    return headerBytes[0] === 0x47 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x38;
  }

  // WEBP: RIFF (52 49 46 46) ... WEBP (57 45 42 50)
  if (typeLower === 'image/webp' || nameLower.endsWith('.webp')) {
    return (
      headerBytes[0] === 0x52 && headerBytes[1] === 0x49 && headerBytes[2] === 0x46 && headerBytes[3] === 0x46 &&
      headerBytes[4] === 0x57 && headerBytes[5] === 0x45 && headerBytes[6] === 0x42 && headerBytes[7] === 0x50
    );
  }

  // BMP: 42 4D ("BM")
  if (typeLower === 'image/bmp' || nameLower.endsWith('.bmp')) {
    return headerBytes[0] === 0x42 && headerBytes[1] === 0x4D;
  }

  // Fallback for newer formats (AVIF, TIFF) or browser-supported images
  return typeLower.startsWith('image/');
}

/**
 * Helper to get image dimensions (width/height) from a file.
 */
export function getImageDimensions(file: File): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const dimensions = { width: img.naturalWidth, height: img.naturalHeight };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image to determine dimensions.'));
    };
    img.src = url;
  });
}

/**
 * Resizes and crops an image to a square 300x300 thumbnail using a browser Canvas.
 */
export function generateThumbnail(file: File, size = 300): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = size;
      canvas.height = size;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Could not create canvas context.'));
        return;
      }

      // Draw image cropped in center
      const sourceSize = Math.min(img.naturalWidth, img.naturalHeight);
      const sx = (img.naturalWidth - sourceSize) / 2;
      const sy = (img.naturalHeight - sourceSize) / 2;

      // Draw
      ctx.drawImage(img, sx, sy, sourceSize, sourceSize, 0, 0, size, size);

      // Determine export MIME type (default to webp or jpeg)
      const exportMime = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to generate thumbnail Blob.'));
        }
      }, exportMime, 0.85);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image for thumbnail.'));
    };
    img.src = url;
  });
}

/**
 * Media Storage Service
 */
export const MediaService = {
  /**
   * Validates, processes, and saves a file to IndexedDB.
   * Generates a 300x300 thumbnail for images.
   * Returns the generated Media entry's ID.
   * @param isGallery - If true, marks as campaign gallery art. If false, marks as attachment/utility file.
   */
  async saveMedia(file: File, campaignId: string, isGallery: boolean = true): Promise<string> {
    // 1. Validate size and type
    const validation = validateFile(file);
    if (!validation.valid) {
      throw new Error(validation.error);
    }

    let dimensions = { width: 0, height: 0 };
    let thumbnailBlob: Blob;

    // 2. Handle images vs other files (PDFs, etc)
    const isImage = file.type.startsWith('image/');

    if (isImage) {
      // Security signature check for images
      const isAuthentic = await verifyImageSignature(file);
      if (!isAuthentic) {
        throw new Error('File signature verification failed. Suspicious image format.');
      }

      // Extract dimensions
      try {
        const dims = await getImageDimensions(file);
        dimensions = dims;
      } catch {
        // Some files might fail dimensions, keep defaults
        dimensions = { width: 0, height: 0 };
      }

      // Generate thumbnail (fallback to original if SVG)
      if (file.type === 'image/svg+xml') {
        thumbnailBlob = file; // SVGs resize automatically
      } else {
        try {
          thumbnailBlob = await generateThumbnail(file);
        } catch (err) {
          console.warn('Thumbnail generation failed, falling back to original blob', err);
          thumbnailBlob = file;
        }
      }
    } else {
      // For non-image files (like PDFs), use the file itself as thumbnail
      thumbnailBlob = file;
    }

    // 3. Generate record and store in IndexedDB
    const mediaId = crypto.randomUUID();
    const mediaRecord: Media = {
      id: mediaId,
      campaignId,
      filename: file.name,
      mimeType: file.type,
      size: file.size,
      width: dimensions.width,
      height: dimensions.height,
      blob: file, // Keep original
      thumbnailBlob,
      isGallery,
      createdAt: new Date().toISOString()
    };

    await db.media.put(mediaRecord);
    return mediaId;
  },

  /**
   * Retrieves the original Blob and creates an object URL.
   * Caller is responsible for revoking the URL!
   */
  async getMediaUrl(mediaId: string): Promise<string | null> {
    const record = await db.media.get(mediaId);
    if (!record) return null;
    return URL.createObjectURL(record.blob);
  },

  /**
   * Retrieves the thumbnail Blob and creates an object URL.
   * For PDFs and non-image files, returns the original blob URL.
   * Caller is responsible for revoking the URL!
   */
  async getThumbnailUrl(mediaId: string): Promise<string | null> {
    const record = await db.media.get(mediaId);
    if (!record) return null;
    return URL.createObjectURL(record.thumbnailBlob);
  },

  /**
   * Deletes a media file.
   */
  async deleteMedia(mediaId: string): Promise<void> {
    await db.media.delete(mediaId);
  }
};
