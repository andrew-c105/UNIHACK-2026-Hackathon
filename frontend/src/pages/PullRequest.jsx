import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Navbar from '../components/Navbar';
import { api } from '../api';

function toFullUrl(path) {
  if (!path) return '';
  return path.startsWith('/') ? `${window.location.origin}${path}` : path;
}

export default function PullRequest() {
  const { projectId, prId } = useParams();
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [merging, setMerging] = useState(false);
  const [compareLabel, setCompareLabel] = useState('0:15 - Drop Section');
  const [playingTrack, setPlayingTrack] = useState(null);
  const wsRefs = useRef({});

  useEffect(() => {
    api.getPr(projectId, prId)
      .then(({ pr: p }) => setPr(p))
      .catch(() => setPr(null))
      .finally(() => setLoading(false));
  }, [projectId, prId]);

  useEffect(() => {
    if (!pr?.tracks?.length) return;
    const refs = {};
    pr.tracks.forEach((t) => {
      const leftEl = document.getElementById(`ws-left-${t.id}`);
      const rightEl = document.getElementById(`ws-right-${t.id}`);
      if (leftEl && t.main_url) {
        const ws = WaveSurfer.create({
          container: leftEl,
          waveColor: '#f87171',
          progressColor: '#fb7185',
          height: 60,
          url: toFullUrl(t.main_url),
        });
        refs[`${t.id}-left`] = ws;
      }
      if (rightEl && t.branch_url) {
        const ws = WaveSurfer.create({
          container: rightEl,
          waveColor: '#22d3ee',
          progressColor: '#67e8f9',
          height: 60,
          url: toFullUrl(t.branch_url),
        });
        refs[`${t.id}-right`] = ws;
      }
    });
    wsRefs.current = refs;
    return () => {
      Object.values(refs).forEach((ws) => ws?.destroy?.());
    };
  }, [pr?.tracks]);

  const handleMerge = async () => {
    setMerging(true);
    try {
      const resolutions = {};
      pr?.tracks?.forEach((t) => {
        if (t.status === 'conflict') resolutions[t.id] = 'mine';
      });
      await api.mergePr(projectId, prId, resolutions);
      setPr((prev) => (prev ? { ...prev, merged: true } : null));
    } catch (err) {
      alert(err.message || 'Merge failed');
    } finally {
      setMerging(false);
    }
  };

  const playLeft = (trackId) => {
    const ws = wsRefs.current[`${trackId}-left`];
    if (ws) ws.playPause();
    setPlayingTrack(ws?.isPlaying() ? `${trackId}-left` : null);
  };
  const playRight = (trackId) => {
    const ws = wsRefs.current[`${trackId}-right`];
    if (ws) ws.playPause();
    setPlayingTrack(ws?.isPlaying() ? `${trackId}-right` : null);
  };

  if (!pr && !loading) {
    return (
      <div className="min-h-screen" style={{ backgroundColor: '#0d1117' }}>
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <p className="text-slate-400">PR not found</p>
        </div>
      </div>
    );
  }

  const nonAudioChanges = [
    { name: 'project.json', lines: '+12 lines added' },
  ];

  return (
    <div className="min-h-screen pb-24" style={{ backgroundColor: '#0d1117' }}>
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-slate-400">
          <Link to="/" className="hover:text-white">projects</Link>
          <span className="mx-2">/</span>
          <Link to={`/project/${projectId}`} className="hover:text-white">{pr?.project_id || projectId}</Link>
          <span className="mx-2">/</span>
          <span className="text-slate-300">pulls</span>
          <span className="mx-2">/</span>
          <span className="text-white">{prId}</span>
        </nav>

        {loading && <p className="text-slate-500">Loading…</p>}
        {!loading && pr && (
          <>
            {pr.merged && (
              <div
                className="mb-6 rounded-xl border p-4"
                style={{ backgroundColor: 'rgba(34, 197, 94, 0.15)', borderColor: 'rgba(34, 197, 94, 0.5)' }}
              >
                <p className="font-medium text-emerald-400">Merged successfully</p>
              </div>
            )}

            {/* PR header card */}
            <div
              className="mb-8 rounded-xl p-6"
              style={{ backgroundColor: '#141b2d', border: '1px solid #1e293b' }}
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h1 className="text-xl font-bold text-white">{pr.title || `Pull Request #${prId}`}</h1>
                  <span className="mt-2 inline-block rounded px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400">
                    Open
                  </span>
                  <p className="mt-2 text-slate-400 text-sm">
                    {pr.source_branch || 'feature/bass-boost'} → {pr.target_branch || 'main'}
                  </p>
                </div>
                <div className="flex gap-2 shrink-0">
                  <button
                    className="rounded-lg border px-4 py-2 text-sm text-slate-300"
                    style={{ borderColor: '#1e293b' }}
                  >
                    Edit
                  </button>
                  {!pr.merged && (
                    <button
                      onClick={handleMerge}
                      disabled={merging || pr.has_conflicts}
                      className="rounded-lg px-4 py-2 text-sm font-medium text-white disabled:opacity-50"
                      style={{ backgroundColor: '#22c55e' }}
                    >
                      {merging ? 'Merging…' : 'Merge Pull Request'}
                    </button>
                  )}
                </div>
              </div>
            </div>

            {/* Side-by-side audio diffs */}
            {pr.tracks?.map((t) => (
              <div
                key={t.id}
                className="mb-8 grid grid-cols-2 gap-4"
              >
                {/* Left: Previous Branch */}
                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: '#141b2d', border: '1px solid #1e293b' }}
                >
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400">
                    Previous Branch
                  </span>
                  <p className="mt-2 font-medium text-white">{t.name}.wav</p>
                  <p className="text-slate-400 text-sm">3:24 · 44.1kHz · 4.2MB</p>
                  <div
                    id={`ws-left-${t.id}`}
                    className="mt-3 rounded-lg overflow-hidden"
                    style={{ backgroundColor: '#0d1117', minHeight: 60 }}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => playLeft(t.id)}
                      className="rounded px-3 py-1.5 text-sm font-medium text-white"
                      style={{ backgroundColor: '#f87171' }}
                    >
                      Play
                    </button>
                    <div className="h-1 flex-1 rounded-full bg-slate-700">
                      <div className="h-full w-1/3 rounded-full bg-red-400" />
                    </div>
                  </div>
                </div>
                {/* Right: Compare Branch */}
                <div
                  className="rounded-xl p-5"
                  style={{ backgroundColor: '#141b2d', border: '1px solid #1e293b' }}
                >
                  <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-cyan-500/20 text-[#22d3ee]">
                    Compare Branch
                  </span>
                  <p className="mt-2 font-medium text-white">{t.name}.wav</p>
                  <p className="text-slate-400 text-sm">3:24 · 44.1kHz · 4.2MB</p>
                  <div
                    id={`ws-right-${t.id}`}
                    className="mt-3 rounded-lg overflow-hidden"
                    style={{ backgroundColor: '#0d1117', minHeight: 60 }}
                  />
                  <div className="mt-3 flex items-center gap-2">
                    <button
                      onClick={() => playRight(t.id)}
                      className="rounded px-3 py-1.5 text-sm font-medium text-white"
                      style={{ backgroundColor: '#22d3ee' }}
                    >
                      Play
                    </button>
                    <div className="h-1 flex-1 rounded-full bg-slate-700">
                      <div className="h-full w-2/3 rounded-full" style={{ backgroundColor: '#22d3ee' }} />
                    </div>
                  </div>
                </div>
              </div>
            ))}

            {/* Non-audio file changes */}
            {nonAudioChanges.map((f) => (
              <div
                key={f.name}
                className="mb-4 flex items-center justify-between rounded-lg px-4 py-3"
                style={{ backgroundColor: '#141b2d', border: '1px solid #1e293b' }}
              >
                <span className="text-white">{f.name}</span>
                <span className="text-sm text-emerald-400">{f.lines}</span>
              </div>
            ))}

            {/* Bottom floating bar */}
            <div
              className="fixed bottom-0 left-0 right-0 flex items-center justify-between gap-4 px-6 py-4"
              style={{ backgroundColor: '#141b2d', borderTop: '1px solid #1e293b' }}
            >
              <span className="text-slate-400 text-sm">
                Now Comparing: <span className="text-white">{compareLabel}</span>
              </span>
              <div className="flex items-center gap-4">
                <button className="rounded px-3 py-1.5 text-sm text-slate-400 hover:text-white">
                  ◀
                </button>
                <button className="rounded px-3 py-1.5 text-sm text-white" style={{ backgroundColor: '#22d3ee' }}>
                  ▶
                </button>
                <button className="rounded px-3 py-1.5 text-sm text-slate-400 hover:text-white">
                  ▶▶
                </button>
                <button className="rounded px-3 py-1.5 text-sm text-slate-400 hover:text-white">
                  Solo L
                </button>
                <button
                  className="rounded px-3 py-1.5 text-sm font-medium text-white"
                  style={{ backgroundColor: '#22d3ee' }}
                >
                  Sync
                </button>
                <button className="rounded px-3 py-1.5 text-sm text-slate-400 hover:text-white">
                  Solo R
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
