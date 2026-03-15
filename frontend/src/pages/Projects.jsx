import { Link } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { api } from '../api';
import Navbar from '../components/Navbar';
import { NativeDelete } from '../components/ui/delete-button';

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

  const handleDelete = async (id) => {
    try {
      await api.deleteProject(id);
      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err.message || 'Failed to delete project');
    }
  };

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <main className="max-w-5xl mx-auto px-6 py-12">
        <h1 className="text-4xl md:text-5xl font-sans font-bold text-white tracking-wide mb-10">PROJECTS</h1>

        <div className="rounded-2xl bg-[#111] border border-white/10 p-8 mb-10 shadow-xl">
          <h2 className="text-xl md:text-2xl font-semibold text-white mb-6">New Project</h2>
          <form onSubmit={createProject} className="flex gap-4">
            <input
              type="text"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="Project name (e.g. Summer EP)"
              className="flex-1 px-5 py-4 text-lg rounded-xl bg-[#0a0a0a] border border-white/10 text-white placeholder-[#e0e0e0]/40 focus:ring-2 focus:ring-[#e0e0e0]/50 focus:border-transparent transition shadow-inner"
            />
            <button
              type="submit"
              disabled={creating || !newName.trim()}
              className="shrink-0 w-[9rem] text-lg px-6 py-4 rounded-xl bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-bold transition disabled:opacity-50 shadow-md"
            >
              Create
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {loading && <p className="text-[#e0e0e0]/70 py-10 text-center text-xl font-medium">Loading projects…</p>}
          {!loading && projects.length === 0 && (
            <div className="rounded-2xl bg-[#111] border border-white/10 p-16 text-center shadow-lg">
              <p className="text-[#e0e0e0]/70 mb-3 text-2xl font-semibold">No projects yet.</p>
              <p className="text-[#e0e0e0]/50 text-lg">Create one above to get started.</p>
            </div>
          )}
          {projects.map((p) => (
            <div
              key={p.id}
              className="flex items-center gap-5 px-6 py-5 rounded-2xl bg-[#111] border border-white/10 hover:border-[#e0e0e0]/30 transition group shadow-md hover:shadow-xl"
            >
              <Link
                to={`/project/${p.id}`}
                className="flex items-center gap-5 flex-1 min-w-0"
              >
                {p.cover_url ? (
                  <div className="w-14 h-14 rounded-xl overflow-hidden shrink-0 shadow-sm border border-white/10">
                    <img
                      src={p.cover_url}
                      alt={`${p.name} cover`}
                      className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                    />
                  </div>
                ) : (
                  <div className="w-14 h-14 rounded-xl bg-[#e0e0e0]/10 flex items-center justify-center text-[#e0e0e0] text-3xl shrink-0 transition group-hover:bg-[#e0e0e0]/20 shadow-sm border border-transparent">
                    ♪
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <h3 className="text-white font-semibold text-xl md:text-2xl group-hover:text-[#e0e0e0] transition truncate mb-1.5">
                    {p.name}
                  </h3>
                  <p className="text-[#e0e0e0]/60 text-base md:text-lg truncate">
                    {p.description || 'No description'}
                  </p>
                </div>
              </Link>
              <div className="shrink-0 flex items-center gap-3">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    navigator.clipboard.writeText(p.id);
                  }}
                  className="shrink-0 flex items-center gap-2 px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 hover:border-[#e0e0e0]/40 transition-colors group/copy h-10 shadow-sm"
                  title="Copy Project ID for LMMS"
                >
                  <span className="font-mono text-sm text-[#e0e0e0]/60 group-hover/copy:text-white transition-colors">{p.id}</span>
                  <svg className="w-4 h-4 text-[#e0e0e0]/50 group-hover/copy:text-white transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <rect x="9" y="9" width="13" height="13" rx="2" />
                    <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                  </svg>
                </button>
                <NativeDelete onDelete={() => handleDelete(p.id)} />
              </div>
              <span className="text-[#e0e0e0]/40 text-sm md:text-base shrink-0 w-24 text-right">
                {p.created_at ? new Date(p.created_at).toLocaleDateString() : ''}
              </span>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
