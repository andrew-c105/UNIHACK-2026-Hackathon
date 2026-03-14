"""
TrackSync FFmpeg Service
Mixes WAV stems into a single MP3 for main playback.
"""
import shutil
import subprocess
from pathlib import Path


class FFmpegService:
    def mix_to_mp3(self, project_path: Path, wav_files: list) -> bool:
        """Mix multiple WAV files into one MP3 using amix filter."""
        if not wav_files:
            return False
        out_path = project_path / "main.mp3"
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
            return True
        except (subprocess.CalledProcessError, FileNotFoundError):
            # FFmpeg not installed: create placeholder or copy first file
            if wav_files:
                shutil.copy(wav_files[0], project_path / "main.wav")
            return False
