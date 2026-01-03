import { useState, useEffect, useRef } from 'react';
import { FileText, Upload, Trash2, CheckCircle, Clock, XCircle, Download, Eye } from 'lucide-react';
import { documentsApi, type Document } from '../api';
import { useAuth } from '../AuthContext';

const DOC_TYPES = [
  { value: 'license', label: 'Driver License' },
  { value: 'insurance', label: 'Insurance Certificate' },
  { value: 'rego', label: 'Vehicle Registration' },
  { value: 'pod', label: 'Proof of Delivery' },
  { value: 'invoice', label: 'Invoice' },
  { value: 'other', label: 'Other' },
];

export default function Documents() {
  const { user } = useAuth();
  const [documents, setDocuments] = useState<Document[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [showUpload, setShowUpload] = useState(false);
  const [filter, setFilter] = useState('all');
  const [viewDoc, setViewDoc] = useState<(Document & { content?: string }) | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploadForm, setUploadForm] = useState({
    docType: 'license',
    expiresAt: '',
    notes: '',
  });

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    try {
      const res = await documentsApi.getMyDocuments();
      setDocuments(res.data.data || []);
    } catch (err) {
      console.error('Failed to load documents:', err);
    }
    setLoading(false);
  };

  const handleUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      alert('Please select a file');
      return;
    }

    setUploading(true);
    try {
      await documentsApi.upload(
        file,
        uploadForm.docType,
        undefined,
        uploadForm.expiresAt || undefined,
        uploadForm.notes || undefined
      );
      setShowUpload(false);
      setUploadForm({ docType: 'license', expiresAt: '', notes: '' });
      if (fileRef.current) fileRef.current.value = '';
      loadDocuments();
    } catch (err) {
      alert('Upload failed');
    }
    setUploading(false);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this document?')) return;
    try {
      await documentsApi.deleteDocument(id);
      loadDocuments();
    } catch (err) {
      alert('Delete failed');
    }
  };

  const handleView = async (doc: Document) => {
    try {
      const res = await documentsApi.getDocument(doc.id, true);
      setViewDoc(res.data.data);
    } catch (err) {
      alert('Failed to load document');
    }
  };

  const handleVerify = async (id: string, status: 'verified' | 'rejected') => {
    try {
      await documentsApi.verifyDocument(id, status);
      loadDocuments();
    } catch (err) {
      alert('Verification failed');
    }
  };

  const filteredDocs = filter === 'all' ? documents : documents.filter(d => d.doc_type === filter);
  const isAdmin = user?.user_type === 'admin';

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'verified': return <CheckCircle className="h-4 w-4 text-green-400" />;
      case 'rejected': return <XCircle className="h-4 w-4 text-red-400" />;
      default: return <Clock className="h-4 w-4 text-yellow-400" />;
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (loading) {
    return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500" /></div>;
  }

  return (
    <div className="max-w-4xl mx-auto px-4 py-6">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">Documents</h1>
          <p className="text-gray-400">Manage your licenses, insurance, and job documents</p>
        </div>
        <button onClick={() => setShowUpload(true)} className="btn-primary flex items-center gap-2">
          <Upload className="h-4 w-4" /> Upload
        </button>
      </div>

      {/* Filter */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        <button onClick={() => setFilter('all')} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${filter === 'all' ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
          All ({documents.length})
        </button>
        {DOC_TYPES.map(t => {
          const count = documents.filter(d => d.doc_type === t.value).length;
          return (
            <button key={t.value} onClick={() => setFilter(t.value)} className={`px-3 py-1.5 rounded-lg text-sm whitespace-nowrap ${filter === t.value ? 'bg-primary-500 text-white' : 'bg-dark-700 text-gray-400'}`}>
              {t.label} ({count})
            </button>
          );
        })}
      </div>

      {/* Documents List */}
      {filteredDocs.length === 0 ? (
        <div className="card text-center py-12">
          <FileText className="h-12 w-12 mx-auto text-gray-600 mb-3" />
          <p className="text-gray-400">No documents found</p>
          <button onClick={() => setShowUpload(true)} className="text-primary-400 hover:text-primary-300 mt-2">
            Upload your first document
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          {filteredDocs.map(doc => (
            <div key={doc.id} className="card flex items-center gap-4">
              <div className="p-3 bg-dark-700 rounded-lg">
                <FileText className="h-6 w-6 text-primary-400" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-medium truncate">{doc.filename}</p>
                  {getStatusIcon(doc.status)}
                </div>
                <div className="flex items-center gap-3 text-sm text-gray-400">
                  <span className="capitalize">{doc.doc_type}</span>
                  <span>{formatSize(doc.file_size)}</span>
                  <span>{new Date(doc.created_at).toLocaleDateString()}</span>
                  {doc.expires_at && (
                    <span className={new Date(doc.expires_at) < new Date() ? 'text-red-400' : ''}>
                      Expires: {new Date(doc.expires_at).toLocaleDateString()}
                    </span>
                  )}
                </div>
                {doc.notes && <p className="text-sm text-gray-500 mt-1">{doc.notes}</p>}
              </div>
              <div className="flex items-center gap-2">
                <button onClick={() => handleView(doc)} className="p-2 text-gray-400 hover:text-white hover:bg-dark-700 rounded-lg">
                  <Eye className="h-4 w-4" />
                </button>
                {isAdmin && doc.status === 'pending' && (
                  <>
                    <button onClick={() => handleVerify(doc.id, 'verified')} className="p-2 text-green-400 hover:bg-green-500/20 rounded-lg">
                      <CheckCircle className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleVerify(doc.id, 'rejected')} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
                      <XCircle className="h-4 w-4" />
                    </button>
                  </>
                )}
                <button onClick={() => handleDelete(doc.id)} className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Modal */}
      {showUpload && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-md">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold">Upload Document</h2>
              <button onClick={() => setShowUpload(false)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Document Type</label>
                <select value={uploadForm.docType} onChange={e => setUploadForm({ ...uploadForm, docType: e.target.value })} className="input-field">
                  {DOC_TYPES.map(t => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">File</label>
                <input ref={fileRef} type="file" className="input-field" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Expiry Date (optional)</label>
                <input type="date" value={uploadForm.expiresAt} onChange={e => setUploadForm({ ...uploadForm, expiresAt: e.target.value })} className="input-field" />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Notes (optional)</label>
                <textarea value={uploadForm.notes} onChange={e => setUploadForm({ ...uploadForm, notes: e.target.value })} className="input-field" rows={2} />
              </div>
              <div className="flex gap-3 pt-2">
                <button onClick={() => setShowUpload(false)} className="btn-secondary flex-1">Cancel</button>
                <button onClick={handleUpload} disabled={uploading} className="btn-primary flex-1">
                  {uploading ? 'Uploading...' : 'Upload'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* View Modal */}
      {viewDoc && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <div className="bg-dark-800 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-dark-700">
              <h2 className="text-xl font-semibold truncate">{viewDoc.filename}</h2>
              <button onClick={() => setViewDoc(null)} className="text-gray-400 hover:text-white">✕</button>
            </div>
            <div className="p-6">
              {viewDoc.content ? (
                viewDoc.mime_type.startsWith('image/') ? (
                  <img src={`data:${viewDoc.mime_type};base64,${viewDoc.content}`} alt={viewDoc.filename} className="max-w-full max-h-96 mx-auto" />
                ) : (
                  <div className="text-center py-8">
                    <FileText className="h-16 w-16 mx-auto text-gray-600 mb-4" />
                    <p className="text-gray-400 mb-4">Preview not available for this file type</p>
                    <a
                      href={`data:${viewDoc.mime_type};base64,${viewDoc.content}`}
                      download={viewDoc.filename}
                      className="btn-primary inline-flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" /> Download
                    </a>
                  </div>
                )
              ) : (
                <p className="text-gray-400 text-center">Loading...</p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
