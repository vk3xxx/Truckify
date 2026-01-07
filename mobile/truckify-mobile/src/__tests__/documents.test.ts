import { documentService, DocType } from '../services/documents';

// Mock expo modules
jest.mock('expo-image-picker', () => ({
  requestCameraPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  requestMediaLibraryPermissionsAsync: jest.fn(() => Promise.resolve({ granted: true })),
  launchCameraAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] })),
  launchImageLibraryAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file://photo.jpg' }] })),
}));

jest.mock('expo-document-picker', () => ({
  getDocumentAsync: jest.fn(() => Promise.resolve({ canceled: false, assets: [{ uri: 'file://doc.pdf', name: 'doc.pdf' }] })),
}));

jest.mock('expo-file-system', () => ({
  getInfoAsync: jest.fn(() => Promise.resolve({ exists: true, size: 1024 })),
}));

jest.mock('../services/api', () => ({
  api: {
    upload: jest.fn(() => Promise.resolve({ data: { id: 'doc-1', status: 'pending' } })),
    get: jest.fn(() => Promise.resolve({ data: [] })),
    delete: jest.fn(() => Promise.resolve({})),
  },
}));

describe('Document Service', () => {
  test('pickImage with camera returns URI', async () => {
    const uri = await documentService.pickImage(true);
    expect(uri).toBe('file://photo.jpg');
  });

  test('pickImage from library returns URI', async () => {
    const uri = await documentService.pickImage(false);
    expect(uri).toBe('file://photo.jpg');
  });

  test('pickImage returns null when permission denied', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.requestCameraPermissionsAsync.mockResolvedValueOnce({ granted: false });

    const uri = await documentService.pickImage(true);
    expect(uri).toBeNull();
  });

  test('pickImage returns null when canceled', async () => {
    const ImagePicker = require('expo-image-picker');
    ImagePicker.launchCameraAsync.mockResolvedValueOnce({ canceled: true });

    const uri = await documentService.pickImage(true);
    expect(uri).toBeNull();
  });

  test('pickDocument returns file info', async () => {
    const result = await documentService.pickDocument();
    expect(result).toEqual({ uri: 'file://doc.pdf', name: 'doc.pdf' });
  });

  test('getDocuments returns array', async () => {
    const docs = await documentService.getDocuments();
    expect(Array.isArray(docs)).toBe(true);
  });

  test('getDocuments with type filter', async () => {
    const { api } = require('../services/api');
    await documentService.getDocuments('license' as DocType);
    expect(api.get).toHaveBeenCalledWith('/documents?type=license');
  });

  test('deleteDocument returns boolean', async () => {
    const result = await documentService.deleteDocument('doc-1');
    expect(typeof result).toBe('boolean');
  });
});
