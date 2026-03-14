import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProjectTabs from '../components/ProjectTabs';
import { api } from '../api';

const STATUS_STYLES = {
  open: 'bg-emerald-500/20 text-emerald-400',
  merged: 'bg-purple-500/20 text-purple-400',
  closed: 'bg-red-500/20 text-red-400',
};

export default function PullRequests() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [prs, setPrs] = useState([]);
  const [project, setProject] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [baseBranch, setBaseBranch] = useState('main');
  const [compareBranch, setCompareBranch] = useState('');
  const [creating, setCreating] = useState(false);

  useEffect(() => {
    Promise.all([
      api.listPrs(projectId),
      api.getProject(projectId).catch(() => null),
      api.listBranches(projectId).catch(() => ({ branches: [] })),
    ])
      .then(([{ pull_requests }, proj, { branches: b }]) => {
        setPrs(pull_requests || []);
        setProject(proj?.project || null);
        setBranches(b || []);
        const nonMain = (b || []).filter((br) => br !== 'main');
        if (nonMain.length > 0) setCompareBranch(nonMain[0]);
      })
      .catch(() => {
        setPrs([]);
        setProject(null);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleCreatePr = async () => {
    if (!compareBranch || compareBranch === baseBranch) return;
    setCreating(true);
    try {
      const result = await api.createPr(projectId, compareBranch, baseBranch);
      const prId = result?.pr?.id;
      if (prId) {
        navigate(`/project/${projectId}/pr/${prId}`);
      } else {
        setShowCreate(false);
        const refreshed = await api.listPrs(projectId);
        setPrs(refreshed.pull_requests || []);
      }
    } catch (err) {
      alert(err.message || 'Failed to create pull request');
    } finally {
      setCreating(false);
    }
  };

  const openCount = prs.filter((p) => p.status === 'open').length;
  const mergedCount = prs.filter((p) => p.status === 'merged').length;

  const baseOptions = branches;
  const compareOptions = branches.filter((b) => b !== baseBranch);

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
          <span className="text-white">pull requests</span>
        </nav>

        <ProjectTabs projectId={projectId} activeTab="prs" />

        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="font-display text-2xl font-semibold text-white tracking-wide">Pull Requests</h1>
            <div className="flex gap-4 mt-1 text-sm text-[#e0e0e0]/50">
              <span>{openCount} open</span>
              <span>{mergedCount} merged</span>
            </div>
          </div>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-4 py-2 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm transition-colors"
            >
              New Pull Request
            </button>
          )}
        </div>

        {/* Inline New PR creation form */}
        {showCreate && (
          <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden mb-6 p-6">
            <h3 className="font-display text-lg font-semibold text-white tracking-wide mb-4">
              New Pull Request
            </h3>

            <div className="flex items-center gap-3 flex-wrap">
              {/* Compare branch */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#e0e0e0]/40 uppercase tracking-wider">Compare</label>
                <select
                  value={compareBranch}
                  onChange={(e) => setCompareBranch(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white text-sm focus:border-[#e0e0e0]/40 outline-none appearance-none cursor-pointer min-w-[160px]"
                >
                  <option value="" disabled>Select branch</option>
                  {compareOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>

              {/* Arrow */}
              <div className="flex items-end pb-2">
                <svg className="w-6 h-6 text-[#e0e0e0]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              {/* Base branch */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#e0e0e0]/40 uppercase tracking-wider">Base</label>
                <select
                  value={baseBranch}
                  onChange={(e) => {
                    setBaseBranch(e.target.value);
                    if (compareBranch === e.target.value) setCompareBranch('');
                  }}
                  className="px-3 py-2 rounded-lg bg-[#0a0a0a] border border-white/10 text-white text-sm focus:border-[#e0e0e0]/40 outline-none appearance-none cursor-pointer min-w-[160px]"
                >
                  {baseOptions.map((b) => (
                    <option key={b} value={b}>{b}</option>
                  ))}
                </select>
              </div>
            </div>

            {compareBranch && compareBranch !== baseBranch && (
              <p className="text-[#e0e0e0]/50 text-sm mt-4">
                Merge changes from <span className="text-white font-medium">{compareBranch}</span> into <span className="text-white font-medium">{baseBranch}</span>.
              </p>
            )}

            <div className="flex gap-3 mt-5">
              <button
                onClick={() => setShowCreate(false)}
                className="px-4 py-2.5 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleCreatePr}
                disabled={creating || !compareBranch || compareBranch === baseBranch}
                className="px-4 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-sm disabled:opacity-50 transition-colors"
              >
                {creating ? 'Creating…' : 'Create Pull Request'}
              </button>
            </div>
          </div>
        )}

        {/* PR List */}
        <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
          {loading && (
            <div className="px-6 py-12 text-center text-[#e0e0e0]/40 text-sm">Loading…</div>
          )}
          {!loading && prs.length === 0 && (
            <div className="px-6 py-12 text-center">
              <p className="text-[#e0e0e0]/40 text-sm mb-2">No pull requests yet.</p>
              <p className="text-[#e0e0e0]/30 text-xs">
                Create a branch in LMMS, push changes, then open a pull request here.
              </p>
            </div>
          )}
          {!loading && prs.length > 0 && (
            <ul className="divide-y divide-white/10">
              {prs.map((pr) => (
                <li key={pr.id}>
                  <Link
                    to={`/project/${projectId}/pr/${pr.id}`}
                    className="block px-6 py-5 hover:bg-white/5 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3">
                          <span className={`inline-block rounded px-2 py-0.5 text-xs font-medium ${STATUS_STYLES[pr.status] || STATUS_STYLES.open}`}>
                            {pr.status}
                          </span>
                          <h3 className="text-white font-medium truncate">
                            {pr.source_branch || pr.branch || 'feature'} → {pr.target_branch || 'main'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 mt-2 text-sm text-[#e0e0e0]/40">
                          <span>#{pr.id.slice(0, 7)}</span>
                          <span>by {pr.author || '—'}</span>
                          {pr.created_at && (
                            <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                          )}
                        </div>
                      </div>
                      <svg className="w-5 h-5 text-[#e0e0e0]/20 shrink-0 mt-1" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                      </svg>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
