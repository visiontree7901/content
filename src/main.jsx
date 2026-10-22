import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, HashRouter, Route, Routes } from 'react-router-dom';
import { AppProvider } from './lib/AppContext.jsx';
import Shell from './components/Shell.jsx';
import MainPage from './pages/MainPage.jsx';
import ProductionPage from './pages/ProductionPage.jsx';
import CoursePage from './pages/CoursePage.jsx';
import WorkPage from './pages/WorkPage.jsx';
import { IS_PREVIEW } from './lib/supabase.js';
import './styles.css';

// 미리보기(아티팩트)는 주소 경로를 바꿀 수 없어 # 방식 사용
const Router = IS_PREVIEW ? HashRouter : BrowserRouter;

function App() {
  return (
    <Router>
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
    </Router>
  );
}

createRoot(document.getElementById('root')).render(<StrictMode><App /></StrictMode>);
