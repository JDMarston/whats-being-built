import { projectStatusLabel, type Project } from '../lib/projects';

function escapeHtml(value: unknown): string {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char] as string));
}

export function projectPopupHtml(project: Project): string {
  const details = [
    project.address ? `<span><strong>Address:</strong> ${escapeHtml(project.address)}</span>` : '',
    project.completed_at ? `<span><strong>Completed:</strong> ${escapeHtml(project.completed_at)}</span>` : '',
    project.expected_open ? `<span><strong>Expected:</strong> ${escapeHtml(project.expected_open)}</span>` : '',
    project.last_verified ? `<span><strong>Verified:</strong> ${escapeHtml(project.last_verified)}</span>` : ''
  ].filter(Boolean).join('');

  const sources = (project.sources || []).map((source) => (
    `<li><a href="${escapeHtml(source.url)}" target="_blank" rel="noopener noreferrer">${escapeHtml(source.label)}</a></li>`
  )).join('');

  return `
    <h2>${escapeHtml(project.name)}</h2>
    <span class="popup-status">${escapeHtml(projectStatusLabel(project.status))}</span>
    ${details ? `<div class="popup-details">${details}</div>` : ''}
    ${project.summary ? `<p>${escapeHtml(project.summary)}</p>` : ''}
    ${sources ? `<p><strong>Sources</strong></p><ul>${sources}</ul>` : ''}
  `;
}
