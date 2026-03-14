import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import { api } from '../api';

const STATUS_COLORS = {
  up: 'bg-emerald-500',
  conflict: 'bg-red-500',
  changed: 'bg-amber-500',
};

const STATUS_LABELS = {
  up: 'Synced',
  conflict: 'Conflicted',
  changed: 'Modified',
};

export default function Session() {
  const { projectId } = useParams();
  const [session, setSession] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pushOpen, setPushOpen] = useState(false);
  const [pullOpen, setPullOpen] = useState(false);
  const [commitMsg, setCommitMsg] = useState('');
  const [files, setFiles] = useState([]);
  const [pushing, setPushing] = useState(false);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const fileInputRef = useRef(null);

  const loadSession = () => {
    setLoading(true);
    api.getSession(projectId)
      .then(({ session: s }) => setSession(s))
      .catch(() => setSession(null))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    loadSession();
    api.getProject(projectId).then(({ project: p }) => setProject(p)).catch(() => setProject(null));
  }, [projectId]);

  const handlePush = async (e) => {
    e.preventDefault();
    if (!commitMsg.trim() || files.length === 0) {
      alert('Add a commit message and select track files.');
      return;
    }
    setPushing(true);
    try {
      await api.pushFiles(projectId, files, commitMsg.trim());
      setPushOpen(false);
      setCommitMsg('');
      setFiles([]);
      if (fileInputRef.current) fileInputRef.current.value = '';
      loadSession();
    } catch (err) {
      alert(err.message || 'Push failed');
    } finally {
      setPushing(false);
    }
  };

  const handlePull = async () => {
    try {
      await api.pull(projectId);
      setPullOpen(false);
      loadSession();
    } catch (err) {
      alert(err.message || 'Pull failed');
    }
  };

  if (!session && !loading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <p className="text-slate-400">Project not found</p>
      </div>
    );
  }

  const tracks = session?.tracks ?? [];
  const selectedTrackData = selectedTrack ? tracks.find((t) => t.id === selectedTrack) : tracks[0];

  return (
    <div className="min-h-screen bg-[#0d1117]">
      <Navbar />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* LEFT PANEL - Track list */}
        <aside className="w-72 shrink-0 border-r border-[#1e293b] flex flex-col bg-[#0d1117]">
          <div className="p-4 border-b border-[#1e293b] flex items-center justify-between">
            <h2 className="font-display font-semibold text-white">Tracks ({tracks.length})</h2>
            <button
              onClick={() => setPushOpen(true)}
              className="w-8 h-8 rounded-lg bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d1117] font-bold flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {loading && (
              <li className="px-4 py-8 text-slate-500 text-sm">Loading…</li>
            )}
            {!loading && tracks.length === 0 && (
              <li className="px-4 py-8 text-slate-500 text-sm">No tracks yet. Push some files.</li>
            )}
            {!loading && tracks.map((t) => (
              <li
                key={t.id}
                onClick={() => setSelectedTrack(t.id)}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-l-2 ${
                  (selectedTrack ? selectedTrack === t.id : tracks[0]?.id === t.id)
                    ? 'border-[#22d3ee] bg-[#22d3ee]/10'
                    : 'border-transparent hover:bg-[#141b2d]'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[t.status_type] || 'bg-slate-500'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{t.name}</div>
                  <div className="text-slate-500 text-xs">
                    V1 · {STATUS_LABELS[t.status_type] || t.status} · —
                  </div>
                </div>
              </li>
            ))}
          </ul>
        </aside>

        {/* CENTER PANEL - Waveform display */}
        <main className="flex-1 flex flex-col min-w-0 overflow-hidden">
          {/* Breadcrumb */}
          <nav className="px-6 py-3 border-b border-[#1e293b] text-sm text-slate-400">
            <Link to="/" className="hover:text-[#22d3ee] transition-colors">projects</Link>
            <span className="mx-2">/</span>
            <Link to={`/project/${projectId}`} className="hover:text-[#22d3ee] transition-colors">{project?.name || '…'}</Link>
            <span className="mx-2">/</span>
            <span className="text-white">session</span>
          </nav>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <h1 className="font-display text-xl font-semibold text-white">{project?.name || 'Session'}</h1>
              <div className="flex gap-4 text-sm text-slate-400 mt-1">
                <span>Branch: main</span>
                <span>Updated: {project?.updated_at ? new Date(project.updated_at).toLocaleDateString() : '—'}</span>
                <span>Contributors: —</span>
              </div>
            </div>

            {/* Waveform visualization */}
            <div className="rounded-xl bg-[#141b2d] border border-[#1e293b] overflow-hidden mb-6">
              <div className="p-8 flex flex-col items-center justify-center min-h-[240px]">
                <div className="flex items-end gap-1 h-24 mb-8">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[#22d3ee]/40 animate-pulse"
                      style={{
                        height: `${25 + Math.sin(i * 0.4) * 35}%`,
                        animationDelay: `${i * 20}ms`,
                      }}
                    />
                  ))}
                </div>
                {/* Playback bar */}
                <div className="w-full max-w-2xl space-y-2">
                  <div className="h-1.5 rounded-full bg-[#1e293b] overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-[#22d3ee]" />
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button className="w-10 h-10 rounded-full bg-[#141b2d] border border-[#1e293b] text-slate-400 hover:text-[#22d3ee] hover:border-[#22d3ee]/50 flex items-center justify-center transition-colors">
                      ⏮
                    </button>
                    <button className="w-12 h-12 rounded-full bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d1117] flex items-center justify-center transition-colors">
                      <span className="ml-0.5">▶</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-[#141b2d] border border-[#1e293b] text-slate-400 hover:text-[#22d3ee] hover:border-[#22d3ee]/50 flex items-center justify-center transition-colors">
                      ⏭
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Action links */}
            <div className="flex flex-wrap gap-3">
              <button
                onClick={() => setPushOpen(true)}
                className="px-4 py-2 rounded-lg bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d1117] font-medium transition-colors"
              >
                Push My Changes
              </button>
              <button
                onClick={() => setPullOpen(true)}
                className="px-4 py-2 rounded-lg border border-[#1e293b] text-slate-300 hover:border-[#22d3ee]/50 hover:text-[#22d3ee] transition-colors"
              >
                Pull Latest
              </button>
              <Link
                to={`/project/${projectId}/pr/pr-1`}
                className="px-4 py-2 rounded-lg border border-[#1e293b] text-slate-300 hover:border-[#22d3ee]/50 hover:text-[#22d3ee] transition-colors"
              >
                View Pull Request
              </Link>
              <Link
                to={`/project/${projectId}/conflict?track=Bass_Synth`}
                className="px-4 py-2 rounded-lg border border-amber-500/50 text-amber-400 hover:bg-amber-500/10 transition-colors"
              >
                Resolve Conflict
              </Link>
            </div>
          </div>
        </main>

        {/* RIGHT PANEL - Track details */}
        <aside className="w-80 shrink-0 border-l border-[#1e293b] flex flex-col bg-[#0d1117]">
          <div className="p-4 border-b border-[#1e293b]">
            <h2 className="font-display font-semibold text-white">
              {selectedTrackData?.name || 'Select a track'}
            </h2>
            <p className="text-slate-500 text-sm mt-1">Author: —</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-semibold text-slate-500 uppercase tracking-wider mb-3">
              Commit History
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#22d3ee]" />
                    {i < 3 && <div className="w-0.5 flex-1 bg-[#1e293b] min-h-[20px]" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-white text-sm font-medium">Commit {i}</div>
                    <div className="text-slate-500 text-xs">— ago</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-[#1e293b] space-y-2">
            <button
              onClick={() => setPullOpen(true)}
              className="w-full py-3 rounded-lg border border-[#1e293b] text-slate-300 hover:border-[#22d3ee]/50 hover:text-[#22d3ee] transition-colors"
            >
              Pull
            </button>
            <button
              onClick={() => setPushOpen(true)}
              className="w-full py-3 rounded-lg bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d1117] font-medium transition-colors"
            >
              Push Changes
            </button>
          </div>
        </aside>
      </div>

      {/* Push Modal */}
      {pushOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141b2d] rounded-2xl border border-[#1e293b] max-w-md w-full p-6">
            <h3 className="font-display text-xl font-semibold text-white mb-4">Add Changes & Push</h3>
            <form onSubmit={handlePush} className="space-y-4">
              <div>
                <label className="block text-slate-400 text-sm mb-2">Commit message</label>
                <input
                  type="text"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="e.g. added vocal ostinato, tweaked bass"
                  className="w-full px-4 py-3 rounded-lg bg-[#0d1117] border border-[#1e293b] text-white placeholder-slate-500 focus:border-[#22d3ee]/50 focus:ring-1 focus:ring-[#22d3ee]/30 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-slate-400 text-sm mb-2">Track files (.wav)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="w-full text-slate-400 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#22d3ee] file:text-[#0d1117] file:font-medium file:cursor-pointer hover:file:bg-[#22d3ee]/90"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPushOpen(false)}
                  className="flex-1 py-3 rounded-lg bg-[#1e293b] hover:bg-[#1e293b]/80 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pushing}
                  className="flex-1 py-3 rounded-lg bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d1117] font-medium disabled:opacity-50 transition-colors"
                >
                  {pushing ? 'Pushing…' : 'Push'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Pull Modal */}
      {pullOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#141b2d] rounded-2xl border border-[#1e293b] max-w-md w-full p-6">
            <h3 className="font-display text-xl font-semibold text-white mb-4">Pull Latest</h3>
            <p className="text-slate-400 mb-6">Fetch the latest changes from main.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPullOpen(false)}
                className="flex-1 py-3 rounded-lg bg-[#1e293b] hover:bg-[#1e293b]/80 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePull}
                className="flex-1 py-3 rounded-lg bg-[#22d3ee] hover:bg-[#22d3ee]/90 text-[#0d1117] font-medium transition-colors"
              >
                Pull
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
