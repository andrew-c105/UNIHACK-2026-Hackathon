import { Link } from 'react-router-dom';
import Navbar from '../components/Navbar';

export default function Landing() {
  const features = [
    {
      icon: '📦',
      title: 'Version Control',
      description:
        'Track every change in your DAW files. Revert to previous versions without losing creative sparks.',
    },
    {
      icon: '👥',
      title: 'Collaborative Editing',
      description:
        'Invite producers and musicians to your repository. Work on the same track concurrently with smart merging.',
    },
    {
      icon: '🌿',
      title: 'Branch Management',
      description:
        'Experiment safely on new branches. Try different mix ideas or arrangements without affecting the main project.',
    },
    {
      icon: '🔀',
      title: 'Pull Request System',
      description:
        'Review changes before merging. Discuss modifications, leave comments on specific timestamps.',
    },
    {
      icon: '⚡',
      title: 'Conflict Resolution',
      description:
        'Smart conflict detection for audio files and project metadata. Resolve overlapping edits with visual tools.',
    },
    {
      icon: '☁️',
      title: 'Cloud Storage',
      description:
        'Secure cloud storage optimized for large audio files and stems. Access your projects from anywhere.',
    },
  ];

  const stats = [
    { value: '10k+', label: 'ACTIVE PROJECTS' },
    { value: '50k+', label: 'COMMITS PUSHED' },
    { value: '99%', label: 'UPTIME' },
  ];

  return (
    <div className="min-h-screen bg-brand-dark">
      <Navbar />

      <main className="max-w-6xl mx-auto px-6">
        {/* Hero */}
        <section className="pt-20 pb-16 text-center">
          <style>{`
            @keyframes waveform {
              0%, 100% { height: 0.5rem; }
              50% { height: 1.5rem; }
            }
            .wave-bar {
              animation: waveform 1.2s ease-in-out infinite;
            }
            .wave-bar:nth-child(1) { animation-delay: 0s; }
            .wave-bar:nth-child(2) { animation-delay: 0.1s; }
            .wave-bar:nth-child(3) { animation-delay: 0.2s; }
            .wave-bar:nth-child(4) { animation-delay: 0.3s; }
            .wave-bar:nth-child(5) { animation-delay: 0.4s; }
            .wave-bar:nth-child(6) { animation-delay: 0.5s; }
            .wave-bar:nth-child(7) { animation-delay: 0.6s; }
            .wave-bar:nth-child(8) { animation-delay: 0.7s; }
            .wave-bar:nth-child(9) { animation-delay: 0.8s; }
          `}</style>
          <div className="flex justify-center gap-1.5 mb-8 h-12 items-end" aria-hidden>
            {[3, 6, 4, 8, 5, 7, 4, 6, 3].map((_, i) => (
              <div key={i} className="wave-bar w-1.5 rounded-full bg-cyan-400" />
            ))}
          </div>

          <h1 className="text-5xl md:text-7xl font-bold mb-6">
            <span className="text-white">Music </span>
            <span className="bg-gradient-to-r from-cyan-400 to-cyan-500 bg-clip-text text-transparent">
              GitHub
            </span>
          </h1>
          <p className="text-xl text-slate-400 max-w-2xl mx-auto mb-10">
            Version control for your music projects. Collaborate, edit, and manage tracks seamlessly.
          </p>
          <Link
            to="/projects"
            className="inline-block px-8 py-4 rounded-lg bg-cyan-400 hover:bg-cyan-300 text-brand-dark font-semibold transition-colors"
          >
            Get Started
          </Link>

          <div className="flex flex-wrap justify-center gap-12 md:gap-16 mt-16 text-slate-400">
            {stats.map((s, i) => (
              <div key={i} className="text-center">
                <div className="text-2xl font-bold text-white">{s.value}</div>
                <div className="text-xs tracking-widest uppercase mt-1">{s.label}</div>
              </div>
            ))}
          </div>
        </section>

        {/* Features */}
        <section className="py-20">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
            {features.map((f, i) => (
              <div
                key={i}
                className="rounded-xl bg-brand-card border border-slate-800 p-6 hover:border-slate-700 transition-colors"
              >
                <div className="text-3xl mb-4">{f.icon}</div>
                <h3 className="text-lg font-semibold text-white mb-2">{f.title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{f.description}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="py-16 text-center">
          <Link
            to="/projects"
            className="inline-block px-8 py-4 rounded-lg border border-cyan-400/30 text-cyan-400 hover:bg-cyan-400/10 font-medium transition"
          >
            Browse Projects
          </Link>
        </section>
      </main>
    </div>
  );
}
