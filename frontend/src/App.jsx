import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Landing from './pages/Landing';
import Projects from './pages/Projects';
import Dashboard from './pages/Dashboard';
import PullRequest from './pages/PullRequest';
import PullRequests from './pages/PullRequests';
import Issues from './pages/Issues';
import Conflict from './pages/Conflict';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Landing />} />
        <Route path="/projects" element={<Projects />} />
        <Route path="/project/:projectId" element={<Dashboard />} />
        <Route path="/project/:projectId/prs" element={<PullRequests />} />
        <Route path="/project/:projectId/issues" element={<Issues />} />
        <Route path="/project/:projectId/pr/:prId" element={<PullRequest />} />
        <Route path="/project/:projectId/conflict" element={<Conflict />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
