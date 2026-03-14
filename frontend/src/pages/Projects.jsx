import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api';
import Navbar from '../components/Navbar';

export default function Projects() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  const loadProjects = async () => {
    setLoading(true);
    try {
      const { projects: p } = await api.listProjects();
      setProjects(p || []);
    } catch (e) {
      setProjects([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProjects();
  }, []);

  const createProject = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const { project } = await api.createProject(newName.trim(), 'TrackSync project');
      setProjects((prev) => [project, ...prev]);
      setNewName('');
    } catch (err) {
      alert(err.message || 'Failed to create project');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <h1 className="text-3xl font-display font-bold text-white tracking-wide mb-8">Projects</h1>

        <div className="rounded-xl bg-[#111] border border-white/10 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
          <form onSubmit={createProject} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name (e.g. Summer EP)"
              className="flex-1 px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder-[#e0e0e0]/30 focus:ring-2 focus:ring-[#e0e0e0]/40 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="shrink-0 w-[7rem] px-6 py-3 rounded-lg bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-medium transition disabled:opacity-50"
            >
              Create
            </button>
          </form>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-[#e0e0e0]/50 py-8 text-center">Loading projects…</p>}
          {!loading && projects.length === 0 && (
            <div className="rounded-xl bg-[#111] border border-white/10 p-12 text-center">
              <p className="text-[#e0e0e0]/50 mb-2">No projects yet.</p>
              <p className="text-[#e0e0e0]/30 text-sm">Create one above to get started.</p>
            </div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-4 px-5 py-4 rounded-xl bg-[#111] border border-white/10 hover:border-[#e0e0e0]/30 transition group"
            >
              <Link
                to={`/project/${p.id}`}
                className="flex items-center gap-4 flex-1 min-w-0"
              >
                <div className="w-10 h-10 rounded-lg bg-[#e0e0e0]/10 flex items-center justify-center text-[#e0e0e0] text-lg shrink-0">
                  ♪
                </div>
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-medium group-hover:text-[#e0e0e0] transition truncate">
                    {p.name}
                  </h3>
                  <p className="text-[#e0e0e0]/40 text-sm truncate">
                    {p.description || 'No description'}
                  </p>
                </div>
              </Link>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  navigator.clipboard.writeText(p.id);
                }}
                className="shrink-0 flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-[#0a0a0a] border border-white/10 hover:border-[#e0e0e0]/40 transition-colors group/copy"
                title="Copy Project ID for LMMS"
              >
                <span className="font-mono text-xs text-[#e0e0e0]/60 group-hover/copy:text-white transition-colors">{p.id}</span>
                <svg className="w-3.5 h-3.5 text-[#e0e0e0]/40 group-hover/copy:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                </svg>
              </button>
              <span className="text-[#e0e0e0]/30 text-xs shrink-0">
                {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
