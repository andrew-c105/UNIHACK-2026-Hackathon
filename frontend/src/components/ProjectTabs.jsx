import { Link } from 'react-router-dom';

const TABS = [
  { key: 'composition', label: 'Composition', path: '' },
  { key: 'prs', label: 'Pull Requests', path: '/prs' },
  { key: 'issues', label: 'Issues', path: '/issues' },
];

export default function ProjectTabs({ projectId, activeTab }) {
  return (
    <div className="border-b border-white/10 mb-6">
      <nav className="flex gap-0">
        {TABS.map((tab) => {
          const active = tab.key === activeTab;
          return (
            <Link
              key={tab.key}
              to={`/project/${projectId}${tab.path}`}
              className={`relative px-5 py-3 text-sm font-medium transition-colors ${
                active
                  ? 'text-white'
                  : 'text-[#e0e0e0]/50 hover:text-[#e0e0e0]/80'
              }`}
            >
              {tab.label}
              {active && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-white rounded-full" />
              )}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
