import { Link, NavLink, useLocation } from 'react-router-dom';
import { useState, useEffect } from 'react';
import { ImageUploadField } from './ui/image-uploader';

export default function Navbar() {
  const location = useLocation();
  const [logoDataUrl, setLogoDataUrl] = useState(() => {
    return localStorage.getItem('tracksync_logo') || null;
  });

  const isProjectsActive = location.pathname === '/projects' || location.pathname.startsWith('/project/');
  const isLanding = location.pathname === '/';

  const navBg = isLanding
    ? 'bg-transparent'
    : 'bg-[#0a0a0a] border-b border-white/10';

  return (
    <nav className={`w-full ${navBg} px-8 py-5 flex items-center justify-between`} style={{ fontFamily: "'Inter', sans-serif" }}>
      {/* Logo */}
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 relative group rounded-xl overflow-hidden shrink-0">
          <ImageUploadField
             value={logoDataUrl}
             onChange={async (file) => {
               if (!file) return;
               const reader = new FileReader();
               reader.onload = (e) => {
                 const data = e.target.result;
                 setLogoDataUrl(data);
                 localStorage.setItem('tracksync_logo', data);
               };
               reader.readAsDataURL(file);
             }}
             className="w-full h-full border border-white/10 shadow-sm"
          />
        </div>
        
        <Link
          to="/"
          className="font-bold text-2xl tracking-wider transition-colors duration-300 drop-shadow-sm"
          style={{ color: '#e0e0e0' }}
        >
          TRACKSYNC
        </Link>
      </div>

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
