import { useState, useRef } from 'react';
import {
  Settings as SettingsIcon,
  Upload,
  Download,
  Trash2,
  Database,
  Palette,
  Shield,
  FileJson,
  BookOpen,
  Copy,
  Check,
  HardDrive,
} from 'lucide-react';
import { useSchedule } from '../contexts/ScheduleContext';

export default function Settings() {
  const { state, loadFromFile } = useSchedule();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [copiedText, setCopiedText] = useState<string | null>(null);

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
      filters: JSON.parse(localStorage.getItem('ewu-cyber-schedule-filters') || '{}'),
      presets: JSON.parse(localStorage.getItem('ewu-cyber-schedule-presets') || '[]'),
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

  const handleExportNotes = () => {
    const notes = JSON.parse(localStorage.getItem('ewu-schedule-notes') || '[]');
    const blob = new Blob([JSON.stringify(notes, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ewu-schedule-notes-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearLocalData = () => {
    localStorage.removeItem('ewu-schedule-notes');
    localStorage.removeItem('ewu-cyber-schedule-filters');
    localStorage.removeItem('ewu-cyber-schedule-presets');
    localStorage.removeItem('ewu-schedule-students');
    setShowClearConfirm(false);
    window.location.reload();
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(id);
    setTimeout(() => setCopiedText(null), 2000);
  };

  // Check if running locally
  const isLocal =
    typeof window !== 'undefined' &&
    (window.location.hostname === 'localhost' ||
      window.location.hostname === '127.0.0.1' ||
      window.location.protocol === 'file:');

  // Count localStorage items
  const notesCount = JSON.parse(localStorage.getItem('ewu-schedule-notes') || '[]').length;
  const presetsCount = JSON.parse(localStorage.getItem('ewu-cyber-schedule-presets') || '[]').length;

  return (
    <div>
      {/* Page header */}
      <div className="mb-4 sm:mb-6">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Settings</h1>
        <p className="text-sm sm:text-base text-gray-600 mt-1">Manage data, preferences, and application settings</p>
      </div>

      <div className="space-y-4 sm:space-y-6">
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
            <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">Current Schedule Data</h3>
              <div className="grid grid-cols-2 gap-2 sm:gap-4 text-sm">
                <div>
                  <span className="text-gray-500">Courses Loaded:</span>
                  <span className="ml-2 font-medium">{state.courses.length}</span>
                </div>
                <div>
                  <span className="text-gray-500">Data Source:</span>
                  <span className="ml-2 font-medium text-xs sm:text-sm">{state.dataSource || 'Default'}</span>
                </div>
                <div>
                  <span className="text-gray-500">Last Updated:</span>
                  <span className="ml-2 font-medium text-xs sm:text-sm">
                    {state.lastUpdated?.toLocaleString() || 'Loaded from file'}
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

            {/* Local Storage Stats */}
            <div className="p-3 sm:p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2 flex items-center gap-2">
                <HardDrive className="w-4 h-4" />
                Local Storage
              </h3>
              <div className="grid grid-cols-2 gap-2 text-sm text-blue-800">
                <div>Notes saved: <span className="font-medium">{notesCount}</span></div>
                <div>Custom presets: <span className="font-medium">{presetsCount}</span></div>
              </div>
              <p className="text-xs text-blue-600 mt-2">
                Your notes, filters, and presets are automatically saved in your browser's local storage and will persist across sessions.
              </p>
            </div>

            {/* Import/Export buttons */}
            <div className="flex flex-wrap gap-3">
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
                  className="btn btn-secondary cursor-pointer touch-target"
                >
                  <Upload className="w-4 h-4" />
                  <span className="hidden sm:inline">Import Schedule</span>
                  <span className="sm:hidden">Import</span>
                </label>
              </div>

              <button onClick={handleExportAll} className="btn btn-secondary touch-target">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export All Data</span>
                <span className="sm:hidden">Export All</span>
              </button>

              <button onClick={handleExportNotes} className="btn btn-secondary touch-target">
                <Download className="w-4 h-4" />
                <span className="hidden sm:inline">Export Notes Only</span>
                <span className="sm:hidden">Notes</span>
              </button>

              {!showClearConfirm ? (
                <button
                  onClick={() => setShowClearConfirm(true)}
                  className="btn btn-outline text-red-600 border-red-300 hover:bg-red-50 touch-target"
                >
                  <Trash2 className="w-4 h-4" />
                  <span className="hidden sm:inline">Clear Local Data</span>
                  <span className="sm:hidden">Clear</span>
                </button>
              ) : (
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-sm text-red-600">Are you sure?</span>
                  <button onClick={handleClearLocalData} className="btn btn-primary bg-red-600 hover:bg-red-700 touch-target">
                    Yes, Clear All
                  </button>
                  <button onClick={() => setShowClearConfirm(false)} className="btn btn-secondary touch-target">
                    Cancel
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* JSON Import/Export Instructions */}
        <div className="card">
          <div className="card-header">
            <div className="flex items-center gap-3">
              <FileJson className="w-5 h-5 text-gray-600" />
              <h2 className="font-semibold text-gray-900">Updating Schedule Data</h2>
            </div>
          </div>
          <div className="card-body space-y-4">
            <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg">
              <h3 className="font-medium text-amber-800 mb-2 flex items-center gap-2">
                <BookOpen className="w-4 h-4" />
                How to Update Schedule Data
              </h3>
              <ol className="text-sm text-amber-700 space-y-2 list-decimal list-inside">
                <li>Export your schedule data from Banner as JSON format</li>
                <li>Click the <strong>"Import Schedule"</strong> button above</li>
                <li>Select your new JSON file</li>
                <li>The dashboard will automatically reload with new data</li>
              </ol>
            </div>

            <div className="p-4 bg-gray-50 rounded-lg">
              <h3 className="font-medium text-gray-900 mb-2">For Local Development</h3>
              <p className="text-sm text-gray-600 mb-3">
                If running the dashboard locally, you can also update the data file directly:
              </p>
              <div className="space-y-3">
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ewu-red text-white text-xs flex items-center justify-center">1</span>
                  <div>
                    <p className="text-sm text-gray-700">Replace the schedule file at:</p>
                    <div className="flex items-center gap-2 mt-1">
                      <code className="text-xs bg-gray-200 px-2 py-1 rounded font-mono">
                        public/data/schedule.json
                      </code>
                      <button
                        onClick={() => copyToClipboard('public/data/schedule.json', 'path')}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Copy path"
                      >
                        {copiedText === 'path' ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <span className="flex-shrink-0 w-6 h-6 rounded-full bg-ewu-red text-white text-xs flex items-center justify-center">2</span>
                  <p className="text-sm text-gray-700">Restart the development server or refresh the page</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-blue-50 rounded-lg">
              <h3 className="font-medium text-blue-900 mb-2">Expected JSON Format</h3>
              <p className="text-sm text-blue-700 mb-2">
                The JSON file should match the Banner ERP export format:
              </p>
              <pre className="text-xs bg-blue-100 p-3 rounded overflow-x-auto">
{`{
  "success": true,
  "totalCount": 112,
  "data": [
    {
      "id": 283770,
      "term": "202640",
      "courseReferenceNumber": "20785",
      "subject": "CSCD",
      "courseNumber": "110",
      "courseTitle": "INTRO TO CS",
      "faculty": [...],
      "meetingsFaculty": [...],
      "enrollment": 25,
      "maximumEnrollment": 30,
      ...
    }
  ]
}`}
              </pre>
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
            <div className="flex items-center justify-between p-3 sm:p-4 bg-gray-50 rounded-lg">
              <div>
                <h3 className="font-medium text-gray-900">Environment Mode</h3>
                <p className="text-xs sm:text-sm text-gray-600">
                  {isLocal
                    ? 'Running locally - secure features available'
                    : 'Running on public host - public mode'}
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
              <div className="mt-4 p-3 sm:p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-medium text-blue-800 mb-2">Secure Mode Features</h4>
                <ul className="text-sm text-blue-700 space-y-1">
                  <li>• Student tracking with encrypted storage</li>
                  <li>• Advising notes with passphrase protection</li>
                  <li>• FERPA-compliant data handling</li>
                </ul>
              </div>
            )}

            <div className="mt-4 p-3 sm:p-4 bg-green-50 border border-green-200 rounded-lg">
              <h4 className="font-medium text-green-800 mb-2">Data Privacy</h4>
              <ul className="text-sm text-green-700 space-y-1">
                <li>• All data is stored locally in your browser</li>
                <li>• No data is sent to external servers</li>
                <li>• Notes and settings persist only on this device</li>
                <li>• Export your data regularly for backup</li>
              </ul>
            </div>
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
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-2">Color Theme</h3>
                <div className="flex items-center gap-4">
                  <div className="w-8 h-8 rounded-lg bg-ewu-red" title="EWU Red"></div>
                  <div className="w-8 h-8 rounded-lg bg-ewu-black" title="EWU Black"></div>
                  <span className="text-sm text-gray-600">EWU Brand Colors</span>
                </div>
              </div>
              <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
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
            <div className="grid sm:grid-cols-2 gap-4">
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
            <div className="mt-4 pt-4 border-t border-gray-200 text-xs sm:text-sm text-gray-500">
              © {new Date().getFullYear()} Eastern Washington University. All rights reserved.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
