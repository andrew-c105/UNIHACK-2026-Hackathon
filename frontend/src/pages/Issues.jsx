import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProjectTabs from '../components/ProjectTabs';
import { api } from '../api';

const STATUS_STYLES = {
  open: 'bg-emerald-500/20 text-emerald-400',
  closed: 'bg-[#e0e0e0]/20 text-[#e0e0e0]/60',
};

export default function Issues() {
  const { projectId } = useParams();
  const [issues, setIssues] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [assigneesInput, setAssigneesInput] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listIssues(projectId),
      api.getProject(projectId).catch(() => null),
    ])
      .then(([{ issues: i }, proj]) => {
        setIssues(i || []);
        setProject(proj?.project || null);
      })
      .catch(() => setIssues([]))
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleCreate = async () => {
    if (!title.trim()) return;
    setCreating(true);
    try {
      const assignees = assigneesInput
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean);
      await api.createIssue(projectId, title.trim(), description.trim(), assignees);
      setShowCreate(false);
      setTitle('');
      setDescription('');
      setAssigneesInput('');
      const { issues: i } = await api.listIssues(projectId);
      setIssues(i || []);
    } catch (err) {
      alert(err.message || 'Failed to create issue');
    } finally {
      setCreating(false);
    }
  };

  const openCount = issues.filter((i) => i.status === 'open').length;
  const closedCount = issues.filter((i) => i.status === 'closed').length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-[1600px] w-full mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#e0e0e0]/50 mb-6">
          <Link to="/projects" className="hover:text-white transition-colors">projects</Link>
          <span className="mx-2">/</span>
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">
            {project?.name || projectId}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">issues</span>
        </nav>

        <div className="mb-10">
          <ProjectTabs projectId={projectId} activeTab="issues" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-sans text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-sm">Issues</h1>
            <div className="flex gap-4 mt-3 text-lg text-[#e0e0e0]/50">
              <span className="font-medium">{openCount} open</span>
              <span className="font-medium">{closedCount} closed</span>
            </div>
          </div>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
            >
              New Issue
            </button>
          )}
        </div>

        {/* New Issue form */}
        {showCreate && (
          <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden mb-6 p-6">
            <h3 className="font-sans text-lg font-semibold text-white tracking-wide mb-4">
              New Issue
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs text-[#e0e0e0]/40 uppercase tracking-wider mb-2">Title</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Issue title"
                  className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder-[#e0e0e0]/30 focus:border-[#e0e0e0]/40 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#e0e0e0]/40 uppercase tracking-wider mb-2">Description</label>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Add a description…"
                  rows={4}
                  className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder-[#e0e0e0]/30 focus:border-[#e0e0e0]/40 outline-none resize-none"
                />
              </div>

              <div>
                <label className="block text-xs text-[#e0e0e0]/40 uppercase tracking-wider mb-2">Assignees</label>
                <input
                  type="text"
                  value={assigneesInput}
                  onChange={(e) => setAssigneesInput(e.target.value)}
                  placeholder="Comma-separated (e.g. alice, bob)"
                  className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder-[#e0e0e0]/30 focus:border-[#e0e0e0]/40 outline-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => {
                  setShowCreate(false);
                  setTitle('');
                  setDescription('');
                  setAssigneesInput('');
                }}
                className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreate}
                disabled={creating || !title.trim()}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Issue'}
              </button>
            </div>
          </div>
        )}

        {/* Issue list */}
        <div className="rounded-2xl bg-[#111] border border-white/10 overflow-hidden shadow-lg">
          {loading && (
            <div className="px-8 py-16 text-center text-[#e0e0e0]/40 text-lg">Loading…</div>
          )}
          {!loading && issues.length === 0 && (
            <div className="px-8 py-20 text-center">
              <p className="text-[#e0e0e0]/60 text-xl font-medium mb-3">No issues yet.</p>
              <p className="text-[#e0e0e0]/40 text-base">
                Create an issue to track bugs, ideas, or tasks.
              </p>
            </div>
          )}
          {!loading && issues.length > 0 && (
            <ul className="divide-y divide-white/10">
              {issues.map((issue) => (
                <li key={issue.id} className="block px-8 py-6 hover:bg-white/5 transition-colors group">
                  <div className="flex items-start justify-between gap-6">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-4">
                        <span className={`inline-block rounded-md px-2.5 py-1 text-sm font-bold tracking-wide uppercase ${STATUS_STYLES[issue.status] || STATUS_STYLES.open}`}>
                          {issue.status}
                        </span>
                        <h3 className="text-white text-xl font-semibold truncate group-hover:text-[#e0e0e0] transition-colors">{issue.title}</h3>
                      </div>
                      {issue.description && (
                        <p className="mt-3 text-base text-[#e0e0e0]/60 line-clamp-2">{issue.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-4 text-base font-medium text-[#e0e0e0]/40 flex-wrap">
                        <span>#{issue.id}</span>
                        <span>•</span>
                        <span>by {issue.author || '—'}</span>
                        {issue.assignees?.length > 0 && (
                          <span className="flex items-center gap-2 border-l border-white/10 pl-3 ml-1">
                            {issue.assignees.map((a) => (
                              <span key={a} className="rounded-md px-2 py-1 bg-white/10 text-[#e0e0e0]/70 text-sm">
                                {a}
                              </span>
                            ))}
                          </span>
                        )}
                        {issue.created_at && (
                          <>
                            <span>•</span>
                            <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                          </>
                        )}
                      </div>
                    </div>
                    <svg className="w-6 h-6 text-[#e0e0e0]/20 shrink-0 mt-2 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
