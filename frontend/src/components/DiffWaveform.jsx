import { useEffect, useRef, useState, useCallback } from 'react';
import WaveSurfer from 'wavesurfer.js';

function toFullUrl(path) {
  if (!path) return '';
  return path.startsWith('/') ? `${window.location.origin}${path}` : path;
}

function formatTime(sec) {
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function DiffWaveform({
  urlA,
  urlB,
  labelA = 'Version A',
  labelB = 'Version B',
  diffRegions = [],
  colorA = '#e0e0e0',
  colorB = '#f87171',
  height = 80,
}) {
  const containerA = useRef(null);
  const containerB = useRef(null);
  const wsA = useRef(null);
  const wsB = useRef(null);
  const [playingA, setPlayingA] = useState(false);
  const [playingB, setPlayingB] = useState(false);
  const [readyA, setReadyA] = useState(false);
  const [readyB, setReadyB] = useState(false);

  useEffect(() => {
    if (!containerA.current || !containerB.current) return;
    setReadyA(false);
    setReadyB(false);

    const a = WaveSurfer.create({
      container: containerA.current,
      waveColor: colorA,
      progressColor: '#fff',
      cursorColor: '#fff',
      height,
      url: toFullUrl(urlA),
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });

    const b = WaveSurfer.create({
      container: containerB.current,
      waveColor: colorB,
      progressColor: '#fb7185',
      cursorColor: '#fb7185',
      height,
      url: toFullUrl(urlB),
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });

    a.on('ready', () => setReadyA(true));
    b.on('ready', () => setReadyB(true));
    a.on('play', () => setPlayingA(true));
    a.on('pause', () => setPlayingA(false));
    a.on('finish', () => setPlayingA(false));
    b.on('play', () => setPlayingB(true));
    b.on('pause', () => setPlayingB(false));
    b.on('finish', () => setPlayingB(false));

    wsA.current = a;
    wsB.current = b;

    return () => {
      a.destroy();
      b.destroy();
      wsA.current = null;
      wsB.current = null;
    };
  }, [urlA, urlB]);

  const togglePlayA = useCallback(() => {
    if (!wsA.current) return;
    wsA.current.isPlaying() ? wsA.current.pause() : wsA.current.play();
  }, []);

  const togglePlayB = useCallback(() => {
    if (!wsB.current) return;
    wsB.current.isPlaying() ? wsB.current.pause() : wsB.current.play();
  }, []);

  const handleSeekToRegion = useCallback((region) => {
    const ratio = region.start_pct;
    if (wsA.current) wsA.current.seekTo(Math.min(ratio, 1));
    if (wsB.current) wsB.current.seekTo(Math.min(ratio, 1));
  }, []);

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        {/* Version A */}
        <div className="rounded-xl p-5 bg-[#111] border border-white/10 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-[#e0e0e0]/10 text-[#e0e0e0]">
              {labelA}
            </span>
            <button
              onClick={togglePlayA}
              disabled={!readyA}
              className="w-9 h-9 rounded-full bg-[#e0e0e0] hover:bg-white disabled:opacity-40 text-[#0a0a0a] flex items-center justify-center transition-colors text-sm"
              title="Play / Pause"
            >
              {playingA ? '⏸' : '▶'}
            </button>
          </div>
          <div className="relative">
            <div
              ref={containerA}
              className="rounded-lg overflow-hidden bg-[#0a0a0a]"
              style={{ minHeight: height }}
            />
            {diffRegions.map((r, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-amber-500/20 border-l border-r border-amber-500/40 cursor-pointer hover:bg-amber-500/30 transition-colors"
                style={{
                  left: `${r.start_pct * 100}%`,
                  width: `${(r.end_pct - r.start_pct) * 100}%`,
                }}
                onClick={() => handleSeekToRegion(r)}
                title={`Diff: ${formatTime(r.start)} – ${formatTime(r.end)}`}
              />
            ))}
          </div>
        </div>

        {/* Version B */}
        <div className="rounded-xl p-5 bg-[#111] border border-white/10 relative">
          <div className="flex items-center justify-between mb-3">
            <span className="inline-block rounded px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400">
              {labelB}
            </span>
            <button
              onClick={togglePlayB}
              disabled={!readyB}
              className="w-9 h-9 rounded-full bg-[#fb7185] hover:bg-red-400 disabled:opacity-40 text-[#0a0a0a] flex items-center justify-center transition-colors text-sm"
              title="Play / Pause"
            >
              {playingB ? '⏸' : '▶'}
            </button>
          </div>
          <div className="relative">
            <div
              ref={containerB}
              className="rounded-lg overflow-hidden bg-[#0a0a0a]"
              style={{ minHeight: height }}
            />
            {diffRegions.map((r, i) => (
              <div
                key={i}
                className="absolute top-0 bottom-0 bg-amber-500/20 border-l border-r border-amber-500/40 cursor-pointer hover:bg-amber-500/30 transition-colors"
                style={{
                  left: `${r.start_pct * 100}%`,
                  width: `${(r.end_pct - r.start_pct) * 100}%`,
                }}
                onClick={() => handleSeekToRegion(r)}
                title={`Diff: ${formatTime(r.start)} – ${formatTime(r.end)}`}
              />
            ))}
          </div>
        </div>
      </div>

      {diffRegions.length > 0 && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[#e0e0e0]/50 text-xs mr-2">
            Jump to diff:
          </span>
          {diffRegions.map((r, i) => (
            <button
              key={i}
              onClick={() => handleSeekToRegion(r)}
              className="rounded px-2 py-1 text-xs bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 transition-colors"
              title={`Jump to diff at ${formatTime(r.start)}`}
            >
              {formatTime(r.start)}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
