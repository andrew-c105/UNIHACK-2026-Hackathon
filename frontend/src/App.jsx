import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Projects from './pages/Projects';
import Dashboard from './pages/Dashboard';
import Session from './pages/Session';
import History from './pages/History';
import PullRequest from './pages/PullRequest';
import Conflict from './pages/Conflict';
import About from './pages/About';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/about" element={<About />} />
        <Route path="/project/:projectId" element={<Dashboard />} />
        <Route path="/project/:projectId/session" element={<Session />} />
        <Route path="/project/:projectId/history" element={<History />} />
        <Route path="/project/:projectId/pr/:prId" element={<PullRequest />} />
        <Route path="/project/:projectId/conflict" element={<Conflict />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
