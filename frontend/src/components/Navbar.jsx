import { Link, NavLink, useLocation } from 'react-router-dom';

export default function Navbar() {
  const location = useLocation();
  const isProjectsActive = location.pathname === '/projects' || location.pathname.startsWith('/project/');
  const isLanding = location.pathname === '/';

  // On landing page use transparent style, otherwise use solid dark
  const navBg = isLanding
    ? 'bg-transparent'
    : 'bg-[#0a0a0a] border-b border-white/10';

  return (
    <nav className={`w-full ${navBg} px-8 py-5 flex items-center justify-between`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Logo */}
      <Link
        to="/"
        className="flex items-center gap-3 font-bold text-xl tracking-wider transition-colors duration-300"
        style={{ color: '#e0e0e0' }}
      >
        <span
          className="w-10 h-10 rounded-xl flex items-center justify-center text-xl"
          style={{ background: 'rgba(224,224,224,0.08)', border: '1px solid rgba(224,224,224,0.15)', color: '#e0e0e0' }}
          aria-hidden
        >
          ♪
        </span>
        TRACKSYNC
      </Link>

      {/* Nav Links */}
      <div className="flex items-center gap-2">
        <NavLink
          to="/"
          end
          className={({ isActive }) =>
            `px-5 py-2.5 rounded-full text-base font-bold tracking-wider transition-all duration-300 ${
              isActive
                ? 'text-[#0a0a0a]'
                : 'text-[#e0e0e0]/70 hover:text-[#e0e0e0] hover:bg-white/10'
            }`
          }
          style={({ isActive }) => isActive ? { background: '#e0e0e0' } : {}}
        >
          HOME
        </NavLink>
        <Link
          to="/projects"
          className={`px-5 py-2.5 rounded-full text-base font-bold tracking-wider transition-all duration-300 ${
            isProjectsActive
              ? 'text-[#0a0a0a]'
              : 'text-[#e0e0e0]/70 hover:text-[#e0e0e0] hover:bg-white/10'
          }`}
          style={isProjectsActive ? { background: '#e0e0e0' } : {}}
        >
          PROJECTS
        </Link>
        <NavLink
          to="/about"
          className={({ isActive }) =>
            `px-5 py-2.5 rounded-full text-base font-bold tracking-wider transition-all duration-300 ${
              isActive
                ? 'text-[#0a0a0a]'
                : 'text-[#e0e0e0]/70 hover:text-[#e0e0e0] hover:bg-white/10'
            }`
          }
          style={({ isActive }) => isActive ? { background: '#e0e0e0' } : {}}
        >
          ABOUT
        </NavLink>
      </div>

      {/* User Avatar */}
      <div
        className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-bold tracking-wide"
        style={{ background: 'rgba(224,224,224,0.1)', border: '1px solid rgba(224,224,224,0.15)', color: '#e0e0e0' }}
      >
        U
      </div>
    </nav>
  );
}
