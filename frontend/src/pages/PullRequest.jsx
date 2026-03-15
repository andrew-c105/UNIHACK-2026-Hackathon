import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import ProjectTabs from '../components/ProjectTabs';
import Waveform from '../components/Waveform';
import DiffWaveform from '../components/DiffWaveform';
import { api, audioUrl } from '../api';

const SILENCE_URL = '/audio/silence.wav';

const CHANGE_STYLES = {
  added: { bg: 'bg-emerald-500/10', border: 'border-emerald-500/30', badge: 'bg-emerald-500/20 text-emerald-400', label: 'Added' },
  modified: { bg: 'bg-amber-500/10', border: 'border-amber-500/30', badge: 'bg-amber-500/20 text-amber-400', label: 'Modified' },
  removed: { bg: 'bg-red-500/10', border: 'border-red-500/30', badge: 'bg-red-500/20 text-red-400', label: 'Removed' },
};

function TrackPlayer({ url, label, color = '#e0e0e0', height = 70 }) {
  if (!url) return null;
  return (
    <div className="rounded-xl p-4 bg-[#0a0a0a] border border-white/10">
      <div className="flex items-center gap-2 mb-2">
        <span className="text-xs font-medium text-[#e0e0e0]/60">{label}</span>
      </div>
      <Waveform url={audioUrl(url)} color={color} height={height} showControls={true} barWidth={2} />
    </div>
  );
}

export default function PullRequest() {
  const { projectId, prId } = useParams();
  const [pr, setPr] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [featureBranchMixUrl, setFeatureBranchMixUrl] = useState(null);
  const [baseBranchMixUrl, setBaseBranchMixUrl] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getPr(projectId, prId),
      api.getProject(projectId).catch(() => null),
    ])
      .then(([{ pr: p }, proj]) => {
        setPr(p);
        setProject(proj?.project || null);
      })
      .catch(() => setPr(null))
      .finally(() => setLoading(false));
  }, [projectId, prId]);

  useEffect(() => {
    if (!pr?.source_branch || !pr?.target_branch) return;
    Promise.all([
      api.getMainAudio(projectId, pr.source_branch).catch(() => ({ url: null })),
      api.getMainAudio(projectId, pr.target_branch).catch(() => ({ url: null })),
    ])
      .then(([{ url: featureUrl }, { url: baseUrl }]) => {
        setFeatureBranchMixUrl(featureUrl || null);
        setBaseBranchMixUrl(baseUrl || null);
      });
  }, [projectId, pr?.source_branch, pr?.target_branch]);

  const handleMerge = async () => {
    setMerging(true);
    try {
      const resolutions = {};
      pr?.tracks?.forEach((t) => {
        if (t.change_type === 'conflict') resolutions[t.id] = 'mine';
      });
      await api.mergePr(projectId, prId, resolutions);
      setPr((prev) => (prev ? { ...prev, merged: true, status: 'merged' } : null));
    } catch (err) {
      alert(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <p className="text-[#e0e0e0]/50">Loading…</p>
        </div>
      </div>
    );
  }

  if (!pr) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <p className="text-[#e0e0e0]/50">Pull request not found</p>
        </div>
      </div>
    );
  }

  const tracks = pr.tracks || [];
  const added = tracks.filter((t) => t.change_type === 'added');
  const modified = tracks.filter((t) => t.change_type === 'modified');
  const removed = tracks.filter((t) => t.change_type === 'removed');
  const changedCount = added.length + modified.length + removed.length;

  return (
    <div className="min-h-screen pb-24 bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#e0e0e0]/50 mb-4">
          <Link to="/projects" className="hover:text-white transition-colors">projects</Link>
          <span className="mx-2">/</span>
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">
            {project?.name || projectId}
          </Link>
          <span className="mx-2">/</span>
          <Link to={`/project/${projectId}/prs`} className="hover:text-white transition-colors">
            pull requests
          </Link>
          <span className="mx-2">/</span>
          <span className="text-white">#{prId.slice(0, 7)}</span>
        </nav>

        <ProjectTabs projectId={projectId} activeTab="prs" />

        {/* Merged banner */}
        {pr.merged && (
          <div className="mb-6 rounded-xl border p-4 bg-purple-500/10 border-purple-500/30">
            <p className="font-medium text-purple-400">This pull request has been merged.</p>
          </div>
        )}

        {/* PR Header */}
        <div className="mb-8 rounded-xl p-6 bg-[#111] border border-white/10">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-bold text-white">
                {pr.source_branch} → {pr.target_branch}
              </h1>
              <div className="flex items-center gap-3 mt-3">
                <span className={`inline-block rounded px-2.5 py-0.5 text-xs font-medium ${
                  pr.merged
                    ? 'bg-purple-500/20 text-purple-400'
                    : 'bg-emerald-500/20 text-emerald-400'
                }`}>
                  {pr.merged ? 'Merged' : 'Open'}
                </span>
                {pr.author && (
                  <span className="text-[#e0e0e0]/40 text-sm">by {pr.author}</span>
                )}
                {pr.created_at && (
                  <span className="text-[#e0e0e0]/40 text-sm">
                    {new Date(pr.created_at).toLocaleDateString()}
                  </span>
                )}
              </div>

              {/* Changes summary */}
              <div className="flex items-center gap-4 mt-4 text-sm">
                <span className="text-[#e0e0e0]/50">
                  {changedCount} file{changedCount !== 1 ? 's' : ''} changed
                </span>
                {added.length > 0 && (
                  <span className="text-emerald-400">+{added.length} added</span>
                )}
                {modified.length > 0 && (
                  <span className="text-amber-400">~{modified.length} modified</span>
                )}
                {removed.length > 0 && (
                  <span className="text-red-400">-{removed.length} removed</span>
                )}
              </div>
            </div>

            <div className="flex gap-2 shrink-0">
              {pr.has_conflicts && (
                <Link
                  to={`/project/${projectId}/conflict?track=${tracks.find((t) => t.change_type === 'conflict')?.id || ''}`}
                  className="rounded-lg border border-amber-500/50 px-4 py-2 text-sm text-amber-400 hover:bg-amber-500/10 transition-colors"
                >
                  Resolve Conflicts
                </Link>
              )}
              {!pr.merged && (
                <button
                  onClick={handleMerge}
                  disabled={merging || pr.has_conflicts}
                  className="rounded-lg px-5 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 transition-colors"
                >
                  {merging ? 'Merging…' : 'Merge Pull Request'}
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Full composition playback — feature & base branch */}
        <div className="mb-8 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="rounded-xl bg-[#111] border border-emerald-500/20 overflow-hidden">
            <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-display font-semibold text-emerald-400 tracking-wide text-sm">
                Full composition — {pr.source_branch}
              </h2>
              <span className="text-[#e0e0e0]/40 text-xs">All tracks mixed</span>
            </div>
            <div className="p-6">
              {featureBranchMixUrl ? (
                <Waveform
                  url={featureBranchMixUrl.startsWith('http') ? featureBranchMixUrl : audioUrl(featureBranchMixUrl)}
                  height={100}
                  showControls={true}
                  color="#34d399"
                />
              ) : (
                <div className="flex items-center justify-center min-h-[100px] text-[#e0e0e0]/30 text-sm">
                  No main mix on {pr.source_branch} — push or merge to generate
                </div>
              )}
            </div>
          </div>
          <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
            <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
              <h2 className="font-display font-semibold text-white tracking-wide text-sm">
                Full composition — {pr.target_branch}
              </h2>
              <span className="text-[#e0e0e0]/40 text-xs">Base branch</span>
            </div>
            <div className="p-6">
              {baseBranchMixUrl ? (
                <Waveform
                  url={baseBranchMixUrl.startsWith('http') ? baseBranchMixUrl : audioUrl(baseBranchMixUrl)}
                  height={100}
                  showControls={true}
                />
              ) : (
                <div className="flex items-center justify-center min-h-[100px] text-[#e0e0e0]/30 text-sm">
                  No main mix on {pr.target_branch}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* ===== ADDED TRACKS ===== */}
        {added.length > 0 && (
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-emerald-400 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
              </svg>
              Added Tracks ({added.length})
            </h2>
            <div className="space-y-4">
              {added.map((t) => (
                <div key={t.id} className={`rounded-xl border ${CHANGE_STYLES.added.border} ${CHANGE_STYLES.added.bg} overflow-hidden`}>
                  <div className="px-6 py-3 border-b border-emerald-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${CHANGE_STYLES.added.badge}`}>
                        Added
                      </span>
                      <h3 className="text-white font-medium">{t.name}</h3>
                    </div>
                    <span className="text-emerald-400/60 text-xs">Only in {pr.source_branch}</span>
                  </div>
                  <div className="p-6">
                    <p className="text-[#e0e0e0]/50 text-sm mb-3">
                      New track in <span className="text-white">{pr.source_branch}</span> — not present in {pr.target_branch}
                    </p>
                    <DiffWaveform
                      urlA={audioUrl(SILENCE_URL)}
                      urlB={audioUrl(t.compare_url)}
                      labelA={`${pr.target_branch} (empty)`}
                      labelB={`${pr.source_branch}`}
                      height={80}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== MODIFIED TRACKS ===== */}
        {modified.length > 0 && (
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-amber-400 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
              </svg>
              Modified Tracks ({modified.length})
            </h2>
            <div className="space-y-6">
              {modified.map((t) => (
                <div key={t.id} className={`rounded-xl border ${CHANGE_STYLES.modified.border} ${CHANGE_STYLES.modified.bg} overflow-hidden`}>
                  <div className="px-6 py-3 border-b border-amber-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${CHANGE_STYLES.modified.badge}`}>
                        Modified
                      </span>
                      <h3 className="text-white font-medium">{t.name}</h3>
                    </div>
                    <span className="text-amber-400/60 text-xs">Changed between branches</span>
                  </div>
                  <div className="p-6">
                    <DiffWaveform
                      urlA={audioUrl(t.base_url)}
                      urlB={audioUrl(t.compare_url)}
                      labelA={`${pr.target_branch} (base)`}
                      labelB={`${pr.source_branch} (compare)`}
                      height={80}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* ===== REMOVED TRACKS ===== */}
        {removed.length > 0 && (
          <section className="mb-8">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-red-400 uppercase tracking-wider mb-4">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M20 12H4" />
              </svg>
              Removed Tracks ({removed.length})
            </h2>
            <div className="space-y-4">
              {removed.map((t) => (
                <div key={t.id} className={`rounded-xl border ${CHANGE_STYLES.removed.border} ${CHANGE_STYLES.removed.bg} overflow-hidden`}>
                  <div className="px-6 py-3 border-b border-red-500/20 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <span className={`rounded px-2 py-0.5 text-xs font-medium ${CHANGE_STYLES.removed.badge}`}>
                        Removed
                      </span>
                      <h3 className="text-white font-medium">{t.name}</h3>
                    </div>
                    <span className="text-red-400/60 text-xs">Only in {pr.target_branch}</span>
                  </div>
                  <div className="p-6">
                    <p className="text-[#e0e0e0]/50 text-sm mb-3">
                      This track exists in <span className="text-white">{pr.target_branch}</span> but was removed in {pr.source_branch}
                    </p>
                    <DiffWaveform
                      urlA={audioUrl(t.base_url)}
                      urlB={audioUrl(SILENCE_URL)}
                      labelA={`${pr.target_branch}`}
                      labelB={`${pr.source_branch} (removed)`}
                      height={80}
                    />
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

      </div>
    </div>
  );
}
