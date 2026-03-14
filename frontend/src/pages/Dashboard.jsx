import { Link, useParams } from 'react-router-dom';
import { useState, useEffect, useRef } from 'react';
import Navbar from '../components/Navbar';
import Waveform from '../components/Waveform';
import BranchSelector from '../components/BranchSelector';
import ProjectTabs from '../components/ProjectTabs';
import { api, audioUrl } from '../api';

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

export default function Dashboard() {
  const { projectId } = useParams();
  const [project, setProject] = useState(null);
  const [session, setSession] = useState(null);
  const [history, setHistory] = useState([]);
  const [selectedTrack, setSelectedTrack] = useState(null);
  const [copied, setCopied] = useState(false);
  const [branch, setBranch] = useState('main');
  const [loading, setLoading] = useState(true);
  const [mainAudioUrl, setMainAudioUrl] = useState(null);
  const [description, setDescription] = useState('');
  const [savingDesc, setSavingDesc] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const coverInputRef = useRef(null);

  const copyId = () => {
    navigator.clipboard.writeText(projectId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const loadDashboard = () => {
    setLoading(true);
    setSelectedTrack(null);
    api.getDashboard(projectId, 'producer-1', branch)
      .then(({ project: p, session: s, history: h, main_audio_url: mainUrl }) => {
        setProject(p);
        setDescription(p?.description ?? '');
        setSession(s);
        setHistory(h || []);
        setMainAudioUrl(mainUrl || null);
      })
      .catch(() => {
        setSession(null);
        setHistory([]);
        setMainAudioUrl(null);
      })
      .finally(() => setLoading(false));
  };

  const saveDescription = async () => {
    setSavingDesc(true);
    try {
      await api.updateProject(projectId, description);
      setProject((p) => (p ? { ...p, description } : null));
    } catch (err) {
      alert(err.message || 'Failed to save');
    } finally {
      setSavingDesc(false);
    }
  };

  const handleCoverUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file || !file.type.startsWith('image/')) return;
    setUploadingCover(true);
    try {
      const { url } = await api.uploadCover(projectId, file);
      setProject((p) => (p ? { ...p, cover_url: url } : null));
    } catch (err) {
      alert(err.message || 'Upload failed');
    } finally {
      setUploadingCover(false);
      if (coverInputRef.current) coverInputRef.current.value = '';
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [projectId, branch]);

  if (!project && !loading) {
    return (
      <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
        <p className="text-[#e0e0e0]/50">Project not found</p>
      </div>
    );
  }

  const tracks = session?.tracks ?? [];
  const activeTrack = selectedTrack
    ? tracks.find((t) => t.id === selectedTrack)
    : tracks[0];

  return (
    <div className="min-h-screen bg-[#0a0a0a]">
      <Navbar />

      <div className="max-w-6xl mx-auto px-6 py-6">
        {/* Breadcrumb */}
        <nav className="text-sm text-[#e0e0e0]/50 mb-4">
          <Link to="/" className="hover:text-white transition-colors">projects</Link>
          <span className="mx-2">/</span>
          <span className="text-white">{project?.name || '…'}</span>
        </nav>

        <ProjectTabs projectId={projectId} activeTab="composition" />

        {/* Header: cover + title + description */}
        <div className="flex gap-6 mb-6">
          <input
            ref={coverInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            onChange={handleCoverUpload}
            className="hidden"
          />
          <button
            onClick={() => coverInputRef.current?.click()}
            disabled={uploadingCover}
            className="shrink-0 w-32 h-32 rounded-xl bg-[#111] border border-white/10 overflow-hidden hover:border-white/20 transition-colors flex items-center justify-center"
          >
            {project?.cover_url ? (
              <img
                src={audioUrl(project.cover_url)}
                alt="Cover"
                className="w-full h-full object-cover"
              />
            ) : (
              <span className="text-3xl text-[#e0e0e0]/30">
                {uploadingCover ? '…' : '🖼'}
              </span>
            )}
          </button>
          <div className="flex-1 min-w-0 flex flex-col justify-center gap-2">
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="font-display text-2xl font-semibold text-white tracking-wide">
                {project?.name || 'Composition'}
              </h1>
              <button
                onClick={copyId}
                className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-[#0a0a0a] border border-white/10 hover:border-[#e0e0e0]/40 transition-colors group"
                title="Copy Project ID for LMMS"
              >
                <span className="font-mono text-xs text-[#e0e0e0]/50 group-hover:text-white transition-colors">
                  {projectId}
                </span>
                <span className="text-xs text-[#e0e0e0]/30 group-hover:text-emerald-400 transition-colors">
                  {copied ? '✓' : '⎘'}
                </span>
              </button>
            </div>
            <div className="flex items-center gap-3">
              <BranchSelector projectId={projectId} value={branch} onChange={setBranch} />
            </div>
            <div className="flex items-start gap-2 mt-1">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Add a description…"
                rows={2}
                className="flex-1 min-w-0 px-3 py-2 rounded-lg bg-[#111] border border-white/10 text-[#e0e0e0] placeholder-[#e0e0e0]/30 focus:border-[#e0e0e0]/40 outline-none resize-none text-sm"
              />
              <button
                onClick={saveDescription}
                disabled={savingDesc}
                className="shrink-0 px-3 py-2 rounded-lg bg-white/10 hover:bg-white/15 text-white text-sm disabled:opacity-50 transition-colors"
              >
                {savingDesc ? '…' : 'Save'}
              </button>
            </div>
          </div>
        </div>

        {/* Main mix waveform — full composition */}
        <div className="mb-6 rounded-xl bg-[#111] border border-white/10 overflow-hidden">
          <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
            <h2 className="font-display font-semibold text-white tracking-wide text-sm">
              Main mix — {branch}
            </h2>
            <span className="text-[#e0e0e0]/40 text-xs">
              {tracks.length} track{tracks.length !== 1 ? 's' : ''}
            </span>
          </div>
          <div className="p-6">
            {mainAudioUrl ? (
              <Waveform
                url={mainAudioUrl.startsWith('http') ? mainAudioUrl : audioUrl(mainAudioUrl)}
                height={100}
                showControls={true}
              />
            ) : (
              <div className="flex items-center justify-center min-h-[100px] text-[#e0e0e0]/30 text-sm">
                {loading ? 'Loading…' : 'No main mix yet — push or merge tracks to generate'}
              </div>
            )}
          </div>
        </div>

        <div className="flex gap-6">
          {/* LEFT COLUMN — Track list */}
          <aside className="w-72 shrink-0">
            <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
              <div className="px-4 py-3 border-b border-white/10">
                <h2 className="font-display font-semibold text-white tracking-wide text-sm">
                  Tracks ({tracks.length})
                </h2>
              </div>
              <ul className="max-h-[60vh] overflow-y-auto">
                {loading && (
                  <li className="px-4 py-8 text-[#e0e0e0]/40 text-sm">Loading…</li>
                )}
                {!loading && tracks.length === 0 && (
                  <li className="px-4 py-8 text-[#e0e0e0]/40 text-sm">
                    No tracks on this branch yet.
                  </li>
                )}
                {!loading && tracks.map((t) => {
                  const isActive = activeTrack?.id === t.id;
                  return (
                    <li
                      key={t.id}
                      onClick={() => setSelectedTrack(t.id)}
                      className={`px-4 py-3 flex items-center gap-3 cursor-pointer transition-colors border-l-2 ${
                        isActive
                          ? 'border-[#e0e0e0] bg-[#e0e0e0]/10'
                          : 'border-transparent hover:bg-white/5'
                      }`}
                    >
                      <span
                        className={`w-2.5 h-2.5 rounded-full shrink-0 ${STATUS_COLORS[t.status_type] || 'bg-[#e0e0e0]/30'}`}
                        title={t.status}
                      />
                      <div className="flex-1 min-w-0">
                        <div className="text-white font-medium truncate">{t.name}</div>
                        <div className="text-[#e0e0e0]/40 text-xs">
                          {STATUS_LABELS[t.status_type] || t.status}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </div>
          </aside>

          {/* RIGHT COLUMN — Waveform + Commit History */}
          <main className="flex-1 min-w-0 space-y-6">
            {/* Waveform player */}
            <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
              <div className="px-6 py-3 border-b border-white/10 flex items-center justify-between">
                <h2 className="font-display font-semibold text-white tracking-wide text-sm">
                  {activeTrack?.name || 'Select a track'}
                </h2>
                {activeTrack && (
                  <span className="text-[#e0e0e0]/40 text-xs">.wav</span>
                )}
              </div>
              <div className="p-6">
                {activeTrack ? (
                  <Waveform
                    url={audioUrl(`/audio/${projectId}/branch/${branch}/tracks/${encodeURIComponent(activeTrack.filename || activeTrack.id + '.wav')}`)}
                    height={100}
                    showControls={true}
                  />
                ) : (
                  <div className="flex items-center justify-center min-h-[100px] text-[#e0e0e0]/30 text-sm">
                    {loading ? 'Loading…' : 'No track selected'}
                  </div>
                )}
              </div>
            </div>

            {/* Commit History */}
            <div className="rounded-xl bg-[#111] border border-white/10 overflow-hidden">
              <div className="px-6 py-3 border-b border-white/10">
                <h2 className="font-display font-semibold text-white tracking-wide text-sm">
                  Commit History
                </h2>
              </div>
              <div className="p-6">
                {history.length === 0 && (
                  <p className="text-[#e0e0e0]/40 text-sm">
                    {loading ? 'Loading…' : 'No commits on this branch yet.'}
                  </p>
                )}
                {history.length > 0 && (
                  <div className="relative">
                    <div className="absolute left-[7px] top-2 bottom-2 w-0.5 bg-white/10" />
                    <div className="space-y-0">
                      {history.map((entry, idx) => (
                        <div key={entry.id} className="relative flex gap-4 pb-6 last:pb-0">
                          <div className="relative z-10 mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full bg-[#e0e0e0]" />
                          <div className="flex-1 min-w-0">
                            <div className="text-white text-sm font-medium">{entry.message}</div>
                            <div className="flex items-center gap-2 mt-1 text-xs text-[#e0e0e0]/40">
                              <div
                                className="h-4 w-4 rounded-full flex items-center justify-center text-[10px] font-medium text-white"
                                style={{ backgroundColor: `hsl(${(idx * 137) % 360}, 60%, 45%)` }}
                              >
                                {(entry.author || '?')[0].toUpperCase()}
                              </div>
                              <span>{entry.author}</span>
                              <span>·</span>
                              <span>{entry.timestamp?.slice?.(0, 16) || '—'}</span>
                              {entry.tracks_changed?.length > 0 && (
                                <span className="rounded px-1.5 py-0.5 bg-[#e0e0e0]/10 text-[#e0e0e0]/60">
                                  {entry.tracks_changed.length} track{entry.tracks_changed.length !== 1 ? 's' : ''}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
