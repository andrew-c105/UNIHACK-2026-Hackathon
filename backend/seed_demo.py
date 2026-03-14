"""
Seed a demo project with sample WAV files for the Jake & Mia scenario.
Persists metadata to Supabase and audio to local git repo.
"""
import struct
from pathlib import Path


def create_tone_wav(path: Path, freq: float = 440.0, duration_sec: float = 3.0,
                    sample_rate: int = 44100, amplitude: float = 0.3):
    """Create a WAV file with a sine tone so waveforms are visible."""
    import math
    n_samples = int(sample_rate * duration_sec)
    samples = []
    for i in range(n_samples):
        val = amplitude * math.sin(2 * math.pi * freq * i / sample_rate)
        sample = int(val * 32767)
        samples.append(struct.pack("<h", sample))  # mono 16-bit
    data = b"".join(samples)

    with open(path, "wb") as f:
        n_channels = 1
        bits = 16
        byte_rate = sample_rate * n_channels * bits // 8
        block_align = n_channels * bits // 8
        f.write(b"RIFF")
        f.write(struct.pack("<I", 36 + len(data)))
        f.write(b"WAVE")
        f.write(b"fmt ")
        f.write(struct.pack("<I", 16))
        f.write(struct.pack("<H", 1))  # PCM
        f.write(struct.pack("<H", n_channels))
        f.write(struct.pack("<I", sample_rate))
        f.write(struct.pack("<I", byte_rate))
        f.write(struct.pack("<H", block_align))
        f.write(struct.pack("<H", bits))
        f.write(b"data")
        f.write(struct.pack("<I", len(data)))
        f.write(data)


def seed_demo(storage_service, git_service):
    """Create demo project with 4 tracks, persisted to Supabase."""
    existing = storage_service.get_project("demo")
    if existing:
        return  # Already seeded

    # Create project in Supabase
    storage_service.create_project("demo", "TrackSync Demo - Summer EP", "Jake & Mia collaboration demo")
    git_service.init_project("demo")

    data_dir = git_service.data_dir
    tracks_dir = data_dir / "demo" / "tracks"
    tracks_dir.mkdir(parents=True, exist_ok=True)

    track_specs = [
        ("Kick_Drum",      80.0,  3.0),
        ("Bass_Synth",     110.0, 3.0),
        ("Vocal_Ostinato", 330.0, 3.0),
        ("Lead_Melody",    440.0, 3.0),
    ]

    from git import Repo
    repo = Repo(data_dir / "demo")

    for name, freq, dur in track_specs:
        wav_path = tracks_dir / f"{name}.wav"
        create_tone_wav(wav_path, freq=freq, duration_sec=dur)

        # Upload to Supabase Storage
        with open(wav_path, "rb") as f:
            storage_path = storage_service.upload_track_file("demo", f"{name}.wav", f.read())

        # Upsert track metadata in Supabase
        storage_service.upsert_track(
            project_id="demo",
            name=name.replace("_", " ").title(),
            filename=f"{name}.wav",
            storage_path=storage_path,
            modified_by="producer-1",
        )

        repo.index.add([str(wav_path.relative_to(data_dir / "demo"))])

    commit = repo.index.commit("Initial tracks: Kick, Bass, Vocal, Lead (by producer-1)")

    # Save commit to Supabase
    storage_service.save_commit(
        project_id="demo",
        commit_hash=commit.hexsha[:7],
        message="Initial tracks: Kick, Bass, Vocal, Lead",
        author="producer-1",
        tracks_changed=["Kick_Drum", "Bass_Synth", "Vocal_Ostinato", "Lead_Melody"],
    )

    # Generate main mix
    from services.ffmpeg_service import FFmpegService
    ff = FFmpegService()
    wav_files = sorted(tracks_dir.glob("*.wav"))
    mixed = ff.mix_to_mp3(data_dir / "demo", wav_files)
    if mixed:
        storage_service.upload_main_mix("demo", data_dir / "demo" / "main.mp3")

    print("Demo project seeded with Supabase persistence.")


if __name__ == "__main__":
    import os
    from dotenv import load_dotenv
    from supabase import create_client

    load_dotenv()
    sb = create_client(os.getenv("SUPABASE_URL", ""), os.getenv("SUPABASE_KEY", ""))
    data_dir = Path(os.getenv("TRACKSYNC_DATA_DIR", "./data"))

    from services.storage_service import StorageService
    from services.git_service import GitService

    ss = StorageService(sb, data_dir)
    gs = GitService(data_dir, ss)
    seed_demo(ss, gs)
