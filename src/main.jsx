import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './lib/AppContext.jsx';
import Shell from './components/Shell.jsx';
import MainPage from './pages/MainPage.jsx';
import ProductionPage from './pages/ProductionPage.jsx';
import CoursePage from './pages/CoursePage.jsx';
import WorkPage from './pages/WorkPage.jsx';
import './styles.css';

function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <Shell>
          <Routes>
            <Route path="/" element={<MainPage />} />
            <Route path="/production" element={<ProductionPage />} />
            <Route path="/course" element={<CoursePage />} />
            <Route path="/work" element={<WorkPage />} />
            <Route path="*" element={<MainPage />} />
          </Routes>
        </Shell>
      </AppProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
