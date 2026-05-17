import { readFileSync } from 'node:fs';

const files = {
  app: readFileSync('src/App.tsx', 'utf8'),
  search: readFileSync('src/components/ProjectSearchPanel.tsx', 'utf8'),
  sheet: readFileSync('src/components/ProjectBottomSheet.tsx', 'utf8'),
  mapView: readFileSync('src/components/MapView.tsx', 'utf8')
};

const checks = [
  ['App keeps selectedStatus state for map-wide status filtering', files.app.includes('selectedStatus')],
  ['ProjectSearchPanel renders status filter chips', files.search.includes('status-filter')],
  ['ProjectSearchPanel exposes an All Projects filter', files.search.includes('All projects')],
  ['ProjectBottomSheet renders source list details', files.sheet.includes('sheet-source-list')],
  ['ProjectBottomSheet shows source count metadata', files.sheet.includes('sourceCountText')],
  ['MapView centralizes mobile control anchoring helpers', files.mapView.includes('mapControlsBottomOffset')]
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error(`UI source checks failed (${failed.length}/${checks.length}):`);
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`UI source checks passed (${checks.length}/${checks.length})`);
