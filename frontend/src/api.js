const API_BASE = 'http://127.0.0.1:8000';

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
  updateProject: (id, description) =>
    fetchApi(`/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ description }),
    }),
  uploadCover: async (projectId, file) => {
    const form = new FormData();
    form.append('file', file);
    const res = await fetch(`${API_BASE}/projects/${projectId}/cover`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  getSession: (projectId, producerId, branch = 'main') =>
    fetchApi(`/projects/${projectId}/session?producer_id=${producerId || 'producer-1'}&branch=${branch}`),
  pushFiles: async (projectId, files, commitMessage, branch = 'main', producerId = 'producer-1') => {
    const form = new FormData();
    form.append('commit_message', commitMessage);
    form.append('branch', branch);
    form.append('producer_id', producerId);
    files.forEach((f) => form.append('files', f));
    const res = await fetch(`${API_BASE}/projects/${projectId}/push-files`, {
      method: 'POST',
      body: form,
    });
    if (!res.ok) throw new Error(await res.text());
    return res.json();
  },
  pull: (projectId, branch = 'main', producerId = 'producer-1') =>
    fetchApi(`/projects/${projectId}/pull?branch=${branch}&producer_id=${producerId}`, {
      method: 'POST',
    }),
  getHistory: (projectId, branch = 'main') =>
    fetchApi(`/projects/${projectId}/history?branch=${branch}`),

  // Branches
  listBranches: (projectId) => fetchApi(`/projects/${projectId}/branches`),
  createBranch: (projectId, name, base = 'main') =>
    fetchApi(`/projects/${projectId}/branches`, {
      method: 'POST',
      body: JSON.stringify({ name, base }),
    }),

  // Pull Requests
  listPrs: (projectId) => fetchApi(`/projects/${projectId}/prs`),
  createPr: (projectId, sourceBranch, targetBranch = 'main', author = 'producer-1') =>
    fetchApi(`/projects/${projectId}/prs`, {
      method: 'POST',
      body: JSON.stringify({ source_branch: sourceBranch, target_branch: targetBranch, author }),
    }),
  getPr: (projectId, prId) => fetchApi(`/projects/${projectId}/pr/${prId}`),

  listIssues: (projectId) => fetchApi(`/projects/${projectId}/issues`),
  createIssue: (projectId, title, description, assignees = [], author = 'producer-1') =>
    fetchApi(`/projects/${projectId}/issues`, {
      method: 'POST',
      body: JSON.stringify({ title, description, assignees, author }),
    }),
  mergePr: (projectId, prId, conflictResolutions) =>
    fetchApi(`/projects/${projectId}/pr/${prId}/merge`, {
      method: 'POST',
      body: JSON.stringify({ project_id: projectId, pr_id: prId, conflict_resolutions: conflictResolutions }),
    }),

  getConflict: (projectId, trackId) => fetchApi(`/projects/${projectId}/conflict?track=${trackId}`),
  getMainAudio: (projectId, branch = 'main') =>
    fetchApi(`/projects/${projectId}/main-audio?branch=${branch}`),

  /** Batch: project + session + history + main_audio in one call. Use for Dashboard. */
  getDashboard: (projectId, producerId = 'producer-1', branch = 'main') =>
    fetchApi(`/projects/${projectId}/dashboard?producer_id=${producerId}&branch=${branch}`),
  getWaveform: (projectId, filename, numPeaks = 200) =>
    fetchApi(`/projects/${projectId}/waveform/${filename}?num_peaks=${numPeaks}`),
  getAudioDiff: (projectId, fileA, fileB, numPeaks = 200) =>
    fetchApi(`/projects/${projectId}/audio-diff`, {
      method: 'POST',
      body: JSON.stringify({ file_a: fileA, file_b: fileB, num_peaks: numPeaks }),
    }),
};

export const audioUrl = (path) => `${API_BASE}${path}`;
