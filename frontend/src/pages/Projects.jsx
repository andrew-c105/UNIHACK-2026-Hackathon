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

  const seedDemo = async () => {
    setCreating(true);
    try {
      const res = await fetch('/api/seed-demo', { method: 'POST' });
      const data = await res.json();
      if (data.success) loadProjects();
    } catch (e) {
      // ignore
    } finally {
      setCreating(false);
    }
  };

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
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-10">
        <div className="flex items-center justify-between mb-8">
          <h1 className="text-3xl font-bold text-white">Projects</h1>
          <button
            onClick={seedDemo}
            disabled={creating}
            className="px-4 py-2 rounded-lg bg-brand-card border border-slate-800 hover:border-cyan-500/40 text-slate-300 text-sm transition disabled:opacity-50"
          >
            Seed Demo
          </button>
        </div>

        <div className="rounded-xl bg-brand-card border border-slate-800 p-6 mb-8">
          <h2 className="text-lg font-semibold text-white mb-4">New Project</h2>
          <form onSubmit={createProject} className="flex gap-3">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name (e.g. Summer EP)"
              className="flex-1 px-4 py-3 rounded-lg bg-brand-dark border border-slate-800 text-white placeholder-slate-500 focus:ring-2 focus:ring-cyan-400 focus:border-transparent"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="px-6 py-3 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-brand-dark font-medium transition disabled:opacity-50"
            >
              {creating ? 'Creating…' : 'Create'}
            </button>
          </form>
        </div>

        <div className="space-y-3">
          {loading && <p className="text-slate-500 py-8 text-center">Loading projects…</p>}
          {!loading && projects.length === 0 && (
            <div className="rounded-xl bg-brand-card border border-slate-800 p-12 text-center">
              <p className="text-slate-500 mb-2">No projects yet.</p>
              <p className="text-slate-600 text-sm">Create one above or click Seed Demo to get started.</p>
            </div>
          )}
          {projects.map((p) => (
            <Link
              key={p.id}
              to={`/project/${p.id}`}
              className="flex items-center gap-4 px-5 py-4 rounded-xl bg-brand-card border border-slate-800 hover:border-cyan-500/30 transition group"
            >
              <div className="w-10 h-10 rounded-lg bg-cyan-500/10 flex items-center justify-center text-cyan-400 text-lg shrink-0">
                ♪
              </div>
              <div className="flex-1 min-w-0">
                <h3 className="text-white font-medium group-hover:text-cyan-400 transition truncate">
                  {p.name}
                </h3>
                <p className="text-slate-500 text-sm truncate">
                  {p.description || 'No description'}
                </p>
              </div>
              <span className="text-slate-600 text-xs shrink-0">
                {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
              </span>
            </Link>
          ))}
        </div>
      </main>
    </div>
  );
}
