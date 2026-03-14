import { useEffect, useRef, useState } from 'react';
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

export default function Waveform({
  url,
  color = '#e0e0e0',
  progressColor = '#fff',
  height = 64,
  showControls = true,
  barWidth = 2,
}) {
  const containerRef = useRef(null);
  const wsRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [ready, setReady] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (!containerRef.current || !url) return;
    setReady(false);
    setPlaying(false);

    const ws = WaveSurfer.create({
      container: containerRef.current,
      waveColor: color,
      progressColor,
      cursorColor: progressColor,
      height,
      url: toFullUrl(url),
      barWidth,
      barGap: 1,
      barRadius: 2,
    });

    ws.on('ready', () => {
      setReady(true);
      setDuration(ws.getDuration());
    });
    ws.on('timeupdate', (t) => setCurrentTime(t));
    ws.on('finish', () => setPlaying(false));

    wsRef.current = ws;
    return () => {
      ws.destroy();
      wsRef.current = null;
    };
  }, [url]);

  const togglePlay = () => {
    if (!wsRef.current) return;
    wsRef.current.playPause();
    setPlaying(!playing);
  };

  return (
    <div>
      <div
        ref={containerRef}
        className="rounded-lg overflow-hidden bg-[#0a0a0a]"
        style={{ minHeight: height }}
      />
      {showControls && (
        <div className="mt-3 flex items-center gap-3">
          <button
            onClick={togglePlay}
            disabled={!ready}
            className="w-10 h-10 rounded-full bg-[#e0e0e0] hover:bg-white disabled:opacity-40 text-[#0a0a0a] flex items-center justify-center transition-colors shrink-0"
          >
            {playing ? '⏸' : '▶'}
          </button>
          <span className="text-[#e0e0e0]/50 text-sm font-mono">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
}
