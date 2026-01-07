import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { useState } from 'react';
import { t } from '../../src/services/i18n';

interface Invoice {
  id: string;
  jobId: string;
  description: string;
  amount: number;
  currency: string;
  status: 'paid' | 'unpaid' | 'overdue';
  issuedAt: string;
  dueDate: string;
  paidAt?: string;
}

const MOCK_INVOICES: Invoice[] = [
  { id: 'INV-001', jobId: 'JOB-123', description: 'Melbourne → Sydney Freight', amount: 1250.00, currency: 'AUD', status: 'paid', issuedAt: '2025-12-15', dueDate: '2025-12-30', paidAt: '2025-12-28' },
  { id: 'INV-002', jobId: 'JOB-456', description: 'Brisbane → Gold Coast', amount: 450.00, currency: 'AUD', status: 'paid', issuedAt: '2025-12-20', dueDate: '2026-01-04', paidAt: '2026-01-02' },
  { id: 'INV-003', jobId: 'JOB-789', description: 'Perth → Fremantle Express', amount: 320.00, currency: 'AUD', status: 'unpaid', issuedAt: '2026-01-02', dueDate: '2026-01-17' },
  { id: 'INV-004', jobId: 'JOB-012', description: 'Adelaide → Murray Bridge', amount: 280.00, currency: 'AUD', status: 'overdue', issuedAt: '2025-12-01', dueDate: '2025-12-16' },
];

export default function Invoices() {
  const [filter, setFilter] = useState<'all' | 'paid' | 'unpaid'>('all');
  const invoices = MOCK_INVOICES.filter(inv => filter === 'all' || inv.status === filter || (filter === 'unpaid' && inv.status === 'overdue'));

  const totalPaid = MOCK_INVOICES.filter(i => i.status === 'paid').reduce((sum, i) => sum + i.amount, 0);
  const totalUnpaid = MOCK_INVOICES.filter(i => i.status !== 'paid').reduce((sum, i) => sum + i.amount, 0);

  const getStatusStyle = (status: string) => {
    switch (status) {
      case 'paid': return { bg: '#065f46', text: '#a7f3d0' };
      case 'unpaid': return { bg: '#92400e', text: '#fde68a' };
      case 'overdue': return { bg: '#991b1b', text: '#fecaca' };
      default: return { bg: '#374151', text: '#9ca3af' };
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.title}>{t('invoices')}</Text>
      </View>

      {/* Summary Cards */}
      <View style={styles.summaryRow}>
        <View style={[styles.summaryCard, { backgroundColor: '#065f46' }]}>
          <Text style={styles.summaryLabel}>{t('paid')}</Text>
          <Text style={styles.summaryAmount}>${totalPaid.toFixed(2)}</Text>
        </View>
        <View style={[styles.summaryCard, { backgroundColor: '#92400e' }]}>
          <Text style={styles.summaryLabel}>{t('unpaid')}</Text>
          <Text style={styles.summaryAmount}>${totalUnpaid.toFixed(2)}</Text>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterRow}>
        {(['all', 'paid', 'unpaid'] as const).map((f) => (
          <TouchableOpacity
            key={f}
            style={[styles.filterTab, filter === f && styles.filterActive]}
            onPress={() => setFilter(f)}
          >
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>
              {f === 'all' ? 'All' : t(f)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Invoice List */}
      <FlatList
        data={invoices}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => {
          const statusStyle = getStatusStyle(item.status);
          return (
            <View style={styles.invoiceItem}>
              <View style={styles.invoiceHeader}>
                <Text style={styles.invoiceId}>{item.id}</Text>
                <View style={[styles.statusBadge, { backgroundColor: statusStyle.bg }]}>
                  <Text style={[styles.statusText, { color: statusStyle.text }]}>
                    {item.status === 'overdue' ? 'Overdue' : t(item.status)}
                  </Text>
                </View>
              </View>
              <Text style={styles.invoiceDesc}>{item.description}</Text>
              <View style={styles.invoiceDetails}>
                <Text style={styles.invoiceAmount}>${item.amount.toFixed(2)} {item.currency}</Text>
                <Text style={styles.invoiceDate}>
                  {item.status === 'paid' ? `Paid: ${item.paidAt}` : `Due: ${item.dueDate}`}
                </Text>
              </View>
            </View>
          );
        }}
        ListEmptyComponent={<Text style={styles.empty}>No invoices found</Text>}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#111827' },
  header: { padding: 20, paddingTop: 60 },
  title: { fontSize: 28, fontWeight: 'bold', color: '#fff' },
  summaryRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 12, marginBottom: 16 },
  summaryCard: { flex: 1, borderRadius: 12, padding: 16 },
  summaryLabel: { color: 'rgba(255,255,255,0.7)', fontSize: 14 },
  summaryAmount: { color: '#fff', fontSize: 24, fontWeight: 'bold', marginTop: 4 },
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, gap: 8, marginBottom: 16 },
  filterTab: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#1f2937' },
  filterActive: { backgroundColor: '#3b82f6' },
  filterText: { color: '#9ca3af', fontSize: 14 },
  filterTextActive: { color: '#fff' },
  invoiceItem: { backgroundColor: '#1f2937', marginHorizontal: 16, marginBottom: 12, borderRadius: 12, padding: 16 },
  invoiceHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  invoiceId: { color: '#9ca3af', fontSize: 14, fontWeight: '600' },
  statusBadge: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  statusText: { fontSize: 12, fontWeight: '600' },
  invoiceDesc: { color: '#fff', fontSize: 16, marginBottom: 8 },
  invoiceDetails: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  invoiceAmount: { color: '#22c55e', fontSize: 18, fontWeight: 'bold' },
  invoiceDate: { color: '#6b7280', fontSize: 12 },
  empty: { color: '#6b7280', textAlign: 'center', marginTop: 40 },
});
