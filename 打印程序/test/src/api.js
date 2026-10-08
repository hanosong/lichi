async function request(path, options = {}) {
  const response = await fetch(`/api${path}`, {
    headers: { 'Content-Type': 'application/json', ...options.headers },
    ...options,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.message || `请求失败（${response.status}）`);
  }
  if (response.status === 204) return null;
  return response.json();
}

export const api = {
  bootstrap: () => request('/bootstrap'),
  addPrinter: (data) => request('/printers', { method: 'POST', body: JSON.stringify(data) }),
  removePrinter: (id) => request(`/printers/${id}`, { method: 'DELETE' }),
  checkPrinter: (id) => request(`/printers/${id}/status`),
  saveTemplate: (data) => request('/templates', { method: 'POST', body: JSON.stringify(data) }),
  removeTemplate: (id) => request(`/templates/${id}`, { method: 'DELETE' }),
  saveLabel: (data) => request('/labels', { method: 'POST', body: JSON.stringify(data) }),
  removeLabel: (id) => request(`/labels/${id}`, { method: 'DELETE' }),
  print: (data) => request('/print', { method: 'POST', body: JSON.stringify(data) }),
};
