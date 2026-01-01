import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { ScheduleProvider } from './contexts/ScheduleContext';
import { FilterProvider } from './contexts/FilterContext';
import Layout from './components/common/Layout';
import Dashboard from './pages/Dashboard';
import Conflicts from './pages/Conflicts';
import Notes from './pages/Notes';
import Analytics from './pages/Analytics';
import Documentation from './pages/Documentation';
import Settings from './pages/Settings';

function App() {
  const basePath = import.meta.env.BASE_URL || '/';

  return (
    <BrowserRouter basename={basePath}>
      <ScheduleProvider>
        <FilterProvider>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Dashboard />} />
              <Route path="conflicts" element={<Conflicts />} />
              <Route path="notes" element={<Notes />} />
              <Route path="analytics" element={<Analytics />} />
              <Route path="docs" element={<Documentation />} />
              <Route path="docs/:section" element={<Documentation />} />
              <Route path="settings" element={<Settings />} />
            </Route>
          </Routes>
        </FilterProvider>
      </ScheduleProvider>
    </BrowserRouter>
  );
}

export default App;
