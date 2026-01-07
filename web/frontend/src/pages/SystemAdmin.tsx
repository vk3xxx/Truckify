import { useState, useEffect } from 'react';
import { AlertCircle, Download, Upload, Save, RefreshCw, Eye, EyeOff, Shield, Database, Globe, Key, Settings } from 'lucide-react';

interface ConfigField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'number' | 'url' | 'email';
  value: string;
  encrypted: boolean;
  required: boolean;
}

interface ConfigSection {
  name: string;
  description: string;
  fields: ConfigField[];
}

interface SystemConfig {
  sections: ConfigSection[];
  lastModified: string;
  modifiedBy: string;
}

const sectionIcons: Record<string, React.ReactNode> = {
  'API Configuration': <Settings className="w-5 h-5" />,
  'Security': <Shield className="w-5 h-5" />,
  'Database': <Database className="w-5 h-5" />,
  'External API URLs': <Globe className="w-5 h-5" />,
  'External API Keys': <Key className="w-5 h-5" />,
};

export default function SystemAdmin() {
  const [config, setConfig] = useState<SystemConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [backupPassword, setBackupPassword] = useState('');
  const [showBackupDialog, setShowBackupDialog] = useState(false);

  const ADMIN_API = 'http://localhost:8017';

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    try {
      const response = await fetch(`${ADMIN_API}/api/v1/admin/config`);
      const data = await response.json();
      setConfig(data);
    } catch {
      setMessage({ type: 'error', text: 'Failed to load system configuration' });
    } finally {
      setLoading(false);
    }
  };

  const handleFieldChange = (sectionIndex: number, fieldIndex: number, value: string) => {
    if (!config) return;
    const newConfig = JSON.parse(JSON.stringify(config));
    newConfig.sections[sectionIndex].fields[fieldIndex].value = value;
    setConfig(newConfig);
  };

  const handleSaveConfig = async () => {
    if (!config) return;
    setSaving(true);
    try {
      await fetch(`${ADMIN_API}/api/v1/admin/config`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      setMessage({ type: 'success', text: 'Configuration saved successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to save configuration' });
    } finally {
      setSaving(false);
    }
  };

  const handleBackupConfig = async () => {
    if (!backupPassword) {
      setMessage({ type: 'error', text: 'Backup password required' });
      return;
    }
    try {
      const response = await fetch(`${ADMIN_API}/api/v1/admin/config/backup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: backupPassword }),
      });
      const data = await response.json();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `truckify-config-backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setShowBackupDialog(false);
      setBackupPassword('');
      setMessage({ type: 'success', text: 'Configuration backed up successfully' });
      setTimeout(() => setMessage(null), 3000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to backup configuration' });
    }
  };

  const handleRestoreConfig = async (file: File) => {
    if (!backupPassword) {
      setMessage({ type: 'error', text: 'Backup password required' });
      return;
    }
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('password', backupPassword);
      await fetch(`${ADMIN_API}/api/v1/admin/config/restore`, {
        method: 'POST',
        body: formData,
      });
      setMessage({ type: 'success', text: 'Configuration restored successfully' });
      setBackupPassword('');
      setShowBackupDialog(false);
      setTimeout(() => fetchConfig(), 1000);
    } catch {
      setMessage({ type: 'error', text: 'Failed to restore configuration' });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-900">
        <div className="text-center text-gray-300">
          <RefreshCw className="w-8 h-8 animate-spin mx-auto mb-2 text-blue-500" />
          <p>Loading system configuration...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-900 text-gray-100 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-white mb-2">System Administration</h1>
          <p className="text-gray-400">Manage system configuration, API settings, and security parameters</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg flex items-start gap-3 ${
            message.type === 'success' 
              ? 'bg-green-900/50 border border-green-700' 
              : 'bg-red-900/50 border border-red-700'
          }`}>
            <AlertCircle className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
              message.type === 'success' ? 'text-green-400' : 'text-red-400'
            }`} />
            <p className={message.type === 'success' ? 'text-green-300' : 'text-red-300'}>
              {message.text}
            </p>
          </div>
        )}

        {/* Action Buttons */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <button
            onClick={handleSaveConfig}
            disabled={saving}
            className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 justify-center font-medium transition-colors"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving...' : 'Save Config'}
          </button>
          <button
            onClick={() => setShowBackupDialog(true)}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 justify-center font-medium transition-colors"
          >
            <Download className="w-4 h-4" />
            Backup
          </button>
          <label className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-3 rounded-lg flex items-center gap-2 justify-center font-medium cursor-pointer transition-colors">
            <Upload className="w-4 h-4" />
            Restore
            <input
              type="file"
              accept=".json"
              className="hidden"
              onChange={(e) => e.target.files?.[0] && handleRestoreConfig(e.target.files[0])}
            />
          </label>
          <button
            onClick={fetchConfig}
            className="bg-gray-700 hover:bg-gray-600 text-white px-4 py-3 rounded-lg flex items-center gap-2 justify-center font-medium transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Backup Dialog */}
        {showBackupDialog && (
          <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50">
            <div className="bg-gray-800 rounded-xl p-6 max-w-md w-full mx-4 border border-gray-700">
              <h3 className="text-xl font-semibold text-white mb-4">Backup/Restore Configuration</h3>
              <p className="text-gray-400 text-sm mb-4">
                Enter a strong password to encrypt your configuration backup.
              </p>
              <input
                type="password"
                placeholder="Backup password"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
                className="w-full px-4 py-3 bg-gray-900 border border-gray-600 rounded-lg mb-4 text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <div className="flex gap-3">
                <button
                  onClick={handleBackupConfig}
                  className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Create Backup
                </button>
                <button
                  onClick={() => { setShowBackupDialog(false); setBackupPassword(''); }}
                  className="flex-1 bg-gray-700 hover:bg-gray-600 text-white px-4 py-2 rounded-lg font-medium transition-colors"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Config Sections */}
        {config && (
          <div className="space-y-6">
            {config.sections.map((section, sectionIndex) => (
              <div key={section.name} className="bg-gray-800 rounded-xl border border-gray-700 overflow-hidden">
                {/* Section Header */}
                <div className="px-6 py-4 bg-gray-800/50 border-b border-gray-700">
                  <div className="flex items-center gap-3">
                    <div className="text-blue-400">
                      {sectionIcons[section.name] || <Settings className="w-5 h-5" />}
                    </div>
                    <div>
                      <h2 className="text-lg font-semibold text-white">{section.name}</h2>
                      <p className="text-gray-400 text-sm">{section.description}</p>
                    </div>
                  </div>
                </div>

                {/* Section Fields */}
                <div className="p-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {section.fields.map((field, fieldIndex) => (
                      <div key={field.key}>
                        <label className="flex items-center gap-2 text-sm font-medium text-gray-300 mb-2">
                          {field.label}
                          {field.required && <span className="text-red-400">*</span>}
                          {field.encrypted && (
                            <span className="text-xs bg-amber-500/20 text-amber-400 px-2 py-0.5 rounded-full">
                              🔒 Encrypted
                            </span>
                          )}
                        </label>
                        <div className="flex gap-2">
                          <input
                            type={field.encrypted && !showPasswords[`${sectionIndex}-${fieldIndex}`] ? 'password' : 'text'}
                            value={field.value || ''}
                            onChange={(e) => handleFieldChange(sectionIndex, fieldIndex, e.target.value)}
                            placeholder={field.encrypted ? 'Enter new value to update' : `Enter ${field.label.toLowerCase()}`}
                            className={`flex-1 px-4 py-2.5 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500 ${
                              field.encrypted 
                                ? 'bg-amber-900/20 border border-amber-700/50' 
                                : 'bg-gray-900 border border-gray-600'
                            }`}
                          />
                          {field.encrypted && (
                            <button
                              type="button"
                              onClick={() => {
                                const key = `${sectionIndex}-${fieldIndex}`;
                                setShowPasswords(prev => ({ ...prev, [key]: !prev[key] }));
                              }}
                              className="px-3 py-2 bg-gray-700 hover:bg-gray-600 border border-gray-600 rounded-lg text-gray-300 transition-colors"
                            >
                              {showPasswords[`${sectionIndex}-${fieldIndex}`] ? (
                                <EyeOff className="w-4 h-4" />
                              ) : (
                                <Eye className="w-4 h-4" />
                              )}
                            </button>
                          )}
                        </div>
                        {field.encrypted && field.value && (
                          <p className="text-xs text-gray-500 mt-1">Current value is set (masked for security)</p>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Footer */}
        <div className="mt-8 p-4 bg-gray-800/50 rounded-lg border border-gray-700 text-sm text-gray-400">
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <span>Last Modified: {config?.lastModified ? new Date(config.lastModified).toLocaleString() : 'Never'}</span>
            <span>Modified by: {config?.modifiedBy || 'System'}</span>
          </div>
        </div>
      </div>
    </div>
  );
}
