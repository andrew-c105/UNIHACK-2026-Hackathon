import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../api';

const STATUS_COLORS = {
  up: 'bg-emerald-500',
  conflict: 'bg-red-500',
  changed: 'bg-amber-500',
};

export default function Dashboard() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [mainAudio, setMainAudio] = useState(null);
  const [playing, setPlaying] = useState(false);
  const audioRef = useRef(null);

  useEffect(() => {
    api.getProject(projectId).then(({ project: p }) => setProject(p)).catch(() => setProject(null));
    api.getSession(projectId).then(({ session: s }) => setSession(s)).catch(() => setSession(null));
    api.getMainAudio(projectId).then(({ url }) => setMainAudio(url)).catch(() => setMainAudio(null));
  }, [projectId]);

  const togglePlay = () => {
    if (!mainAudio) return;
    const url = mainAudio.startsWith('http') ? mainAudio : window.location.origin + mainAudio;
    if (!audioRef.current || audioRef.current.src !== url) {
      audioRef.current = new Audio(url);
    }
    if (playing) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setPlaying(!playing);
    audioRef.current.onended = () => setPlaying(false);
  };

  if (!project) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-slate-400">Loading…</p>
      </div>
    );
  }

  const tracks = session?.tracks ?? [];
  const audioCount = tracks.length;

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-slate-400 mb-6">
          <Link to="/" className="hover:text-[#22d3ee] transition-colors">projects</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{project.name}</span>
        </nav>

        <div className="flex gap-8">
          {/* LEFT SIDEBAR - 1/3 */}
          <aside className="w-1/3 shrink-0">
            <div className="rounded-xl bg-[#141b2d] border border-[#1e293b] overflow-hidden">
              {/* Album art placeholder */}
              <div className="aspect-square bg-gradient-to-br from-cyan-900/40 to-slate-800 flex items-center justify-center">
                <span className="text-6xl text-[#22d3ee]/60">♪</span>
              </div>
              <div className="p-6">
                <h1 className="font-display text-2xl font-semibold text-white mb-4">{project.name}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40">
                    Electronic
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#22d3ee]/20 text-[#22d3ee] border border-[#22d3ee]/40">
                    Synthwave
                  </span>
                </div>
                <dl className="space-y-2 text-sm text-slate-400 mb-6">
                  <div className="flex justify-between">
                    <dt>Branch</dt>
                    <dd className="text-white">main</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Last Updated</dt>
                    <dd className="text-white">{project.updated_at ? new Date(project.updated_at).toLocaleDateString() : '—'}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Audio Files</dt>
                    <dd className="text-white">{audioCount}</dd>
                  </div>
                  <div className="flex justify-between">
                    <dt>Collaborators</dt>
                    <dd className="text-white">—</dd>
                  </div>
                </dl>
                <Link
                  to={`/project/${projectId}/session`}
                  className="block w-full py-3 rounded-lg bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d1117] font-medium text-center transition-colors"
                >
                  Clone Project
                </Link>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT - 2/3 */}
          <main className="flex-1 min-w-0">
            {/* Waveform playback area */}
            <div className="rounded-xl bg-[#141b2d] border border-[#1e293b] overflow-hidden mb-6">
              <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                {/* Waveform placeholder bars */}
                <div className="flex items-end gap-1 h-16 mb-6">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-[#22d3ee]/50"
                      style={{ height: `${20 + Math.sin(i * 0.5) * 30}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    disabled={!mainAudio}
                    className="w-12 h-12 rounded-full bg-[#22d3ee] hover:bg-[#22d3ee]/90 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-[#0d1117] transition-colors"
                  >
                    {playing ? (
                      <span className="text-xl">⏸</span>
                    ) : (
                      <span className="text-xl ml-0.5">▶</span>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Files section */}
            <div className="rounded-xl bg-[#141b2d] border border-[#1e293b] overflow-hidden">
              <div className="px-6 py-4 border-b border-[#1e293b]">
                <h2 className="font-display font-semibold text-white">Files</h2>
              </div>
              <ul className="divide-y divide-[#1e293b]">
                {!session && (
                  <li className="px-6 py-8 text-slate-500 text-sm">Loading tracks…</li>
                )}
                {session && tracks.length === 0 && (
                  <li className="px-6 py-8 text-slate-500 text-sm">No tracks yet.</li>
                )}
                {session && tracks.map((t) => (
                  <li key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-[#1e293b]/30 transition-colors">
                    <span className="text-[#22d3ee] text-lg">♪</span>
                    <span className="text-white font-medium flex-1">{t.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[t.status_type] || 'bg-slate-500'}`} title={t.status} />
                    <span className="text-slate-500 text-sm">Updated by…</span>
                    <span className="text-slate-500 text-sm">—</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation links */}
            <div className="flex gap-4 mt-6">
              <Link
                to={`/project/${projectId}/session`}
                className="px-4 py-2 rounded-lg bg-[#141b2d] border border-[#1e293b] text-[#22d3ee] hover:border-[#22d3ee]/50 hover:bg-[#22d3ee]/10 transition-colors"
              >
                Session
              </Link>
              <Link
                to={`/project/${projectId}/history`}
                className="px-4 py-2 rounded-lg bg-[#141b2d] border border-[#1e293b] text-[#22d3ee] hover:border-[#22d3ee]/50 hover:bg-[#22d3ee]/10 transition-colors"
              >
                History
              </Link>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
