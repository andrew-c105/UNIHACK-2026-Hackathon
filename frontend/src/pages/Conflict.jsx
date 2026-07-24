import { Link, useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import DiffWaveform from '../components/DiffWaveform';
import { api, audioUrl } from '../api';

function resolutionsKey(projectId, prId) {
  return `tracksync-conflicts-${projectId}-${prId}`;
}

export default function Conflict() {
  const { projectId } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const trackId = searchParams.get('track') || '';
  const prId = searchParams.get('pr') || '';
  const [conflict, setConflict] = useState(null);
  const [project, setProject] = useState(null);
  const [pr, setPr] = useState(null);
  const [loading, setLoading] = useState(true);
  const [resolving, setResolving] = useState(false);
  const [resolved, setResolved] = useState(null);
  const [diffData, setDiffData] = useState(null);

  useEffect(() => {
    if (!trackId || !prId) {
      setLoading(false);
      return;
    }

    Promise.all([
      api.getConflict(projectId, trackId, prId),
      api.getProject(projectId).catch(() => null),
      api.getPr(projectId, prId).catch(() => null),
    ])
      .then(([{ conflict: c }, proj, { pr: p }]) => {
        setConflict(c);
        setProject(proj?.project || null);
        setPr(p || null);

        const minePath = c?.mine_url?.match(/tracks\/(.+)$/)?.[1];
        const theirsPath = c?.theirs_url?.match(/tracks\/(.+)$/)?.[1];
        if (minePath && theirsPath) {
          api.getAudioDiff(projectId, decodeURIComponent(minePath), decodeURIComponent(theirsPath))
            .then(setDiffData)
            .catch(() => {});
        }
      })
      .catch(() => {
        setConflict(null);
        setProject(null);
      })
      .finally(() => setLoading(false));
  }, [projectId, trackId, prId]);

  const conflictTracks = (pr?.tracks || []).filter(
    (t) => t.change_type === 'conflict' || t.change_type === 'modified'
  );

  const handleResolve = async (choice) => {
    if (!prId) {
      alert('Missing pull request ID. Open conflict resolution from the pull request page.');
      return;
    }

    setResolving(true);
    try {
      const key = resolutionsKey(projectId, prId);
      const stored = JSON.parse(sessionStorage.getItem(key) || '{}');
      const trackKey = conflict?.track_id || trackId;
      stored[trackKey] = choice;
      sessionStorage.setItem(key, JSON.stringify(stored));

      const { pr: freshPr } = await api.getPr(projectId, prId);
      const conflicts = (freshPr?.tracks || []).filter(
        (t) => t.change_type === 'conflict' || t.change_type === 'modified'
      );

      const allResolved = conflicts.every((t) => stored[t.id]);
      if (!allResolved) {
        const next = conflicts.find((t) => !stored[t.id]);
        navigate(`/project/${projectId}/conflict?pr=${prId}&track=${encodeURIComponent(next.id)}`);
        return;
      }

      const resolutions = { ...stored };
      conflicts.forEach((t) => {
        if (!resolutions[t.id]) resolutions[t.id] = 'theirs';
      });

      await api.mergePr(projectId, prId, resolutions);
      sessionStorage.removeItem(key);
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

  if (!prId || !trackId || !conflict) {
    return (
      <div className="min-h-screen bg-[#0a0a0a]">
        <Navbar />
        <div className="flex flex-col items-center justify-center py-24 gap-4">
          <p className="text-[#e0e0e0]/50">Conflict not found or missing PR context.</p>
          <Link to={`/project/${projectId}/prs`} className="text-emerald-400 hover:underline">
            Back to pull requests
          </Link>
        </div>
      </div>
    );
  }

  const projectName = project?.name || projectId;
  const trackName = (conflict.track_id || trackId).replace(/_/g, ' ');
  const conflictIndex = conflictTracks.findIndex((t) => t.id === trackId || t.id === conflict.track_id);
  const conflictNum = conflictIndex >= 0 ? conflictIndex + 1 : 1;
  const conflictTotal = conflictTracks.length || 1;

  return (
    <div className="min-h-screen pb-28 bg-[#0a0a0a]">
      <Navbar />
      <div className="max-w-6xl mx-auto px-6 py-8">
        <nav className="mb-6 text-sm text-[#e0e0e0]/50">
          <Link to="/projects" className="hover:text-white transition-colors">Projects</Link>
          <span className="mx-2">&gt;</span>
          <Link to={`/project/${projectId}`} className="hover:text-white transition-colors">{projectName}</Link>
          <span className="mx-2">&gt;</span>
          <Link to={`/project/${projectId}/pr/${prId}`} className="hover:text-white transition-colors">pull request</Link>
          <span className="mx-2">&gt;</span>
          <span className="text-[#e0e0e0]/70">{trackName}.wav</span>
        </nav>

        <div className="mb-6 flex items-center gap-3">
          <h1 className="text-2xl font-bold text-white">Conflict Resolution</h1>
          {resolved ? (
            <span className="rounded px-2.5 py-0.5 text-xs font-medium bg-emerald-500/20 text-emerald-400">
              Merged — kept {resolved === 'mine' ? 'main' : 'incoming'} version
            </span>
          ) : (
            <span className="rounded px-2.5 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400">
              Conflict {conflictNum} of {conflictTotal}
            </span>
          )}
        </div>

        {conflict.target_branch && conflict.source_branch && (
          <p className="mb-4 text-sm text-[#e0e0e0]/50">
            <span className="text-white">{conflict.target_branch}</span> (mine) vs{' '}
            <span className="text-red-400">{conflict.source_branch}</span> (theirs)
          </p>
        )}

        {diffData && (
          <div className="mb-6 rounded-xl p-4 bg-[#111] border border-white/10 flex items-center gap-6 flex-wrap">
            <div>
              <span className="text-[#e0e0e0]/50 text-sm">Track: </span>
              <span className="text-white font-medium">{trackName}.wav</span>
            </div>
            <div>
              <span className="text-[#e0e0e0]/50 text-sm">Difference: </span>
              <span className="text-amber-400 font-medium">{diffData.diff_percentage}%</span>
            </div>
            <div>
              <span className="text-[#e0e0e0]/50 text-sm">Duration: </span>
              <span className="text-white font-medium">
                {diffData.duration_a?.toFixed(1)}s vs {diffData.duration_b?.toFixed(1)}s
              </span>
            </div>
          </div>
        )}

        {conflict.mine_url && conflict.theirs_url ? (
          <DiffWaveform
            urlA={audioUrl(conflict.mine_url)}
            urlB={audioUrl(conflict.theirs_url)}
            labelA={`Mine (${conflict.target_branch || 'main'})`}
            labelB={`Theirs (${conflict.source_branch || 'incoming'})`}
            diffRegions={diffData?.diff_regions || []}
            colorA="#e0e0e0"
            colorB="#f87171"
            height={100}
          />
        ) : (
          <div className="rounded-xl p-8 bg-[#111] border border-white/10 text-center text-[#e0e0e0]/40">
            Could not load both versions for comparison.
          </div>
        )}

        {!resolved && (
          <div className="mt-6 grid grid-cols-2 gap-4">
            <button
              onClick={() => handleResolve('mine')}
              disabled={resolving || !conflict.mine_url}
              className="rounded-xl p-4 text-center font-medium bg-[#111] border border-white/10 text-white hover:bg-white/10 hover:border-white/30 disabled:opacity-50 transition-colors"
            >
              Keep Mine
              <p className="text-[#e0e0e0]/40 text-sm font-normal mt-1">
                Use {conflict.target_branch || 'main'} version
              </p>
            </button>
            <button
              onClick={() => handleResolve('theirs')}
              disabled={resolving || !conflict.theirs_url}
              className="rounded-xl p-4 text-center font-medium bg-[#111] border border-red-500/20 text-red-400 hover:bg-red-500/10 hover:border-red-500/40 disabled:opacity-50 transition-colors"
            >
              Keep Theirs
              <p className="text-[#e0e0e0]/40 text-sm font-normal mt-1">
                Use {conflict.source_branch || 'incoming'} version
              </p>
            </button>
          </div>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-4 bg-[#111] border-t border-white/10">
        <div className="flex items-center gap-3">
          <span className={`h-2 w-2 rounded-full ${resolved ? 'bg-emerald-400' : 'bg-amber-400'}`} />
          <span className="text-[#e0e0e0]/50 text-sm">
            {resolved
              ? 'All conflicts resolved and merged'
              : <>Resolving conflict in <span className="text-white font-medium">{trackName}.wav</span></>}
          </span>
        </div>
        <div className="flex gap-3">
          <Link
            to={`/project/${projectId}/pr/${prId}`}
            className="rounded-lg border border-white/10 px-4 py-2 text-sm text-[#e0e0e0]/70 hover:border-[#e0e0e0]/40 transition-colors"
          >
            Back to PR
          </Link>
          {resolved && (
            <Link
              to={`/project/${projectId}`}
              className="rounded-lg px-6 py-2.5 text-sm font-medium text-white bg-emerald-600 hover:bg-emerald-500 transition-colors"
            >
              View Main Mix
            </Link>
          )}
        </div>
      </div>
    </div>
  );
}
