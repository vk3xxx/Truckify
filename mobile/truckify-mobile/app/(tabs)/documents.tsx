import { View, Text, StyleSheet, FlatList, TouchableOpacity, Image, Alert, Modal } from 'react-native';
import { useState, useEffect } from 'react';
import { documentService, Document, DocType } from '../../src/services/documents';
import { t } from '../../src/services/i18n';

const DOC_TYPES: { type: DocType; icon: string }[] = [
  { type: 'license', icon: '🪪' },
  { type: 'insurance', icon: '📋' },
  { type: 'registration', icon: '🚛' },
];

// Mock data
const MOCK_DOCS: Document[] = [
  { id: '1', type: 'license', name: 'Driver License.pdf', uri: '', uploadedAt: '2025-12-01', expiresAt: '2027-12-01', status: 'verified' },
  { id: '2', type: 'insurance', name: 'Insurance Certificate.pdf', uri: '', uploadedAt: '2025-11-15', expiresAt: '2026-11-15', status: 'verified' },
  { id: '3', type: 'registration', name: 'Vehicle Rego.pdf', uri: '', uploadedAt: '2025-10-20', expiresAt: '2026-06-01', status: 'pending' },
];

export default function Documents() {
  const [documents, setDocuments] = useState<Document[]>(MOCK_DOCS);
  const [showUpload, setShowUpload] = useState(false);
  const [selectedType, setSelectedType] = useState<DocType | null>(null);

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'verified': return '#22c55e';
      case 'pending': return '#f59e0b';
      case 'rejected': return '#ef4444';
      case 'expired': return '#6b7280';
      default: return '#6b7280';
    }
  };

  const handleUpload = async (useCamera: boolean) => {
    if (!selectedType) return;
    const uri = await documentService.pickImage(useCamera);
    if (uri) {
      const newDoc: Document = {
        id: Date.now().toString(),
        type: selectedType,
        name: `${selectedType}_${Date.now()}.jpg`,
        uri,
        uploadedAt: new Date().toISOString().split('T')[0],
        status: 'pending',
      };
      setDocuments([...documents, newDoc]);
      setShowUpload(false);
      setSelectedType(null);
      Alert.alert(t('success'), 'Document uploaded successfully');
    }
  };

  const handleDelete = (id: string) => {
    Alert.alert(t('confirm'), 'Delete this document?', [
      { text: t('cancel'), style: 'cancel' },
      { text: t('delete'), style: 'destructive', onPress: () => setDocuments(documents.filter(d => d.id !== id)) },
    ]);
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('documents')}</Text>
      </View>

      {/* Document Types */}
      <View style={styles.typeRow}>
        {DOC_TYPES.map(({ type, icon }) => (
          <TouchableOpacity
            key={type}
            style={styles.typeCard}
            onPress={() => { setSelectedType(type); setShowUpload(true); }}
          >
            <Text style={styles.typeIcon}>{icon}</Text>
            <Text style={styles.typeLabel}>{t(type)}</Text>
            <Text style={styles.addIcon}>+</Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Document List */}
      <FlatList
        data={documents}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity style={styles.docItem} onLongPress={() => handleDelete(item.id)}>
            <View style={styles.docIcon}>
              <Text style={{ fontSize: 24 }}>{item.type === 'license' ? '🪪' : item.type === 'insurance' ? '📋' : '🚛'}</Text>
            </View>
            <View style={styles.docInfo}>
              <Text style={styles.docName}>{item.name}</Text>
              <Text style={styles.docMeta}>Uploaded: {item.uploadedAt}</Text>
              {item.expiresAt && <Text style={styles.docMeta}>Expires: {item.expiresAt}</Text>}
            </View>
            <View style={[styles.statusBadge, { backgroundColor: getStatusColor(item.status) }]}>
              <Text style={styles.statusText}>{t(item.status)}</Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={<Text style={styles.empty}>No documents uploaded</Text>}
      />

      {/* Upload Modal */}
      <Modal visible={showUpload} transparent animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>{t('uploadDocument')}</Text>
            <TouchableOpacity style={styles.modalBtn} onPress={() => handleUpload(true)}>
              <Text style={styles.modalBtnIcon}>📷</Text>
              <Text style={styles.modalBtnText}>{t('takePhoto')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.modalBtn} onPress={() => handleUpload(false)}>
              <Text style={styles.modalBtnIcon}>🖼️</Text>
              <Text style={styles.modalBtnText}>{t('chooseFromLibrary')}</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setShowUpload(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  typeRow: { flexDirection: 'row', padding: 16, gap: 12 },
  typeCard: { flex: 1, backgroundColor: '#1f2937', borderRadius: 12, padding: 16, alignItems: 'center' },
  typeIcon: { fontSize: 32 },
  typeLabel: { color: '#9ca3af', fontSize: 12, marginTop: 8, textAlign: 'center' },
  addIcon: { position: 'absolute', top: 8, right: 8, color: '#3b82f6', fontSize: 20, fontWeight: 'bold' },
  docItem: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#1f2937', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16 },
  docIcon: { width: 48, height: 48, borderRadius: 8, backgroundColor: '#374151', alignItems: 'center', justifyContent: 'center' },
  docInfo: { flex: 1, marginLeft: 12 },
  docName: { color: '#fff', fontSize: 16, fontWeight: '600' },
  docMeta: { color: '#6b7280', fontSize: 12, marginTop: 2 },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'flex-end' },
  modalContent: { backgroundColor: '#1f2937', borderTopLeftRadius: 20, borderTopRightRadius: 20, padding: 24 },
  modalTitle: { color: '#fff', fontSize: 20, fontWeight: 'bold', textAlign: 'center', marginBottom: 20 },
  modalBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#374151', padding: 16, borderRadius: 12, marginBottom: 12 },
  modalBtnIcon: { fontSize: 24, marginRight: 12 },
  modalBtnText: { color: '#fff', fontSize: 16 },
  cancelBtn: { padding: 16, alignItems: 'center' },
  cancelText: { color: '#6b7280', fontSize: 16 },
});
