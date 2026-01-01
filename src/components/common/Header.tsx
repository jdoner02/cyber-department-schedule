import { useState, useRef } from 'react';
import { Search, Upload, Download, RefreshCw, Printer } from 'lucide-react';
import { useSchedule } from '../../contexts/ScheduleContext';
import { useFilters } from '../../contexts/FilterContext';

export default function Header() {
  const { state, loadFromFile, refreshData } = useSchedule();
  const { dispatch } = useFilters();
  const [searchQuery, setSearchQuery] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const canRefresh = state.dataSource.startsWith('http') || state.dataSource.startsWith('/');

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    const query = e.target.value;
    setSearchQuery(query);
    dispatch({ type: 'SET_SEARCH_QUERY', payload: query });
  };

  const handleFileImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      await loadFromFile(file);
    }
    // Reset the input
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleExport = () => {
    // Export current data as JSON
    const exportData = {
      exportDate: new Date().toISOString(),
      courseCount: state.courses.length,
      courses: state.courses,
    };

    const blob = new Blob([JSON.stringify(exportData, null, 2)], {
      type: 'application/json',
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ewu-schedule-export-${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4 no-print">
      <div className="flex items-center justify-between gap-4">
        {/* Left: Logo and Title */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 bg-ewu-red rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">E</span>
            </div>
            <div>
              <h1 className="text-lg font-semibold text-gray-900">
                Cyber Schedule Dashboard
              </h1>
              <p className="text-xs text-gray-500">
                {state.courses.length} courses loaded
                {state.lastUpdated && (
                  <span>
                    {' '}
                    • Last updated {state.lastUpdated.toLocaleTimeString()}
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>

        {/* Center: Search */}
        <div className="flex-1 max-w-md">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search courses, instructors, CRN..."
              value={searchQuery}
              onChange={handleSearch}
              className="input pl-10"
            />
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2">
          <input
            ref={fileInputRef}
            type="file"
            accept=".json"
            onChange={handleFileImport}
            className="hidden"
            id="file-import"
          />
          <label
            htmlFor="file-import"
            className="btn btn-ghost btn-sm cursor-pointer"
            title="Import schedule JSON"
          >
            <Upload className="w-4 h-4" />
            <span className="hidden sm:inline">Import</span>
          </label>

          <button
            onClick={handleExport}
            className="btn btn-ghost btn-sm"
            title="Export schedule data"
            disabled={state.courses.length === 0}
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export</span>
          </button>

          <button
            onClick={handlePrint}
            className="btn btn-ghost btn-sm"
            title="Print schedule"
          >
            <Printer className="w-4 h-4" />
            <span className="hidden sm:inline">Print</span>
          </button>

          <button
            onClick={() => void refreshData()}
            className="btn btn-ghost btn-sm"
            title="Refresh data"
            disabled={state.loading || !canRefresh}
          >
            <RefreshCw className={`w-4 h-4 ${state.loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>

      {/* Error display */}
      {state.error && (
        <div className="mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-800 text-sm">
          <strong>Error:</strong> {state.error}
        </div>
      )}
    </header>
  );
}
