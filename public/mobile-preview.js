const preset = document.querySelector('#devicePreset');
const preview = document.querySelector('#preview');
const shell = document.querySelector('.device-shell');
const meta = document.querySelector('#deviceMeta');
const openDirect = document.querySelector('#openDirect');
let landscape = false;
let route = '/';

function selectedLabel() {
  return preset.options[preset.selectedIndex].text.split(' · ')[0];
}

function updatePreview() {
  const [presetWidth, presetHeight] = preset.value.split('x').map(Number);
  const width = landscape ? presetHeight : presetWidth;
  const height = landscape ? presetWidth : presetHeight;
  preview.style.width = `${width}px`;
  preview.style.height = `${height}px`;
  shell.style.borderRadius = landscape ? '28px' : '34px';
  meta.textContent = `${selectedLabel()} · ${landscape ? 'landscape' : 'portrait'} · ${width} × ${height} CSS px`;
  const url = `${route}?mobile-test=1`;
  if (preview.getAttribute('src') !== url) preview.setAttribute('src', url);
  openDirect.href = url;
}

preset.addEventListener('change', updatePreview);
document.querySelector('#rotate').addEventListener('click', () => {
  landscape = !landscape;
  updatePreview();
});
document.querySelector('#homeRoute').addEventListener('click', () => {
  route = '/';
  updatePreview();
});
document.querySelector('#reviewRoute').addEventListener('click', () => {
  route = '/review';
  updatePreview();
});
updatePreview();
