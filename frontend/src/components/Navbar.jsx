import { Link, NavLink, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isProjectsActive = location.pathname === '/projects' || location.pathname.startsWith('/project/');

  const navLinkClass = ({ isActive }) =>
    `px-3 py-2 rounded-md text-sm font-medium transition-colors ${
      isActive ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
    }`;

  return (
    <nav className="bg-brand-surface border-b border-slate-800/60 px-6 py-3 flex items-center justify-between">
      <Link to="/" className="flex items-center gap-2 font-semibold text-white hover:text-cyan-400 transition-colors">
        <span className="w-8 h-8 rounded-lg bg-cyan-500/20 flex items-center justify-center text-cyan-400 text-lg" aria-hidden>
          ♪
        </span>
        TrackSync
      </Link>

      <div className="flex items-center gap-1">
        <NavLink to="/" className={navLinkClass} end>
          Home
        </NavLink>
        <Link
          to="/projects"
          className={`px-3 py-2 rounded-md text-sm font-medium transition-colors ${
            isProjectsActive ? 'text-cyan-400' : 'text-slate-400 hover:text-white'
          }`}
        >
          Projects
        </Link>
        <NavLink to="/about" className={navLinkClass}>
          About
        </NavLink>
      </div>

      <div className="w-9 h-9 rounded-full bg-cyan-500/30 flex items-center justify-center text-cyan-400 text-sm font-medium">
        U
      </div>
    </nav>
  );
}
