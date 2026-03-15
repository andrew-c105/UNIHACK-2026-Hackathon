import { Link, useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import ProjectTabs from '../components/ProjectTabs';
import { api } from '../api';

const STATUS_STYLES = {
  open: 'bg-emerald-500/20 text-emerald-400',
  merged: 'bg-purple-500/20 text-purple-400',
  closed: 'bg-red-500/20 text-red-400',
};

function BranchDropdown({ value, options, onChange, placeholder = "Select branch" }) {
  const [open, setOpen] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  return (
    <div className="relative inline-block min-w-[200px]" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between gap-3 px-4 py-2.5 rounded-xl bg-[#0a0a0a] border border-white/10 hover:border-[#e0e0e0]/40 transition-colors text-base font-medium text-left shadow-sm"
      >
        <span className={value ? "text-white" : "text-[#e0e0e0]/40"}>{value || placeholder}</span>
        <svg className="w-5 h-5 text-[#e0e0e0]/40 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-xl bg-[#111] border border-white/10 shadow-xl overflow-hidden max-h-48 overflow-y-auto">
          {options.map((b) => (
            <button
              key={b}
              onClick={() => { onChange(b); setOpen(false); }}
              className={`w-full text-left px-3 py-2 text-sm transition-colors ${
                b === value
                  ? 'bg-white/10 text-white font-medium'
                  : 'text-[#e0e0e0]/70 hover:bg-white/5 hover:text-white'
              }`}
            >
              {b}
            </button>
          ))}
          {options.length === 0 && (
            <div className="px-3 py-2 text-sm text-[#e0e0e0]/40">No branches</div>
          )}
        </div>
      )}
    </div>
  );
}

export default function PullRequests() {
  const { projectId } = useParams();
  const navigate = useNavigate();
  const [prs, setPrs] = useState([]);
  const [project, setProject] = useState(null);
  const [branches, setBranches] = useState([]);
  const [loading, setLoading] = useState(true);

  const [showCreate, setShowCreate] = useState(false);
  const [baseBranch, setBaseBranch] = useState('master');
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
        const nonMain = (b || []).filter((br) => br !== 'master');
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

      <div className="max-w-[1600px] w-full mx-auto px-8 py-8">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#e0e0e0]/50 mb-6">
          <Link to="/projects" className="hover:text-white transition-colors">projects</Link>
          <span className="mx-2">/</span>
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">
            {project?.name || projectId}
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">pull requests</span>
        </nav>

        <div className="mb-10">
          <ProjectTabs projectId={projectId} activeTab="prs" />
        </div>

        {/* Header */}
        <div className="flex items-center justify-between mb-10">
          <div>
            <h1 className="font-sans text-4xl md:text-5xl font-bold text-white tracking-tight drop-shadow-sm">Pull Requests</h1>
            <div className="flex gap-4 mt-3 text-lg text-[#e0e0e0]/50">
              <span className="font-medium">{openCount} open</span>
              <span className="font-medium">{mergedCount} merged</span>
            </div>
          </div>
          {!showCreate && (
            <button
              onClick={() => setShowCreate(true)}
              className="px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-lg transition-colors shadow-sm"
            >
              New Pull Request
            </button>
          )}
        </div>

        {/* Inline New PR creation form */}
        {showCreate && (
          <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden mb-6 p-6">
            <h3 className="font-sans text-lg font-semibold text-white tracking-wide mb-4">
              New Pull Request
            </h3>

            <div className="flex items-end gap-3 flex-wrap">
              {/* Compare branch */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#e0e0e0]/40 uppercase tracking-wider">Compare</label>
                <BranchDropdown
                  value={compareBranch}
                  options={compareOptions}
                  onChange={setCompareBranch}
                  placeholder="Select branch"
                />
              </div>

              {/* Arrow */}
              <div className="pb-2 shrink-0">
                <svg className="w-5 h-5 text-[#e0e0e0]/30" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                </svg>
              </div>

              {/* Base branch */}
              <div className="flex flex-col gap-1">
                <label className="text-xs text-[#e0e0e0]/40 uppercase tracking-wider">Base</label>
                <BranchDropdown
                  value={baseBranch}
                  options={baseOptions}
                  onChange={(val) => {
                    setBaseBranch(val);
                    if (compareBranch === val) setCompareBranch('');
                  }}
                  placeholder="Select branch"
                />
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
        <div className="rounded-2xl bg-[#111] border border-white/10 overflow-hidden shadow-lg">
          {loading && (
            <div className="px-8 py-16 text-center text-[#e0e0e0]/40 text-lg">Loading…</div>
          )}
          {!loading && prs.length === 0 && (
            <div className="px-8 py-20 text-center">
              <p className="text-[#e0e0e0]/60 text-xl font-medium mb-3">No pull requests yet.</p>
              <p className="text-[#e0e0e0]/40 text-base">
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
                    className="block px-8 py-6 hover:bg-white/5 transition-colors group"
                  >
                    <div className="flex items-start justify-between gap-6">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-4">
                          <span className={`inline-block rounded-md px-2.5 py-1 text-sm font-bold tracking-wide uppercase ${STATUS_STYLES[pr.status] || STATUS_STYLES.open}`}>
                            {pr.status}
                          </span>
                          <h3 className="text-white text-xl font-semibold truncate group-hover:text-[#e0e0e0] transition-colors">
                            {pr.source_branch || pr.branch || 'feature'} → {pr.target_branch || 'main'}
                          </h3>
                        </div>
                        <div className="flex items-center gap-3 mt-3 text-base font-medium text-[#e0e0e0]/40">
                          <span>#{pr.id.slice(0, 7)}</span>
                          <span>•</span>
                          <span>by {pr.author || '—'}</span>
                          {pr.created_at && (
                            <>
                              <span>•</span>
                              <span>{new Date(pr.created_at).toLocaleDateString()}</span>
                            </>
                          )}
                        </div>
                      </div>
                      <svg className="w-6 h-6 text-[#e0e0e0]/20 shrink-0 mt-2 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
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
