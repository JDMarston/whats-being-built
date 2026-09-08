import type { ImageryMode } from '../lib/imageryLayers';
import { projectStatuses, statusClass, type ProjectStatus } from '../lib/projects';
export type ImageryOption = { value: ImageryMode; label: string };
type Props = {
  imageryOptions: ImageryOption[]; selectedImageryMode: ImageryMode; is3DEnabled: boolean;
  isMenuOpen: boolean; isLegendOpen: boolean; onImageryChange: (mode: ImageryMode) => void;
  on3DToggle: () => void; onMenuToggle: () => void; onLegendToggle: () => void; onOverview: () => void;
};
export default function MapLegend(props: Props) {
  return <section className={`map-options ${props.isMenuOpen ? 'is-open' : ''}`} aria-label="Map options">
    <button className="quick-3d" type="button" aria-label="3D buildings" aria-pressed={props.is3DEnabled} onClick={props.on3DToggle}>3D</button>
    <button className="map-options-toggle" type="button" aria-label="Map options" aria-expanded={props.isMenuOpen} aria-controls="mapOptionsPanel" onClick={props.onMenuToggle}>
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" aria-hidden="true"><path d="m3 8 9-5 9 5-9 5-9-5Z M3 12l9 5 9-5 M3 16l9 5 9-5" /></svg>
    </button>
    <div id="mapOptionsPanel" className="map-options-panel" hidden={!props.isMenuOpen}>
      <div className="panel-heading"><strong>Map view</strong><button type="button" aria-label="Close map options" onClick={props.onMenuToggle}>×</button></div>
      <label className="map-option-field"><span>Basemap</span><select aria-label="Imagery mode" value={props.selectedImageryMode} onChange={e => props.onImageryChange(e.target.value as ImageryMode)}>
        {props.imageryOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
      </select></label>
      <button type="button" className="map-option-row" onClick={props.onOverview}>Show all filtered projects <span aria-hidden="true">↗</span></button>
      <button type="button" className="map-option-row" aria-expanded={props.isLegendOpen} aria-controls="mapLegend" onClick={props.onLegendToggle}>Pin colors <span aria-hidden="true">{props.isLegendOpen ? '−' : '+'}</span></button>
      <aside id="mapLegend" className="map-legend" hidden={!props.isLegendOpen} aria-label="Map legend"><ul>
        {Object.entries(projectStatuses).map(([status, label]) => <li key={status}><span className={`legend-dot ${statusClass(status as ProjectStatus)}`} aria-hidden="true" />{label}</li>)}
      </ul></aside>
      <p className="map-options-note">3D shows mapped building footprints and heights, not live construction models.</p>
    </div>
  </section>;
}
