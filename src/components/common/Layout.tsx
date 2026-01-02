import { useState } from 'react';
import { Outlet } from 'react-router-dom';
import { Menu, X } from 'lucide-react';
import Header from './Header';
import Sidebar from './Sidebar';
import { useScheduleLoading } from '../../contexts/ScheduleContext';

export default function Layout() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { loading, error } = useScheduleLoading();

  // Determine status indicator
  const statusConfig = error
    ? { color: 'bg-red-500', text: 'Error loading' }
    : loading
      ? { color: 'bg-yellow-500 animate-pulse', text: 'Loading...' }
      : { color: 'bg-green-500', text: 'Data loaded' };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile menu overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* Mobile menu button */}
      <button
        className="fixed bottom-4 right-4 z-50 md:hidden bg-ewu-red text-white p-4 rounded-full shadow-lg touch-target"
        onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
      >
        {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
      </button>

      {/* Sidebar - hidden on mobile unless menu is open */}
      <div
        className={`fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out md:relative md:translate-x-0 ${
          mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        <Sidebar onNavigate={() => setMobileMenuOpen(false)} />
      </div>

      {/* Main content area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <Header />

        {/* Page content - mobile-optimized padding */}
        <main className="flex-1 p-3 sm:p-4 md:p-6 overflow-auto safe-bottom">
          <Outlet />
        </main>

        {/* Footer - simplified on mobile */}
        <footer className="bg-white border-t border-gray-200 px-3 sm:px-6 py-3 no-print">
          <div className="flex flex-col sm:flex-row items-center justify-between text-xs sm:text-sm text-gray-500 gap-2">
            <span className="hidden sm:inline">EWU Cybersecurity Department Schedule Dashboard</span>
            <span className="sm:hidden">EWU Cyber Schedule</span>
            <span className="flex items-center gap-2 sm:gap-4">
              <span className="flex items-center gap-1">
                <span className={`w-2 h-2 ${statusConfig.color} rounded-full`}></span>
                <span className="hidden sm:inline">{statusConfig.text}</span>
              </span>
              <span>© {new Date().getFullYear()} EWU</span>
            </span>
          </div>
        </footer>
      </div>
    </div>
  );
}
