const API_BASE = '/api';

async function fetchApi(path, options = {}) {
  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers: { 'Content-Type': 'application/json', ...options.headers },
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.detail || res.statusText || 'API error');
  }
  return res.json();
}

export const api = {
  listProjects: () => fetchApi('/projects'),
  createProject: (name, description) =>
    fetchApi('/projects', {
      method: 'POST',
      body: JSON.stringify({ name, description }),
    }),
  getProject: (id) => fetchApi(`/projects/${id}`),
  getSession: (projectId, producerId) =>
    fetchApi(`/projects/${projectId}/session?producer_id=${producerId || 'producer-1'}`),
  pushFiles: async (projectId, files, commitMessage, producerId = 'producer-1') => {
    const form = new FormData();
    form.append('commit_message', commitMessage);
    form.append('branch', 'main');
    form.append('producer_id', producerId);
    files.forEach((f) => form.append('files', f));
    const res = await fetch(`${API_BASE}/projects/${projectId}/push-files`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  pull: (projectId, producerId) =>
    fetchApi(`/projects/${projectId}/pull?producer_id=${producerId || 'producer-1'}`, {
      method: 'POST',
    }),
  getHistory: (projectId) => fetchApi(`/projects/${projectId}/history`),
  getPr: (projectId, prId) => fetchApi(`/projects/${projectId}/pr/${prId}`),
  mergePr: (projectId, prId, conflictResolutions) =>
    fetchApi(`/projects/${projectId}/pr/${prId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, pr_id: prId, conflict_resolutions: conflictResolutions }),
    }),
  getConflict: (projectId, trackId) => fetchApi(`/projects/${projectId}/conflict?track=${trackId}`),
  getMainAudio: (projectId) => fetchApi(`/projects/${projectId}/main-audio`),
};

export const audioUrl = (path) => `${API_BASE}${path}`;
