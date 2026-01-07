import * as ImagePicker from 'expo-image-picker';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { api } from './api';

export type DocType = 'license' | 'insurance' | 'registration' | 'pod' | 'signature' | 'photo';

export interface Document {
  id: string;
  type: DocType;
  name: string;
  uri: string;
  uploadedAt: string;
  expiresAt?: string;
  status: 'pending' | 'verified' | 'rejected' | 'expired';
}

class DocumentService {
  async pickImage(useCamera: boolean = false): Promise<string | null> {
    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) return null;

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ quality: 0.8, base64: true })
      : await ImagePicker.launchImageLibraryAsync({ quality: 0.8, base64: true });

    if (result.canceled) return null;
    return result.assets[0].uri;
  }

  async pickDocument(): Promise<{ uri: string; name: string } | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/pdf', 'image/*'],
      copyToCacheDirectory: true,
    });

    if (result.canceled) return null;
    return { uri: result.assets[0].uri, name: result.assets[0].name };
  }

  async uploadDocument(uri: string, type: DocType, jobId?: string): Promise<Document | null> {
    try {
      const fileInfo = await FileSystem.getInfoAsync(uri);
      if (!fileInfo.exists) return null;

      const formData = new FormData();
      formData.append('file', { uri, type: 'image/jpeg', name: `${type}_${Date.now()}.jpg` } as any);
      formData.append('type', type);
      if (jobId) formData.append('jobId', jobId);

      const response = await api.upload<Document>('/documents/upload', formData);
      return response.data as Document || null;
    } catch (e) {
      console.error('Upload failed:', e);
      return null;
    }
  }

  async getDocuments(type?: DocType): Promise<Document[]> {
    try {
      const params = type ? `?type=${type}` : '';
      const response = await api.get<Document[]>(`/documents${params}`);
      return (response.data as Document[]) || [];
    } catch {
      return [];
    }
  }

  async deleteDocument(id: string): Promise<boolean> {
    try {
      await api.delete(`/documents/${id}`);
      return true;
    } catch {
      return false;
    }
  }
}

export const documentService = new DocumentService();
