import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import DiffWaveform from '../components/DiffWaveform';
import { api, audioUrl } from '../api';

export default function Conflict() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const trackId = searchParams.get('track') || 'Bass_Synth';
  const [conflict, setConflict] = useState(null);
  const [project, setProject] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(null);
  const [diffData, setDiffData] = useState(null);

  useEffect(() => {
    Promise.all([
      api.getConflict(projectId, trackId),
      api.getProject(projectId).catch(() => null),
    ])
      .then(([{ conflict: c }, proj]) => {
        const conflictData = c || {
          mine_url: `/api/audio/${projectId}/tracks/${trackId}.wav`,
          theirs_url: `/api/audio/${projectId}/tracks/${trackId}.wav`,
          track_id: trackId,
        };
        setConflict(conflictData);
        setProject(proj?.project || null);

        const mineFile = conflictData.mine_url?.split('/tracks/')[1];
        const theirsFile = conflictData.theirs_url?.split('/tracks/')[1];
        if (mineFile && theirsFile) {
          api.getAudioDiff(projectId, mineFile, theirsFile)
            .then(setDiffData)
            .catch(() => {});
        }
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

  const handleResolve = async (choice) => {
    setResolving(true);
    try {
      await api.mergePr(projectId, 'pr-1', { [conflict.track_id]: choice });
      setResolved(choice);
    } catch (err) {
      alert(err.message || 'Resolution failed');
    } finally {
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
    <div className="min-h-screen pb-28 bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        {/* Breadcrumb */}
        <nav className="mb-6 text-sm text-[#e0e0e0]/50">
          <Link to="/" className="hover:text-white transition-colors">Projects</Link>
          <span className="mx-2">&gt;</span>
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">{projectName}</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-[#e0e0e0]/70">{trackName}.wav</span>
        </nav>

        {/* Title */}
        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Conflict Resolution</h1>
          {resolved ? (
            <span className="rounded px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400">
              Resolved — kept {resolved === 'mine' ? 'mine' : 'theirs'}
            </span>
          ) : (
            <span className="rounded px-2.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400">
              1 Conflict
            </span>
          )}
        </div>

        {/* Diff info */}
        {diffData && (
          <div className="mb-6 rounded-xl p-4 bg-[#111] border border-white/10 flex items-center gap-6">
            <div>
              <span className="text-[#e0e0e0]/50 text-sm">Track: </span>
              <span className="text-white font-medium">{trackName}.wav</span>
            </div>
            <div>
              <span className="text-[#e0e0e0]/50 text-sm">Difference: </span>
              <span className="text-amber-400 font-medium">{diffData.diff_percentage}%</span>
            </div>
            <div>
              <span className="text-[#e0e0e0]/50 text-sm">Regions: </span>
              <span className="text-amber-400 font-medium">{diffData.diff_regions?.length || 0}</span>
            </div>
            <div>
              <span className="text-[#e0e0e0]/50 text-sm">Duration: </span>
              <span className="text-white font-medium">
                {diffData.duration_a?.toFixed(1)}s vs {diffData.duration_b?.toFixed(1)}s
              </span>
            </div>
          </div>
        )}

        {/* Side-by-side diff */}
        {conflict && (
          <DiffWaveform
            urlA={audioUrl(conflict.mine_url)}
            urlB={audioUrl(conflict.theirs_url)}
            labelA="Mine (Current)"
            labelB="Theirs (Incoming)"
            diffRegions={diffData?.diff_regions || []}
            colorA="#e0e0e0"
            colorB="#f87171"
            height={100}
          />
        )}

        {/* Resolution buttons */}
        {!resolved && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => handleResolve('mine')}
              disabled={resolving}
              className="rounded-xl p-4 text-center font-medium bg-[#111] border border-white/10 text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-50 transition-colors"
            >
              Keep Mine
              <p className="text-[#e0e0e0]/40 text-sm font-normal mt-1">Use the current branch version</p>
            </button>
            <button
              onClick={() => handleResolve('theirs')}
              disabled={resolving}
              className="rounded-xl p-4 text-center font-medium bg-[#111] border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50 transition-colors"
            >
              Keep Theirs
              <p className="text-[#e0e0e0]/40 text-sm font-normal mt-1">Use the incoming branch version</p>
            </button>
          </div>
        )}
      </div>

      {/* Bottom bar */}
      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-[#111] border-t border-white/10">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${resolved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-[#e0e0e0]/50 text-sm">
            {resolved
              ? `Conflict resolved — kept ${resolved === 'mine' ? 'mine' : 'theirs'}`
              : <>Resolving <span className="text-white font-medium">1 conflict</span> in {trackName}.wav</>
            }
          </span>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/project/${projectId}`}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 transition-colors"
          >
            Back to Composition
          </Link>
          {resolved && (
            <Link
              to={`/project/${projectId}`}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              Done
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
