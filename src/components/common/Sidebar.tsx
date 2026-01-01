import { NavLink } from 'react-router-dom';
import {
  Calendar,
  AlertTriangle,
  StickyNote,
  BarChart3,
  FileText,
  Settings,
  GraduationCap,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { useState } from 'react';
import { useSchedule } from '../../contexts/ScheduleContext';

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
  badge?: number;
  badgeColor?: string;
  localOnly?: boolean;
}

interface SidebarProps {
  onNavigate?: () => void;
}

export default function Sidebar({ onNavigate }: SidebarProps) {
  const [collapsed, setCollapsed] = useState(false);
  const { state } = useSchedule();

  const conflictCount = state.conflicts.length;

  const navItems: NavItem[] = [
    {
      path: '/',
      label: 'Schedule',
      icon: <Calendar className="w-5 h-5" />,
    },
    {
      path: '/conflicts',
      label: 'Conflicts',
      icon: <AlertTriangle className="w-5 h-5" />,
      badge: conflictCount,
      badgeColor: 'bg-red-500',
    },
    {
      path: '/notes',
      label: 'Notes',
      icon: <StickyNote className="w-5 h-5" />,
    },
    {
      path: '/analytics',
      label: 'Analytics',
      icon: <BarChart3 className="w-5 h-5" />,
    },
    {
      path: '/docs',
      label: 'Documentation',
      icon: <FileText className="w-5 h-5" />,
    },
    {
      path: '/students',
      label: 'Advising',
      icon: <GraduationCap className="w-5 h-5" />,
    },
  ];

  navItems.push({
    path: '/settings',
    label: 'Settings',
    icon: <Settings className="w-5 h-5" />,
  });

  return (
    <aside
      className={`bg-white border-r border-gray-200 flex flex-col transition-all duration-300 no-print ${
        collapsed ? 'w-16' : 'w-64'
      }`}
    >
      {/* Logo area */}
      <div className="p-4 border-b border-gray-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-ewu-red rounded-lg flex items-center justify-center flex-shrink-0">
            <span className="text-white font-bold text-lg">E</span>
          </div>
          {!collapsed && (
            <div className="min-w-0">
              <h2 className="font-semibold text-gray-900 truncate">EWU Cyber</h2>
              <p className="text-xs text-gray-500 truncate">Schedule Dashboard</p>
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.path === '/'}
            onClick={onNavigate}
            className={({ isActive }) =>
              `nav-item touch-target ${isActive ? 'active' : ''} ${collapsed ? 'justify-center px-2' : ''}`
            }
            title={collapsed ? item.label : undefined}
          >
            {item.icon}
            {!collapsed && (
              <>
                <span className="flex-1">{item.label}</span>
                {item.badge !== undefined && item.badge > 0 && (
                  <span
                    className={`nav-badge text-white ${item.badgeColor || 'bg-gray-500'}`}
                  >
                    {item.badge}
                  </span>
                )}
                {item.localOnly && (
                  <span className="nav-badge bg-amber-100 text-amber-700">LOCAL</span>
                )}
              </>
            )}
          </NavLink>
        ))}
      </nav>

      {/* Quick stats */}
      {!collapsed && (
        <div className="p-4 border-t border-gray-200">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">
            Quick Stats
          </h3>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-600">Total Courses</span>
              <span className="font-medium">{state.courses.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CSCD</span>
              <span className="font-medium text-blue-600">
                {state.courses.filter((c) => c.subject === 'CSCD').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">CYBR</span>
              <span className="font-medium text-ewu-red">
                {state.courses.filter((c) => c.subject === 'CYBR').length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-600">MATH</span>
              <span className="font-medium text-green-600">
                {state.courses.filter((c) => c.subject === 'MATH').length}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Collapse toggle */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="p-3 border-t border-gray-200 text-gray-500 hover:text-gray-700 hover:bg-gray-50 flex items-center justify-center"
        title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
      >
        {collapsed ? (
          <ChevronRight className="w-5 h-5" />
        ) : (
          <ChevronLeft className="w-5 h-5" />
        )}
      </button>
    </aside>
  );
}
