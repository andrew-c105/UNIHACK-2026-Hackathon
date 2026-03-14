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
    <div className="min-h-screen" style={{ backgroundColor: '#0d1117' }}>
      <Navbar />
      <div className="flex">
        {/* Left sidebar */}
        <aside className="w-72 shrink-0 border-r p-6" style={{ borderColor: '#1e293b' }}>
          <div
            className="rounded-xl p-5"
            style={{ backgroundColor: '#141b2d', border: '1px solid #1e293b' }}
          >
            <h2 className="font-semibold text-white text-lg">
              {project?.name || 'Project'}
            </h2>
            <div className="mt-3 space-y-1 text-sm text-slate-400">
              <p>Branch: <span className="text-[#22d3ee]">main</span></p>
              <p>Commits: {history.length}</p>
              <p>Tracks: {project?.tracks?.length ?? 0}</p>
            </div>
            <button
              className="mt-4 w-full rounded-lg py-2.5 text-sm font-medium text-white transition-colors hover:opacity-90"
              style={{ backgroundColor: '#22d3ee' }}
            >
              Clone Project
            </button>
          </div>
        </aside>

        {/* Main timeline */}
        <main className="flex-1 p-8">
          {loading && (
            <p className="text-slate-500">Loading…</p>
          )}
          {!loading && history.length === 0 && (
            <p className="text-slate-500">No commits yet.</p>
          )}
          {!loading && history.length > 0 && (
            <div className="relative">
              {/* Vertical line */}
              <div
                className="absolute left-[19px] top-2 bottom-2 w-0.5"
                style={{ backgroundColor: '#22d3ee', opacity: 0.5 }}
              />
              <div className="space-y-0">
                {history.map((entry, idx) => (
                  <div key={entry.id} className="relative flex gap-6 pb-8 last:pb-0">
                    {/* Timeline dot */}
                    <div
                      className="relative z-10 mt-1.5 h-4 w-4 shrink-0 rounded-full"
                      style={{ backgroundColor: '#22d3ee' }}
                    />
                    {/* Commit card */}
                    <div
                      className="flex-1 rounded-xl p-6"
                      style={{ backgroundColor: '#141b2d', border: '1px solid #1e293b' }}
                    >
                      <h3 className="font-bold text-white">{entry.message}</h3>
                      <p className="mt-1 font-mono text-sm" style={{ color: '#22d3ee' }}>
                        {entry.id}
                      </p>
                      <div className="mt-3 flex items-center gap-2">
                        <div
                          className="h-6 w-6 rounded-full flex items-center justify-center text-xs font-medium text-white"
                          style={{ backgroundColor: `hsl(${(idx * 137) % 360}, 60%, 45%)` }}
                        >
                          {(entry.author || '?')[0].toUpperCase()}
                        </div>
                        <span className="text-slate-400 text-sm">
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
                      <div
                        className="mt-4 flex h-12 items-end gap-0.5 rounded-lg px-2 py-2"
                        style={{ backgroundColor: '#0d1117' }}
                      >
                        {Array.from({ length: 24 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-1 rounded-sm transition-opacity"
                            style={{
                              height: `${20 + (i % 5) * 12}%`,
                              backgroundColor: '#22d3ee',
                              opacity: 0.6 + (i % 4) * 0.1,
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
                        <button
                          className="rounded-lg px-4 py-2 text-sm font-medium text-white transition-colors hover:opacity-90"
                          style={{ backgroundColor: '#22d3ee' }}
                        >
                          Play Version
                        </button>
                        <Link
                          to={`/project/${projectId}`}
                          className="text-sm text-[#22d3ee] hover:underline"
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
