import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import WaveSurfer from 'wavesurfer.js';
import Navbar from '../components/Navbar';
import { api } from '../api';

function toFullUrl(path) {
  if (!path) return '';
  return path.startsWith('/') ? `${window.location.origin}${path}` : path;
}

export default function Conflict() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const trackId = searchParams.get('track') || 'Bass_Synth';
  const [conflict, setConflict] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const mineRef = useRef(null);
  const theirsRef = useRef(null);
  const wavesurferMineRef = useRef(null);
  const wavesurferTheirsRef = useRef(null);

  useEffect(() => {
    Promise.all([
      api.getConflict(projectId, trackId),
      api.getProject(projectId).catch(() => null),
    ])
      .then(([{ conflict: c }, proj]) => {
        setConflict(c || {
          mine_url: `/api/audio/${projectId}/tracks/${trackId}.wav`,
          theirs_url: `/api/audio/${projectId}/tracks/${trackId}.wav`,
          track_id: trackId,
        });
        setProject(proj?.project || null);
      })
      .catch(() => {
        setConflict({
          mine_url: `/api/audio/${projectId}/tracks/${trackId}.wav`,
          theirs_url: `/api/audio/${projectId}/tracks/${trackId}.wav`,
          track_id: trackId,
        });
        setProject(null);
      })
      .finally(() => setLoading(false));
  }, [projectId, trackId]);

  useEffect(() => {
    if (!conflict || !mineRef.current || !theirsRef.current) return;

    const mineUrl = toFullUrl(conflict.mine_url);
    const theirsUrl = toFullUrl(conflict.theirs_url);

    const wsMine = WaveSurfer.create({
      container: mineRef.current,
      waveColor: '#e0e0e0',
      progressColor: '#fff',
      height: 100,
      url: mineUrl,
    });
    const wsTheirs = WaveSurfer.create({
      container: theirsRef.current,
      waveColor: '#f87171',
      progressColor: '#fb7185',
      height: 100,
      url: theirsUrl,
    });

    wavesurferMineRef.current = wsMine;
    wavesurferTheirsRef.current = wsTheirs;

    return () => {
      wsMine.destroy();
      wsTheirs.destroy();
    };
  }, [conflict]);

  const handleResolve = async (choice) => {
    setResolving(true);
    try {
      await api.mergePr(projectId, 'pr-1', { [conflict.track_id]: choice });
      setResolving(false);
    } catch (err) {
      alert(err.message || 'Failed');
      setResolving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="flex items-center justify-center py-24">
          <p className="text-[#e0e0e0]/50">Loading conflict…</p>
        </div>
      </div>
    );
  }

  const projectName = project?.name || projectId;
  const trackName = trackId.replace(/_/g, ' ');

  return (
    <div className="min-h-screen pb-24 bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-[#e0e0e0]/50">
          <Link to="/" className="hover:text-white transition-colors">Projects</Link>
          <span className="mx-2">&gt;</span>
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">{projectName}</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-[#e0e0e0]/70">{trackName}.mp3</span>
        </nav>

        {/* Title */}
        <div className="mb-8 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">
            Merging &quot;feature/bass-boost&quot; into &quot;main&quot;
          </h1>
          <span className="rounded px-2.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400">
            1 Conflict
          </span>
        </div>

        {/* Two side-by-side panels */}
        <div className="grid grid-cols-2 gap-6 mb-8">
          {/* Left: Main Branch */}
          <div className="rounded-xl p-6 relative bg-[#111] border border-white/10">
            <h3 className="font-semibold text-white mb-2">Main Branch</h3>
            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-[#e0e0e0]/10 text-[#e0e0e0]">
              Current
            </span>
            <p className="mt-2 text-[#e0e0e0]/50 text-sm">Last edited 2 hours ago by @producer</p>
            <div className="mt-4 relative">
              <div
                ref={mineRef}
                className="rounded-lg overflow-hidden bg-[#0a0a0a]"
                style={{ minHeight: 100 }}
              />
              {/* Conflict zone overlay - middle section */}
              <div
                className="absolute inset-0 pointer-events-none flex justify-center items-stretch"
                aria-hidden
              >
                <div className="w-1/3 opacity-30 bg-red-500" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded px-2 py-1 text-xs text-[#e0e0e0]/50 bg-[#0a0a0a]">
                BPM: 128
              </span>
              <span className="rounded px-2 py-1 text-xs text-[#e0e0e0]/50 bg-[#0a0a0a]">
                Key: Cm
              </span>
              <span className="rounded px-2 py-1 text-xs text-[#e0e0e0]/50 bg-[#0a0a0a]">
                Size: 4.2MB
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => wavesurferMineRef.current?.playPause()}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => handleResolve('mine')}
                disabled={resolving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-[#0a0a0a] bg-[#e0e0e0] hover:bg-white disabled:opacity-50 transition-colors"
              >
                Keep Mine
              </button>
            </div>
          </div>

          {/* Right: Incoming Branch */}
          <div className="rounded-xl p-6 relative bg-[#111] border border-white/10">
            <h3 className="font-semibold text-white mb-2">Incoming Branch</h3>
            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400">
              Incoming
            </span>
            <p className="mt-2 text-[#e0e0e0]/50 text-sm">Last edited 1 hour ago by @producer</p>
            <div className="mt-4 relative">
              <div
                ref={theirsRef}
                className="rounded-lg overflow-hidden bg-[#0a0a0a]"
                style={{ minHeight: 100 }}
              />
              {/* Conflict zone overlay - middle section */}
              <div
                className="absolute inset-0 pointer-events-none flex justify-center items-stretch"
                aria-hidden
              >
                <div className="w-1/3 opacity-30 bg-red-500" />
              </div>
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="rounded px-2 py-1 text-xs text-[#e0e0e0]/50 bg-[#0a0a0a]">
                BPM: 128
              </span>
              <span className="rounded px-2 py-1 text-xs text-[#e0e0e0]/50 bg-[#0a0a0a]">
                Key: Cm
              </span>
              <span className="rounded px-2 py-1 text-xs text-[#e0e0e0]/50 bg-[#0a0a0a]">
                Size: 4.2MB
              </span>
            </div>
            <div className="mt-4 flex gap-2">
              <button
                onClick={() => wavesurferTheirsRef.current?.playPause()}
                className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 transition-colors"
              >
                Preview
              </button>
              <button
                onClick={() => handleResolve('theirs')}
                disabled={resolving}
                className="rounded-lg px-4 py-2 text-sm font-medium text-white bg-red-500 hover:bg-red-400 disabled:opacity-50 transition-colors"
              >
                Keep Theirs
              </button>
            </div>
          </div>
        </div>

        {/* Center divider with navigation arrows */}
        <div className="flex justify-center gap-4 mb-8">
          <button className="rounded-full p-2 text-[#e0e0e0]/50 hover:text-white bg-[#111] border border-white/10 transition-colors">
            ◀
          </button>
          <button className="rounded-full p-2 text-[#e0e0e0]/50 hover:text-white bg-[#111] border border-white/10 transition-colors">
            ▶
          </button>
        </div>

        {/* Bottom sticky bar */}
        <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-[#111] border-t border-white/10">
          <div className="flex items-center gap-3">
            <span className="h-2 w-2 rounded-full bg-amber-400" />
            <span className="text-[#e0e0e0]/50 text-sm">
              Resolving <span className="text-white font-medium">1 conflict</span> in {trackName}.mp3
            </span>
          </div>
          <div className="flex gap-3">
            <button className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 transition-colors">
              Open in Editor
            </button>
            <button className="rounded-lg px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors">
              Confirm Merge
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
