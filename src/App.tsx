import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScheduleProvider } from './contexts/ScheduleContext';
import { FilterProvider } from './contexts/FilterContext';
import { StudentProvider } from './contexts/StudentContext';
import { AcademicCalendarProvider } from './contexts/AcademicCalendarContext';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import Conflicts from './pages/Conflicts';
import Notes from './pages/Notes';
import Analytics from './pages/Analytics';
import Trends from './pages/Trends';
import Documentation from './pages/Documentation';
import Settings from './pages/Settings';
import Students from './pages/Students';

function App() {
  const basePath = import.meta.env.BASE_URL || '/';

  return (
    <BrowserRouter basename={basePath}>
      <AcademicCalendarProvider>
        <ScheduleProvider>
          <FilterProvider>
            <StudentProvider>
              <Routes>
                <Route path="/" element={<Layout />}>
                  <Route index element={<Dashboard />} />
                  <Route path="conflicts" element={<Conflicts />} />
                <Route path="notes" element={<Notes />} />
                <Route path="analytics" element={<Analytics />} />
                <Route path="trends" element={<Trends />} />
                <Route path="students" element={<Students />} />
                <Route path="docs" element={<Documentation />} />
                <Route path="docs/:section" element={<Documentation />} />
                <Route path="settings" element={<Settings />} />
                </Route>
              </Routes>
            </StudentProvider>
          </FilterProvider>
        </ScheduleProvider>
      </AcademicCalendarProvider>
    </BrowserRouter>
  );
}

export default App;
