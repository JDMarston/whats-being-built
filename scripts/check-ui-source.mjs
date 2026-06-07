import { existsSync, readFileSync } from 'node:fs';

const files = {
  app: readFileSync('src/App.tsx', 'utf8'),
  header: readFileSync('src/components/HeaderControls.tsx', 'utf8'),
  legend: readFileSync('src/components/MapLegend.tsx', 'utf8'),
  search: readFileSync('src/components/ProjectSearchPanel.tsx', 'utf8'),
  sheet: readFileSync('src/components/ProjectBottomSheet.tsx', 'utf8'),
  mapView: readFileSync('src/components/MapView.tsx', 'utf8'),
  styles: readFileSync('src/styles.css', 'utf8'),
  field: readFileSync('src/components/FieldCapturePanel.tsx', 'utf8'),
  index: readFileSync('index.html', 'utf8'),
  readme: existsSync('README.md') ? readFileSync('README.md', 'utf8') : '',
  netlify: existsSync('netlify.toml') ? readFileSync('netlify.toml', 'utf8') : ''
};

const checks = [
  ['App keeps selectedStatus state for map-wide status filtering', files.app.includes('selectedStatus')],
  ['ProjectSearchPanel renders status filter chips', files.search.includes('status-filter')],
  ['ProjectSearchPanel exposes an All Projects filter', files.search.includes('All projects')],
  ['ProjectBottomSheet renders source list details', files.sheet.includes('sheet-source-list')],
  ['ProjectBottomSheet shows source count metadata', files.sheet.includes('sourceCountText')],
  ['MapView centralizes mobile control anchoring helpers', files.mapView.includes('mapControlsBottomOffset')],
  ['App no longer renders the old header/top bar component', !files.app.includes('<HeaderControls')],
  ['UI copy is not scoped to St. Petersburg', !files.app.includes('St. Petersburg') && !files.header.includes('St. Petersburg')],
  ['Map options menu owns imagery mode controls', files.legend.includes('Imagery mode') && files.legend.includes('onImageryChange')],
  ['Styles no longer reserve a grid row for top header', !files.styles.includes('grid-template-rows: auto 1fr')],
  ['App renders a public hobby-project intro panel', files.app.includes('site-intro-card') && files.app.includes('hobby project') && files.app.includes('I hate not knowing')],
  ['Intro panel shows map data stats and hosted status copy', files.app.includes('intro-stat-grid') && files.app.includes('Live on Netlify')],
  ['Search placeholder is written for sidewalk curiosity', files.search.includes('Search a project, address, or neighborhood')],
  ['Field mode copy uses the product north star', files.field.includes("What's being built here?") && files.field.includes('point your phone')],
  ['Project sheet includes trust and source action affordances', files.sheet.includes('sheet-trust-card') && files.sheet.includes('Open source')],
  ['Index has social metadata for the hosted site', files.index.includes('og:title') && files.index.includes('whatsbeingbuilt.netlify.app')],
  ['README documents the Netlify hobby project and commands', files.readme.includes('https://whatsbeingbuilt.netlify.app') && files.readme.includes('hobby project') && files.readme.includes('npm run build')],
  ['Netlify config publishes the Vite dist build', files.netlify.includes('command = "npm run build"') && files.netlify.includes('publish = "dist"')]
];

const failed = checks.filter(([, passed]) => !passed);
if (failed.length) {
  console.error(`UI source checks failed (${failed.length}/${checks.length}):`);
  for (const [name] of failed) console.error(`- ${name}`);
  process.exit(1);
}

console.log(`UI source checks passed (${checks.length}/${checks.length})`);
