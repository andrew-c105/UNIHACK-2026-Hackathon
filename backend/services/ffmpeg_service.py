"""
TrackSync FFmpeg Service
Mixes WAV stems into a single MP3 (or WAV fallback) for main playback.
"""
import subprocess
import wave
from array import array
from pathlib import Path
from typing import List, Optional, Tuple


class FFmpegService:
    def mix_stems(self, project_path: Path, wav_files: list) -> Optional[Path]:
        """Mix multiple WAV stems. Returns path to main.mp3 or main.wav."""
        if not wav_files:
            return None

        for stale in (project_path / "main.mp3", project_path / "main.wav"):
            if stale.exists():
                stale.unlink()

        mp3_path = project_path / "main.mp3"
        if self._mix_ffmpeg_mp3(wav_files, mp3_path):
            return mp3_path

        return self._mix_wav_python(project_path, wav_files)

    def mix_to_mp3(self, project_path: Path, wav_files: list) -> bool:
        """Legacy API — True when any mix file was created."""
        return self.mix_stems(project_path, wav_files) is not None

    def _mix_ffmpeg_mp3(self, wav_files: list, out_path: Path) -> bool:
        inputs = [str(f) for f in wav_files]
        n = len(inputs)
        filter_parts = "".join([f"[{i}:a]" for i in range(n)])
        filter_complex = f"{filter_parts}amix=inputs={n}:duration=longest:dropout_transition=2[out]"
        cmd = [
            "ffmpeg",
            "-y",
            *[arg for pair in [("-i", p) for p in inputs] for arg in pair],
            "-filter_complex",
            filter_complex,
            "-map",
            "[out]",
            "-c:a",
            "libmp3lame",
            "-b:a",
            "320k",
            str(out_path),
        ]
        try:
            subprocess.run(cmd, check=True, capture_output=True)
            return out_path.exists()
        except (subprocess.CalledProcessError, FileNotFoundError):
            return False

    def _read_wav_mono(self, filepath: Path) -> Tuple[array, int]:
        with wave.open(str(filepath), "rb") as wf:
            n_channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            sample_rate = wf.getframerate()
            if sample_width != 2:
                raise ValueError(f"Unsupported sample width in {filepath.name}: {sample_width}")
            raw = wf.readframes(wf.getnframes())

        samples = array("h")
        samples.frombytes(raw)
        if n_channels == 2:
            mono = array("h")
            for i in range(0, len(samples), 2):
                mono.append((int(samples[i]) + int(samples[i + 1])) // 2)
            samples = mono
        elif n_channels != 1:
            raise ValueError(f"Unsupported channel count in {filepath.name}: {n_channels}")

        return samples, sample_rate

    def _mix_wav_python(self, project_path: Path, wav_files: list) -> Optional[Path]:
        """Mix WAV files using stdlib only when FFmpeg is unavailable."""
        tracks: List[array] = []
        sample_rate = None

        for filepath in wav_files:
            try:
                samples, rate = self._read_wav_mono(filepath)
            except (ValueError, wave.Error):
                continue
            if sample_rate is None:
                sample_rate = rate
            elif rate != sample_rate:
                # Skip stems with mismatched sample rates rather than producing garbage audio
                continue
            tracks.append(samples)

        if not tracks or sample_rate is None:
            return None

        max_len = max(len(t) for t in tracks)
        mixed = array("h", [0] * max_len)
        n = len(tracks)

        for track in tracks:
            for i in range(len(track)):
                mixed[i] += int(track[i]) // n

        for i in range(len(mixed)):
            if mixed[i] > 32767:
                mixed[i] = 32767
            elif mixed[i] < -32768:
                mixed[i] = -32768

        out_path = project_path / "main.wav"
        with wave.open(str(out_path), "wb") as wf:
            wf.setnchannels(1)
            wf.setsampwidth(2)
            wf.setframerate(sample_rate)
            wf.writeframes(mixed.tobytes())

        return out_path if out_path.exists() else None
