import Navbar from '../components/Navbar';

export default function About() {
  return (
    <div className="min-h-screen bg-brand-dark px-6 py-12">
      <Navbar />
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-semibold text-white mb-4">About TrackSync</h1>
        <p className="text-slate-400">Version control for your music. Push, pull, and resolve conflicts — just like Git, but for tracks.</p>
      </div>
    </div>
  );
}
