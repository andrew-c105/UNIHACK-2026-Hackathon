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
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#e0e0e0]/50">Project not found</p>
      </div>
    );
  }

  const tracks = session?.tracks ?? [];
  const selectedTrackData = selectedTrack ? tracks.find((t) => t.id === selectedTrack) : tracks[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="flex h-[calc(100vh-4rem)]">
        {/* LEFT PANEL - Track list */}
        <aside className="w-72 shrink-0 border-r border-white/10 flex flex-col bg-[#0a0a0a]">
          <div className="p-4 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-display font-semibold text-white tracking-wide">Tracks ({tracks.length})</h2>
            <button
              onClick={() => setPushOpen(true)}
              className="w-8 h-8 rounded-lg bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-bold flex items-center justify-center transition-colors"
            >
              +
            </button>
          </div>
          <ul className="flex-1 overflow-y-auto">
            {loading && (
              <li className="px-4 py-8 text-[#e0e0e0]/40 text-sm">Loading…</li>
            )}
            {!loading && tracks.length === 0 && (
              <li className="px-4 py-8 text-[#e0e0e0]/40 text-sm">No tracks yet. Push some files.</li>
            )}
            {!loading && tracks.map((t) => (
              <li
                key={t.id}
                onClick={() => setSelectedTrack(t.id)}
                className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-l-2 ${
                  (selectedTrack ? selectedTrack === t.id : tracks[0]?.id === t.id)
                    ? 'border-[#e0e0e0] bg-[#e0e0e0]/10'
                    : 'border-transparent hover:bg-white/5'
                }`}
              >
                <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[t.status_type] || 'bg-[#e0e0e0]/30'}`} />
                <div className="flex-1 min-w-0">
                  <div className="text-white font-medium truncate">{t.name}</div>
                  <div className="text-[#e0e0e0]/40 text-xs">
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
          <nav className="px-6 py-3 border-b border-white/10 text-sm text-[#e0e0e0]/50">
            <Link to="/" className="hover:text-white transition-colors">projects</Link>
            <span className="mx-2">/</span>
            <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">{project?.name || '…'}</Link>
            <span className="mx-2">/</span>
            <span className="text-white">session</span>
          </nav>

          <div className="flex-1 overflow-y-auto p-6">
            <div className="mb-4">
              <h1 className="font-display text-xl font-semibold text-white tracking-wide">{project?.name || 'Session'}</h1>
              <div className="flex gap-4 text-sm text-[#e0e0e0]/50 mt-1">
                <span>Branch: main</span>
                <span>Updated: {project?.updated_at ? new Date(project.updated_at).toLocaleDateString() : '—'}</span>
                <span>Contributors: —</span>
              </div>
            </div>

            {/* Waveform visualization */}
            <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden mb-6">
              <div className="p-8 flex flex-col items-center justify-center min-h-[240px]">
                <div className="flex items-end gap-1 h-24 mb-8">
                  {Array.from({ length: 48 }).map((_, i) => (
                    <div
                      key={i}
                      className="w-1 rounded-full bg-[#e0e0e0]/25 animate-pulse"
                      style={{
                        height: `${25 + Math.sin(i * 0.4) * 35}%`,
                        animationDelay: `${i * 20}ms`,
                      }}
                    />
                  ))}
                </div>
                {/* Playback bar */}
                <div className="w-full max-w-2xl space-y-2">
                  <div className="h-1.5 rounded-full bg-white/10 overflow-hidden">
                    <div className="h-full w-1/3 rounded-full bg-[#e0e0e0]" />
                  </div>
                  <div className="flex items-center justify-center gap-4">
                    <button className="w-10 h-10 rounded-full bg-[#111] border border-white/10 text-[#e0e0e0]/50 hover:text-white hover:border-[#e0e0e0]/40 flex items-center justify-center transition-colors">
                      ⏮
                    </button>
                    <button className="w-12 h-12 rounded-full bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] flex items-center justify-center transition-colors">
                      <span className="ml-0.5">▶</span>
                    </button>
                    <button className="w-10 h-10 rounded-full bg-[#111] border border-white/10 text-[#e0e0e0]/50 hover:text-white hover:border-[#e0e0e0]/40 flex items-center justify-center transition-colors">
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
                className="px-4 py-2 rounded-lg bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-medium transition-colors"
              >
                Push My Changes
              </button>
              <button
                onClick={() => setPullOpen(true)}
                className="px-4 py-2 rounded-lg border border-white/10 text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 hover:text-white transition-colors"
              >
                Pull Latest
              </button>
              <Link
                to={`/project/${projectId}/pr/pr-1`}
                className="px-4 py-2 rounded-lg border border-white/10 text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 hover:text-white transition-colors"
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
        <aside className="w-80 shrink-0 border-l border-white/10 flex flex-col bg-[#0a0a0a]">
          <div className="p-4 border-b border-white/10">
            <h2 className="font-display font-semibold text-white tracking-wide">
              {selectedTrackData?.name || 'Select a track'}
            </h2>
            <p className="text-[#e0e0e0]/40 text-sm mt-1">Author: —</p>
          </div>
          <div className="flex-1 overflow-y-auto p-4">
            <h3 className="text-xs font-semibold text-[#e0e0e0]/40 uppercase tracking-wider mb-3">
              Commit History
            </h3>
            <div className="space-y-3">
              {[1, 2, 3].map((i) => (
                <div key={i} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <div className="w-2.5 h-2.5 rounded-full bg-[#e0e0e0]" />
                    {i < 3 && <div className="w-0.5 flex-1 bg-white/10 min-h-[20px]" />}
                  </div>
                  <div className="pb-4">
                    <div className="text-white text-sm font-medium">Commit {i}</div>
                    <div className="text-[#e0e0e0]/40 text-xs">— ago</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
          <div className="p-4 border-t border-white/10 space-y-2">
            <button
              onClick={() => setPullOpen(true)}
              className="w-full py-3 rounded-lg border border-white/10 text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 hover:text-white transition-colors"
            >
              Pull
            </button>
            <button
              onClick={() => setPushOpen(true)}
              className="w-full py-3 rounded-lg bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-medium transition-colors"
            >
              Push Changes
            </button>
          </div>
        </aside>
      </div>

      {/* Push Modal */}
      {pushOpen && (
        <div className="fixed inset-0 bg-black/70 flex items-center justify-center z-50 p-4">
          <div className="bg-[#111] rounded-2xl border border-white/10 max-w-md w-full p-6">
            <h3 className="font-display text-xl font-semibold text-white mb-4 tracking-wide">Add Changes & Push</h3>
            <form onSubmit={handlePush} className="space-y-4">
              <div>
                <label className="block text-[#e0e0e0]/50 text-sm mb-2">Commit message</label>
                <input
                  type="text"
                  value={commitMsg}
                  onChange={(e) => setCommitMsg(e.target.value)}
                  placeholder="e.g. added vocal ostinato, tweaked bass"
                  className="w-full px-4 py-3 rounded-lg bg-[#0a0a0a] border border-white/10 text-white placeholder-[#e0e0e0]/30 focus:border-[#e0e0e0]/40 focus:ring-1 focus:ring-[#e0e0e0]/20 outline-none transition-colors"
                />
              </div>
              <div>
                <label className="block text-[#e0e0e0]/50 text-sm mb-2">Track files (.wav)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".wav,.mp3"
                  multiple
                  onChange={(e) => setFiles(Array.from(e.target.files || []))}
                  className="w-full text-[#e0e0e0]/50 text-sm file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:bg-[#e0e0e0] file:text-[#0a0a0a] file:font-medium file:cursor-pointer hover:file:bg-white"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setPushOpen(false)}
                  className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={pushing}
                  className="flex-1 py-3 rounded-lg bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-medium disabled:opacity-50 transition-colors"
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
          <div className="bg-[#111] rounded-2xl border border-white/10 max-w-md w-full p-6">
            <h3 className="font-display text-xl font-semibold text-white mb-4 tracking-wide">Pull Latest</h3>
            <p className="text-[#e0e0e0]/50 mb-6">Fetch the latest changes from main.</p>
            <div className="flex gap-3">
              <button
                onClick={() => setPullOpen(false)}
                className="flex-1 py-3 rounded-lg bg-white/10 hover:bg-white/15 text-white transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handlePull}
                className="flex-1 py-3 rounded-lg bg-[#e0e0e0] hover:bg-white text-[#0a0a0a] font-medium transition-colors"
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
