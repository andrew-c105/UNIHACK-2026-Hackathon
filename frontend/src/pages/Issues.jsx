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

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#e0e0e0]/50 mb-4">
          <Link to="/" className="hover:text-white transition-colors">projects</Link>
          <span className="mx-2">/</span>
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">
            {project?.name || projectId}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">issues</span>
        </nav>

        <ProjectTabs projectId={projectId} activeTab="issues" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white tracking-wide">Issues</h1>
            <div className="flex gap-4 mt-1 text-sm text-[#e0e0e0]/50">
              <span>{openCount} open</span>
              <span>{closedCount} closed</span>
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
            <h3 className="font-display text-lg font-semibold text-white tracking-wide mb-4">
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
        <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
          {loading && (
            <div className="px-6 py-12 text-center text-[#e0e0e0]/40 text-sm">Loading…</div>
          )}
          {!loading && issues.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-[#e0e0e0]/40 text-sm mb-2">No issues yet.</p>
              <p className="text-[#e0e0e0]/30 text-xs">
                Create an issue to track bugs, ideas, or tasks.
              </p>
            </div>
          )}
          {!loading && issues.length > 0 && (
            <ul className="divide-y divide-white/10">
              {issues.map((issue) => (
                <li key={issue.id} className="px-6 py-5 hover:bg-white/5 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3">
                        <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[issue.status] || STATUS_STYLES.open}`}>
                          {issue.status}
                        </span>
                        <h3 className="text-white font-medium truncate">{issue.title}</h3>
                      </div>
                      {issue.description && (
                        <p className="mt-1 text-sm text-[#e0e0e0]/60 line-clamp-2">{issue.description}</p>
                      )}
                      <div className="flex items-center gap-3 mt-2 text-sm text-[#e0e0e0]/40 flex-wrap">
                        <span>#{issue.id}</span>
                        <span>by {issue.author || '—'}</span>
                        {issue.assignees?.length > 0 && (
                          <span className="flex items-center gap-1">
                            {issue.assignees.map((a) => (
                              <span key={a} className="rounded px-1.5 py-0.5 bg-white/10 text-[#e0e0e0]/70">
                                {a}
                              </span>
                            ))}
                          </span>
                        )}
                        {issue.created_at && (
                          <span>{new Date(issue.created_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                    <svg className="w-5 h-5 text-[#e0e0e0]/20 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
