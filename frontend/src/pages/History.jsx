import { Link, useParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../api';

export default function History() {
  const { projectId } = useParams();
  const [history, setHistory] = useState([]);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      api.getHistory(projectId),
      api.getProject(projectId).catch(() => null),
    ])
      .then(([{ history: h }, proj]) => {
        setHistory(h || []);
        setProject(proj?.project || null);
      })
      .catch(() => {
        setHistory([]);
        setProject(null);
      })
      .finally(() => setLoading(false));
  }, [projectId]);

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />
      <div className="flex">
        {/* Left sidebar */}
        <aside className="w-72 shrink-0 border-r border-white/10 p-6">
          <div className="rounded-xl p-5 bg-[#111] border border-white/10">
            <h2 className="font-display font-semibold text-white text-lg tracking-wide">
              {project?.name || 'Project'}
            </h2>
            <div className="mt-3 space-y-1 text-sm text-[#e0e0e0]/50">
              <p>Branch: <span className="text-white">main</span></p>
              <p>Commits: {history.length}</p>
              <p>Tracks: {project?.tracks?.length ?? 0}</p>
            </div>
            <button className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-[#0a0a0a] bg-[#e0e0e0] hover:bg-white transition-colors">
              Clone Project
            </button>
          </div>
        </aside>

        {/* Main timeline */}
        <main className="flex-1 p-8">
          {loading && (
            <p className="text-[#e0e0e0]/40">Loading…</p>
          )}
          {!loading && history.length === 0 && (
            <p className="text-[#e0e0e0]/40">No commits yet.</p>
          )}
          {!loading && history.length > 0 && (
            <div className="relative">
              {/* Vertical line */}
              <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-[#e0e0e0]/30" />
              <div className="space-y-0">
                {history.map((entry, idx) => (
                  <div key={entry.id} className="relative flex gap-6 pb-8 last:pb-0">
                    {/* Timeline dot */}
                    <div className="relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full bg-[#e0e0e0]" />
                    {/* Commit card */}
                    <div className="flex-1 rounded-xl p-6 bg-[#111] border border-white/10">
                      <h3 className="font-bold text-white">{entry.message}</h3>
                      <p className="mt-1 font-mono text-sm text-[#e0e0e0]/60">
                        {entry.id}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                          style={{ backgroundColor: `hsl(${(idx * 137) % 360}, 60%, 45%)` }}
                        >
                          {(entry.author || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-[#e0e0e0]/50 text-sm">
                          {entry.author} · {entry.timestamp?.slice?.(0, 16) || '—'}
                        </span>
                        <span
                          className={`ml-2 rounded px-2 py-0.5 text-xs font-medium ${
                            idx % 3 === 0 ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'
                          }`}
                        >
                          {idx % 3 === 0 ? 'STABLE' : 'EXPERIMENTAL'}
                        </span>
                      </div>
                      {/* Waveform preview */}
                      <div className="mt-4 flex h-12 items-end gap-0.5 rounded-lg px-2 py-2 bg-[#0a0a0a]">
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-sm"
                            style={{
                              height: `${20 + (i % 5) * 12}%`,
                              backgroundColor: '#e0e0e0',
                              opacity: 0.3 + (i % 4) * 0.1,
                            }}
                          />
                        ))}
                      </div>
                      {entry.tracks_changed?.length > 0 && (
                        <div className="mt-3 space-y-1 text-sm text-emerald-400">
                          {entry.tracks_changed.map((t) => (
                            <p key={t}>+ Modified {t.replace(/_/g, ' ')}.wav</p>
                          ))}
                        </div>
                      )}
                      <div className="mt-4 flex items-center gap-4">
                        <button className="rounded-lg px-4 py-2 text-sm font-medium text-[#0a0a0a] bg-[#e0e0e0] hover:bg-white transition-colors">
                          Play Version
                        </button>
                        <Link
                          to={`/project/${projectId}`}
                          className="text-sm text-[#e0e0e0]/60 hover:text-white transition-colors"
                        >
                          View Diff
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
