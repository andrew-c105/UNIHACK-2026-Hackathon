"""
TrackSync Audio Analysis Service
Computes waveform peaks and audio diffs using only the Python standard library.
"""
import struct
import wave
from pathlib import Path


class AudioAnalysisService:

    @staticmethod
    def _read_samples(filepath: Path) -> tuple:
        """Read a WAV file and return (samples_as_floats, sample_rate, num_channels, duration)."""
        with wave.open(str(filepath), "rb") as wf:
            n_channels = wf.getnchannels()
            sample_width = wf.getsampwidth()
            sample_rate = wf.getframerate()
            n_frames = wf.getnframes()
            raw = wf.readframes(n_frames)

        fmt_map = {1: "b", 2: "h", 4: "i"}
        fmt_char = fmt_map.get(sample_width)
        if not fmt_char:
            raise ValueError(f"Unsupported sample width: {sample_width}")

        total_samples = n_frames * n_channels
        samples = struct.unpack(f"<{total_samples}{fmt_char}", raw)

        max_val = float(2 ** (sample_width * 8 - 1))
        floats = [s / max_val for s in samples]

        if n_channels > 1:
            mono = []
            for i in range(0, len(floats), n_channels):
                mono.append(sum(floats[i : i + n_channels]) / n_channels)
            floats = mono

        duration = n_frames / sample_rate
        return floats, sample_rate, n_channels, duration

    @staticmethod
    def get_waveform_peaks(filepath: Path, num_peaks: int = 200) -> dict:
        """Return an array of peak amplitudes for waveform rendering."""
        filepath = Path(filepath)
        if not filepath.exists():
            return {"error": "File not found", "peaks": [], "duration": 0}

        try:
            samples, sample_rate, n_channels, duration = AudioAnalysisService._read_samples(filepath)
        except Exception as e:
            return {"error": str(e), "peaks": [], "duration": 0}

        n = len(samples)
        if n == 0:
            return {"peaks": [], "duration": duration, "sample_rate": sample_rate}

        chunk_size = max(1, n // num_peaks)
        peaks = []
        for i in range(0, n, chunk_size):
            chunk = samples[i : i + chunk_size]
            peaks.append(max(abs(s) for s in chunk))
            if len(peaks) >= num_peaks:
                break

        global_max = max(peaks) if peaks else 1.0
        if global_max > 0:
            peaks = [p / global_max for p in peaks]

        return {
            "peaks": peaks,
            "duration": round(duration, 3),
            "sample_rate": sample_rate,
            "num_peaks": len(peaks),
        }

    @staticmethod
    def compute_diff(
        filepath_a: Path,
        filepath_b: Path,
        num_peaks: int = 200,
        threshold: float = 0.15,
    ) -> dict:
        """
        Compare two audio files and return diff regions.
        Returns peaks for both files and regions where they differ significantly.
        """
        filepath_a, filepath_b = Path(filepath_a), Path(filepath_b)

        if not filepath_a.exists() or not filepath_b.exists():
            missing = []
            if not filepath_a.exists():
                missing.append(str(filepath_a))
            if not filepath_b.exists():
                missing.append(str(filepath_b))
            return {"error": f"File(s) not found: {', '.join(missing)}"}

        try:
            samples_a, sr_a, _, dur_a = AudioAnalysisService._read_samples(filepath_a)
            samples_b, sr_b, _, dur_b = AudioAnalysisService._read_samples(filepath_b)
        except Exception as e:
            return {"error": str(e)}

        max_len = max(len(samples_a), len(samples_b))
        if len(samples_a) < max_len:
            samples_a.extend([0.0] * (max_len - len(samples_a)))
        if len(samples_b) < max_len:
            samples_b.extend([0.0] * (max_len - len(samples_b)))

        chunk_size = max(1, max_len // num_peaks)
        peaks_a, peaks_b, diff_values = [], [], []
        duration = max(dur_a, dur_b)

        for i in range(0, max_len, chunk_size):
            chunk_a = samples_a[i : i + chunk_size]
            chunk_b = samples_b[i : i + chunk_size]
            pa = max(abs(s) for s in chunk_a) if chunk_a else 0
            pb = max(abs(s) for s in chunk_b) if chunk_b else 0

            rms_a = (sum(s * s for s in chunk_a) / len(chunk_a)) ** 0.5 if chunk_a else 0
            rms_b = (sum(s * s for s in chunk_b) / len(chunk_b)) ** 0.5 if chunk_b else 0
            diff_values.append(abs(rms_a - rms_b))

            peaks_a.append(pa)
            peaks_b.append(pb)
            if len(peaks_a) >= num_peaks:
                break

        max_a = max(peaks_a) if peaks_a else 1
        max_b = max(peaks_b) if peaks_b else 1
        global_max = max(max_a, max_b, 1e-10)
        peaks_a = [p / global_max for p in peaks_a]
        peaks_b = [p / global_max for p in peaks_b]

        max_diff = max(diff_values) if diff_values else 1
        if max_diff > 0:
            diff_norm = [d / max_diff for d in diff_values]
        else:
            diff_norm = [0.0] * len(diff_values)

        regions = []
        n_peaks = len(diff_norm)
        in_region = False
        region_start = 0

        for i, d in enumerate(diff_norm):
            if d >= threshold and not in_region:
                in_region = True
                region_start = i
            elif d < threshold and in_region:
                in_region = False
                start_time = (region_start / n_peaks) * duration
                end_time = (i / n_peaks) * duration
                region_diff = diff_norm[region_start:i]
                avg_mag = sum(region_diff) / len(region_diff) if region_diff else 0
                regions.append({
                    "start": round(start_time, 3),
                    "end": round(end_time, 3),
                    "start_pct": round(region_start / n_peaks, 4),
                    "end_pct": round(i / n_peaks, 4),
                    "magnitude": round(avg_mag, 3),
                })

        if in_region:
            start_time = (region_start / n_peaks) * duration
            region_diff = diff_norm[region_start:]
            avg_mag = sum(region_diff) / len(region_diff) if region_diff else 0
            regions.append({
                "start": round(start_time, 3),
                "end": round(duration, 3),
                "start_pct": round(region_start / n_peaks, 4),
                "end_pct": 1.0,
                "magnitude": round(avg_mag, 3),
            })

        total_diff_pct = sum(r["end_pct"] - r["start_pct"] for r in regions)

        return {
            "peaks_a": peaks_a,
            "peaks_b": peaks_b,
            "diff_regions": regions,
            "diff_percentage": round(total_diff_pct * 100, 1),
            "duration_a": round(dur_a, 3),
            "duration_b": round(dur_b, 3),
            "num_peaks": n_peaks,
        }
