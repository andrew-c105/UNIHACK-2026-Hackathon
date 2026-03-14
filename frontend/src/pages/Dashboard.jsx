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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#e0e0e0]/50">Loading…</p>
      </div>
    );
  }

  const tracks = session?.tracks ?? [];
  const audioCount = tracks.length;

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#e0e0e0]/50 mb-6">
          <Link to="/" className="hover:text-white transition-colors">projects</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{project.name}</span>
        </nav>

        <div className="flex gap-8">
          {/* LEFT SIDEBAR - 1/3 */}
          <aside className="w-1/3 shrink-0">
            <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
              {/* Album art placeholder */}
              <div className="aspect-square bg-gradient-to-br from-[#1a1a1a] to-[#0a0a0a] flex items-center justify-center">
                <span className="text-6xl text-[#e0e0e0]/30">♪</span>
              </div>
              <div className="p-6">
                <h1 className="font-display text-2xl font-semibold text-white tracking-wide mb-4">{project.name}</h1>
                <div className="flex flex-wrap gap-2 mb-4">
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#e0e0e0]/10 text-[#e0e0e0] border border-[#e0e0e0]/20">
                    Electronic
                  </span>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-[#e0e0e0]/10 text-[#e0e0e0] border border-[#e0e0e0]/20">
                    Synthwave
                  </span>
                </div>
                <dl className="space-y-2 text-sm text-[#e0e0e0]/50 mb-6">
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
                  className="block w-full py-3 rounded-lg bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-medium text-center transition-colors"
                >
                  Clone Project
                </Link>
              </div>
            </div>
          </aside>

          {/* MAIN CONTENT - 2/3 */}
          <main className="flex-1 min-w-0">
            {/* Waveform playback area */}
            <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden mb-6">
              <div className="p-6 flex flex-col items-center justify-center min-h-[200px]">
                {/* Waveform placeholder bars */}
                <div className="flex items-end gap-1 h-16 mb-6">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1.5 rounded-full bg-[#e0e0e0]/30"
                      style={{ height: `${20 + Math.sin(i * 0.5) * 30}%` }}
                    />
                  ))}
                </div>
                <div className="flex items-center gap-4">
                  <button
                    onClick={togglePlay}
                    disabled={!mainAudio}
                    className="w-12 h-12 rounded-full bg-[#e0e0e0] hover:bg-white disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-[#0a0a0a] transition-colors"
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
            <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
              <div className="px-6 py-4 border-b border-white/10">
                <h2 className="font-display font-semibold text-white tracking-wide">Files</h2>
              </div>
              <ul className="divide-y divide-white/10">
                {!session && (
                  <li className="px-6 py-8 text-[#e0e0e0]/40 text-sm">Loading tracks…</li>
                )}
                {session && tracks.length === 0 && (
                  <li className="px-6 py-8 text-[#e0e0e0]/40 text-sm">No tracks yet.</li>
                )}
                {session && tracks.map((t) => (
                  <li key={t.id} className="px-6 py-4 flex items-center gap-4 hover:bg-white/5 transition-colors">
                    <span className="text-[#e0e0e0]/60 text-lg">♪</span>
                    <span className="text-white font-medium flex-1">{t.name}</span>
                    <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[t.status_type] || 'bg-[#e0e0e0]/30'}`} title={t.status} />
                    <span className="text-[#e0e0e0]/40 text-sm">Updated by…</span>
                    <span className="text-[#e0e0e0]/40 text-sm">—</span>
                  </li>
                ))}
              </ul>
            </div>

            {/* Navigation links */}
            <div className="flex gap-4 mt-6">
              <Link
                to={`/project/${projectId}/session`}
                className="px-4 py-2 rounded-lg bg-[#111] border border-white/10 text-[#e0e0e0] hover:border-[#e0e0e0]/40 hover:bg-white/5 transition-colors"
              >
                Session
              </Link>
              <Link
                to={`/project/${projectId}/history`}
                className="px-4 py-2 rounded-lg bg-[#111] border border-white/10 text-[#e0e0e0] hover:border-[#e0e0e0]/40 hover:bg-white/5 transition-colors"
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
