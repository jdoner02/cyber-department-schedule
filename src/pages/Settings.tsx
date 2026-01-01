import { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Upload,
  Download,
  Trash2,
  Database,
  Palette,
  Shield,
} from 'lucide-react';
import { useSchedule } from '../contexts/ScheduleContext';

export default function Settings() {
  const { state, loadFromFile } = useSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadFromFile(file);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExportAll = () => {
    const exportData = {
      exportDate: new Date().toISOString(),
      version: '1.0.0',
      scheduleData: {
        courses: state.courses,
        source: state.dataSource,
        lastUpdated: state.lastUpdated?.toISOString(),
      },
      notes: JSON.parse(localStorage.getItem('ewu-schedule-notes') || '[]'),
      preferences: JSON.parse(localStorage.getItem('ewu-schedule-preferences') || '{}'),
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ewu-schedule-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLocalData = () => {
    localStorage.removeItem('ewu-schedule-notes');
    localStorage.removeItem('ewu-schedule-preferences');
    localStorage.removeItem('ewu-schedule-students');
    setShowClearConfirm(false);
    window.location.reload();
  };

  // Check if running locally
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:');

  return (
    <div>
      {/* Page header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-gray-600 mt-1">Manage data, preferences, and application settings</p>
      </div>

      <div className="space-y-6">
        {/* Data Management */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <Database className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Data Management</h2>
            </div>
          </div>
          <div className="card-body space-y-4">
            {/* Current data info */}
            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Current Schedule Data</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Courses Loaded:</span>
                  <span className="ml-2 font-medium">{state.courses.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Data Source:</span>
                  <span className="ml-2 font-medium">{state.dataSource || 'None'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 font-medium">
                    {state.lastUpdated?.toLocaleString() || 'Never'}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">Status:</span>
                  <span
                    className={`ml-2 font-medium ${
                      state.loading
                        ? 'text-amber-600'
                        : state.error
                        ? 'text-red-600'
                        : 'text-green-600'
                    }`}
                  >
                    {state.loading ? 'Loading...' : state.error ? 'Error' : 'Ready'}
                  </span>
                </div>
              </div>
            </div>

            {/* Import/Export buttons */}
            <div className="flex flex-wrap gap-4">
              <div>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".json"
                  onChange={handleFileImport}
                  className="hidden"
                  id="settings-file-import"
                />
                <label
                  htmlFor="settings-file-import"
                  className="btn btn-secondary cursor-pointer"
                >
                  <Upload className="w-4 h-4" />
                  Import Schedule JSON
                </label>
              </div>

              <button onClick={handleExportAll} className="btn btn-secondary">
                <Download className="w-4 h-4" />
                Export All Data
              </button>

              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Clear Local Data
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-red-600">Are you sure?</span>
                  <button onClick={handleClearLocalData} className="btn btn-primary bg-red-600 hover:bg-red-700">
                    Yes, Clear All
                  </button>
                  <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Security Settings */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <Shield className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Security</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Environment Mode</h3>
                <p className="text-sm text-gray-600">
                  {isLocal
                    ? 'Running locally - secure features available'
                    : 'Running on public host - secure features disabled'}
                </p>
              </div>
              <span
                className={`badge ${
                  isLocal ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                }`}
              >
                {isLocal ? 'LOCAL' : 'PUBLIC'}
              </span>
            </div>

            {isLocal && (
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Secure Mode Features</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Student tracking with encrypted storage</li>
                  <li>• Advising notes with passphrase protection</li>
                  <li>• FERPA-compliant data handling</li>
                </ul>
              </div>
            )}
          </div>
        </div>

        {/* Display Settings */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <Palette className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Display</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="grid md:grid-cols-2 gap-4">
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Color Theme</h3>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-ewu-red" title="EWU Red"></div>
                  <div className="w-8 h-8 rounded-lg bg-ewu-black" title="EWU Black"></div>
                  <span className="text-sm text-gray-600">EWU Brand Colors</span>
                </div>
              </div>
              <div className="p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Schedule Grid</h3>
                <p className="text-sm text-gray-600">
                  Hours displayed: 7:00 AM - 10:00 PM<br />
                  Days: Monday - Friday
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* About */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <SettingsIcon className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">About</h2>
            </div>
          </div>
          <div className="card-body">
            <div className="grid md:grid-cols-2 gap-4">
              <div>
                <h3 className="font-medium text-gray-900">EWU Cyber Schedule Dashboard</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Version 1.0.0<br />
                  Built with React, TypeScript, and Tailwind CSS
                </p>
              </div>
              <div>
                <h3 className="font-medium text-gray-900">Eastern Washington University</h3>
                <p className="text-sm text-gray-600 mt-1">
                  Department of Computer Science<br />
                  Cybersecurity Program
                </p>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-gray-200 text-sm text-gray-500">
              © {new Date().getFullYear()} Eastern Washington University. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
