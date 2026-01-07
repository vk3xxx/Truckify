import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, Modal, TextInput } from 'react-native';
import { useState, useRef } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import { documentService } from '../../src/services/documents';
import { t } from '../../src/services/i18n';

export default function DeliveryComplete() {
  const { jobId } = useLocalSearchParams<{ jobId: string }>();
  const [photoUri, setPhotoUri] = useState<string | null>(null);
  const [signaturePoints, setSignaturePoints] = useState<{ x: number; y: number }[]>([]);
  const [recipientName, setRecipientName] = useState('');
  const [notes, setNotes] = useState('');
  const [showSignature, setShowSignature] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const takePhoto = async () => {
    const uri = await documentService.pickImage(true);
    if (uri) setPhotoUri(uri);
  };

  const handleSubmit = async () => {
    if (!photoUri) {
      Alert.alert(t('error'), 'Please take a photo of the delivery');
      return;
    }
    if (!recipientName.trim()) {
      Alert.alert(t('error'), 'Please enter recipient name');
      return;
    }

    setSubmitting(true);
    // Upload photo as POD
    await documentService.uploadDocument(photoUri, 'pod', jobId);
    
    // In real app, would also save signature and complete job via API
    setTimeout(() => {
      setSubmitting(false);
      Alert.alert(t('success'), 'Delivery completed successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backBtn}>‹ Back</Text>
        </TouchableOpacity>
        <Text style={styles.title}>{t('proofOfDelivery')}</Text>
      </View>

      {/* Photo Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📷 Delivery Photo</Text>
        {photoUri ? (
          <View style={styles.photoContainer}>
            <Image source={{ uri: photoUri }} style={styles.photo} />
            <TouchableOpacity style={styles.retakeBtn} onPress={takePhoto}>
              <Text style={styles.retakeBtnText}>Retake</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <TouchableOpacity style={styles.photoPlaceholder} onPress={takePhoto}>
            <Text style={styles.photoIcon}>📷</Text>
            <Text style={styles.photoText}>{t('takePhoto')}</Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Signature Section */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>✍️ {t('signature')}</Text>
        <TouchableOpacity style={styles.signatureBox} onPress={() => setShowSignature(true)}>
          {signaturePoints.length > 0 ? (
            <Text style={styles.signedText}>✓ Signature captured</Text>
          ) : (
            <Text style={styles.signaturePlaceholder}>Tap to capture signature</Text>
          )}
        </TouchableOpacity>
      </View>

      {/* Recipient Name */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>👤 Recipient Name</Text>
        <TextInput
          style={styles.input}
          placeholder="Enter recipient name"
          placeholderTextColor="#6b7280"
          value={recipientName}
          onChangeText={setRecipientName}
        />
      </View>

      {/* Notes */}
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>📝 Notes (Optional)</Text>
        <TextInput
          style={[styles.input, styles.notesInput]}
          placeholder="Any delivery notes..."
          placeholderTextColor="#6b7280"
          value={notes}
          onChangeText={setNotes}
          multiline
        />
      </View>

      {/* Submit Button */}
      <TouchableOpacity
        style={[styles.submitBtn, submitting && styles.submitBtnDisabled]}
        onPress={handleSubmit}
        disabled={submitting}
      >
        <Text style={styles.submitBtnText}>
          {submitting ? t('loading') : t('completeJob')}
        </Text>
      </TouchableOpacity>

      {/* Signature Modal */}
      <Modal visible={showSignature} animationType="slide">
        <View style={styles.signatureModal}>
          <View style={styles.signatureHeader}>
            <TouchableOpacity onPress={() => setShowSignature(false)}>
              <Text style={styles.cancelText}>{t('cancel')}</Text>
            </TouchableOpacity>
            <Text style={styles.signatureTitle}>{t('signature')}</Text>
            <TouchableOpacity onPress={() => setSignaturePoints([])}>
              <Text style={styles.clearText}>{t('clearSignature')}</Text>
            </TouchableOpacity>
          </View>
          <View
            style={styles.signaturePad}
            onTouchMove={(e) => {
              const { locationX, locationY } = e.nativeEvent;
              setSignaturePoints([...signaturePoints, { x: locationX, y: locationY }]);
            }}
          >
            {signaturePoints.length === 0 && (
              <Text style={styles.signatureHint}>Sign here with your finger</Text>
            )}
            {/* Simple dot visualization */}
            {signaturePoints.map((point, i) => (
              <View
                key={i}
                style={[styles.signatureDot, { left: point.x - 2, top: point.y - 2 }]}
              />
            ))}
          </View>
          <TouchableOpacity
            style={styles.doneBtn}
            onPress={() => setShowSignature(false)}
          >
            <Text style={styles.doneBtnText}>{t('confirm')}</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { flexDirection: 'row', alignItems: 'center', padding: 20, paddingTop: 60, gap: 16 },
  backBtn: { color: '#3b82f6', fontSize: 24 },
  title: { color: '#fff', fontSize: 20, fontWeight: 'bold' },
  section: { paddingHorizontal: 20, marginBottom: 20 },
  sectionTitle: { color: '#fff', fontSize: 16, fontWeight: '600', marginBottom: 12 },
  photoPlaceholder: { backgroundColor: '#1f2937', borderRadius: 12, padding: 40, alignItems: 'center', borderWidth: 2, borderColor: '#374151', borderStyle: 'dashed' },
  photoIcon: { fontSize: 48 },
  photoText: { color: '#9ca3af', marginTop: 8 },
  photoContainer: { position: 'relative' },
  photo: { width: '100%', height: 200, borderRadius: 12 },
  retakeBtn: { position: 'absolute', bottom: 12, right: 12, backgroundColor: 'rgba(0,0,0,0.7)', paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  retakeBtnText: { color: '#fff' },
  signatureBox: { backgroundColor: '#1f2937', borderRadius: 12, padding: 24, alignItems: 'center', borderWidth: 1, borderColor: '#374151' },
  signaturePlaceholder: { color: '#6b7280' },
  signedText: { color: '#22c55e', fontWeight: '600' },
  input: { backgroundColor: '#1f2937', borderRadius: 12, padding: 16, color: '#fff', fontSize: 16 },
  notesInput: { height: 80, textAlignVertical: 'top' },
  submitBtn: { backgroundColor: '#22c55e', marginHorizontal: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
  submitBtnDisabled: { opacity: 0.6 },
  submitBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  signatureModal: { flex: 1, backgroundColor: '#111827' },
  signatureHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, paddingTop: 60 },
  cancelText: { color: '#ef4444', fontSize: 16 },
  signatureTitle: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
  clearText: { color: '#3b82f6', fontSize: 16 },
  signaturePad: { flex: 1, backgroundColor: '#fff', margin: 20, borderRadius: 12, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  signatureHint: { color: '#9ca3af', fontSize: 18 },
  signatureDot: { position: 'absolute', width: 4, height: 4, backgroundColor: '#000', borderRadius: 2 },
  doneBtn: { backgroundColor: '#3b82f6', margin: 20, padding: 16, borderRadius: 12, alignItems: 'center' },
  doneBtnText: { color: '#fff', fontSize: 18, fontWeight: 'bold' },
});
