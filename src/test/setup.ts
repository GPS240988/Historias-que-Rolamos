import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Object URLs
if (typeof window !== 'undefined') {
  window.URL.createObjectURL = vi.fn(() => 'mock-object-url');
  window.URL.revokeObjectURL = vi.fn();
}

// Mock crypto UUID generator
if (typeof crypto !== 'undefined') {
  Object.defineProperty(crypto, 'randomUUID', {
    value: vi.fn(() => '11111111-2222-3333-4444-555555555555'),
    writable: true,
    configurable: true
  });
}
