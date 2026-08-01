import { describe, it, expect } from 'vitest';
import { validateFile, verifyImageSignature } from '../services/media';

describe('Media Validation Service', () => {
  describe('File Validation', () => {
    it('should validate allowed formats under size limits', () => {
      const mockFile = new File([''], 'portrait.png', { type: 'image/png' });
      // Stub size property
      Object.defineProperty(mockFile, 'size', { value: 100 * 1024 }); // 100KB

      const result = validateFile(mockFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });

    it('should reject files exceeding 15MB size ceiling', () => {
      const mockFile = new File([''], 'huge_map.jpg', { type: 'image/jpeg' });
      Object.defineProperty(mockFile, 'size', { value: 16 * 1024 * 1024 }); // 16MB

      const result = validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('maximum size of 15MB');
    });

    it('should reject unallowed format extension/types', () => {
      const mockFile = new File([''], 'malicious.exe', { type: 'application/x-msdownload' });
      Object.defineProperty(mockFile, 'size', { value: 50 * 1024 });

      const result = validateFile(mockFile);
      expect(result.valid).toBe(false);
      expect(result.error).toContain('is not supported');
    });

    it('should accept PDF files', () => {
      const mockFile = new File([''], 'character_sheet.pdf', { type: 'application/pdf' });
      Object.defineProperty(mockFile, 'size', { value: 500 * 1024 }); // 500KB

      const result = validateFile(mockFile);
      expect(result.valid).toBe(true);
      expect(result.error).toBeUndefined();
    });
  });

  describe('verifyImageSignature', () => {
    it('should accept valid PNG header signatures', async () => {
      // PNG header bytes: 89 50 4E 47
      const binaryData = new Uint8Array([0x89, 0x50, 0x4E, 0x47, 0x00, 0x00, 0x00, 0x00]);
      const mockFile = new File([binaryData], 'hero.png', { type: 'image/png' });

      const result = await verifyImageSignature(mockFile);
      expect(result).toBe(true);
    });

    it('should accept valid JPEG header signatures', async () => {
      // JPEG header bytes: FF D8 FF
      const binaryData = new Uint8Array([0xFF, 0xD8, 0xFF, 0xE0, 0x00, 0x00, 0x00, 0x00]);
      const mockFile = new File([binaryData], 'scenery.jpg', { type: 'image/jpeg' });

      const result = await verifyImageSignature(mockFile);
      expect(result).toBe(true);
    });

    it('should reject spoofed extension signature headers', async () => {
      // Spoofed text file disguised as PNG
      const textData = new TextEncoder().encode('This is a text document spoofing a PNG file');
      const mockFile = new File([textData], 'fake.png', { type: 'image/png' });

      const result = await verifyImageSignature(mockFile);
      expect(result).toBe(false);
    });

    it('should bypass signature inspection for SVG files safely', async () => {
      const mockFile = new File(['<svg></svg>'], 'token.svg', { type: 'image/svg+xml' });
      const result = await verifyImageSignature(mockFile);
      expect(result).toBe(true);
    });
  });
});