import { useState, useEffect, useRef } from 'react';
import { api } from '../api';

export default function BranchSelector({ projectId, value, onChange }) {
  const [branches, setBranches] = useState([]);
  const [open, setOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [newName, setNewName] = useState('');
  const ref = useRef(null);

  const fetchBranches = () => {
    if (!projectId) return;
    setRefreshing(true);
    api.listBranches(projectId)
      .then(({ branches: b, current }) => {
        setBranches(b || []);
        if (!value && current) onChange?.(current);
      })
      .catch(() => setBranches(['main']))
      .finally(() => setRefreshing(false));
  };

  useEffect(() => {
    fetchBranches();
  }, [projectId]);

  useEffect(() => {
    const handler = (e) => {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleCreate = async () => {
    const name = newName.trim().replace(/[^\w-]/g, '-');
    if (!name) return;
    setCreating(true);
    try {
      await api.createBranch(projectId, name, value || 'main');
      setBranches((prev) => [...prev, name]);
      onChange?.(name);
      setNewName('');
      setOpen(false);
    } catch (err) {
      alert(err.message || 'Failed to create branch');
    } finally {
      setCreating(false);
    }
  };

  const selected = value || branches[0] || 'main';

  return (
    <div className="relative inline-block" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-[#111] border border-white/10 hover:border-white/30 transition-all text-base font-semibold shadow-sm group"
      >
        <svg className="w-5 h-5 text-[#e0e0e0]/40 group-hover:text-emerald-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <span className="text-white drop-shadow-sm">{selected}</span>
        <svg className="w-4 h-4 text-[#e0e0e0]/30 transition-colors group-hover:text-white/40" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-56 rounded-xl bg-[#111] border border-white/10 shadow-xl overflow-hidden">
          <div className="max-h-48 overflow-y-auto">
            {branches.map((b) => (
              <button
                key={b}
                onClick={() => { onChange?.(b); setOpen(false); }}
                className={`w-full text-left px-4 py-2.5 text-sm transition-colors ${
                  b === selected
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-[#e0e0e0]/70 hover:bg-white/5 hover:text-white'
                }`}
              >
                {b}
              </button>
            ))}
            {branches.length === 0 && (
              <div className="px-4 py-3 text-sm text-[#e0e0e0]/40">No branches</div>
            )}
          </div>
          <div className="border-t border-white/10 p-2">
            <div className="flex gap-1.5 items-center">
              <button
                onClick={(e) => { e.stopPropagation(); fetchBranches(); }}
                disabled={refreshing}
                title="Refresh branches (e.g. after creating in LMMS)"
                className="p-1.5 rounded-md bg-white/5 hover:bg-white/10 text-[#e0e0e0]/60 hover:text-white transition-colors disabled:opacity-50 shrink-0"
              >
                <svg className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
              </button>
              <div className="flex gap-1.5 flex-1 min-w-0">
              <input
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                placeholder="New branch..."
                className="flex-1 min-w-0 px-2.5 py-1.5 rounded-md bg-[#0a0a0a] border border-white/10 text-white text-sm placeholder-[#e0e0e0]/30 focus:border-[#e0e0e0]/40 outline-none"
              />
              <button
                onClick={handleCreate}
                disabled={creating || !newName.trim()}
                className="px-2.5 py-1.5 rounded-md bg-[#e0e0e0] text-[#0a0a0a] text-sm font-medium hover:bg-white disabled:opacity-50 transition-colors shrink-0"
              >
                {creating ? '...' : '+'}
              </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
