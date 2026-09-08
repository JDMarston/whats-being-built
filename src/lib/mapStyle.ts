import type { ExpressionSpecification, LayerSpecification, StyleSpecification } from 'maplibre-gl';

export const vectorBaseLayers = ['background', 'landuse', 'park', 'landcover', 'water', 'waterway', 'road-case', 'road', 'building-flat'];
export const vectorLabelLayers = ['road-label', 'place-label', 'poi-label'];
const vector = (id: string, sourceLayer: string) => ({ id, source: 'openmaptiles', 'source-layer': sourceLayer });
const font = ['Noto Sans Regular'];
const name: ExpressionSpecification = ['coalesce', ['get', 'name:en'], ['get', 'name']];

// A single vector source supplies the default view. Imagery is opt-in. No DEM
// or terrain mesh: building height is useful here; exaggerated ground isn't.
export function createMapStyle(): StyleSpecification {
  const layers: LayerSpecification[] = [
    { id: 'background', type: 'background', paint: { 'background-color': '#e9e7e1' } },
    { ...vector('landuse', 'landuse'), type: 'fill', paint: { 'fill-color': ['match', ['get', 'class'], 'residential', '#e3e2dc', 'industrial', '#d9dce0', 'hospital', '#eadbdb', 'school', '#e4dfd0', '#e6e5df'] } },
    { ...vector('park', 'park'), type: 'fill', paint: { 'fill-color': '#c7d9bf', 'fill-opacity': 0.85 } },
    { ...vector('landcover', 'landcover'), type: 'fill', paint: { 'fill-color': ['match', ['get', 'class'], 'wood', '#b9d1b3', 'sand', '#eadfbe', '#cfddc6'], 'fill-opacity': 0.7 } },
    { ...vector('water', 'water'), type: 'fill', paint: { 'fill-color': '#a8ced9' } },
    { ...vector('waterway', 'waterway'), type: 'line', paint: { 'line-color': '#a8ced9', 'line-width': 2 } },
    { ...vector('road-case', 'transportation'), type: 'line', filter: ['!=', ['get', 'class'], 'rail'], paint: { 'line-color': '#cbc9bf', 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.8, 15, 5, 18, 20] } },
    { ...vector('road', 'transportation'), type: 'line', filter: ['!=', ['get', 'class'], 'rail'], paint: { 'line-color': ['match', ['get', 'class'], ['motorway', 'trunk'], '#f7daa0', '#ffffff'], 'line-width': ['interpolate', ['linear'], ['zoom'], 10, 0.4, 15, 3.5, 18, 17] } },
    { ...vector('building-flat', 'building'), type: 'fill', minzoom: 14, paint: { 'fill-color': '#cdc9be', 'fill-outline-color': '#b5b0a5' } },
    ...['esri-world', 'pinellas-2025', 'pinellas-2024', 'hillsborough-2025'].map(id => ({ id, type: 'raster' as const, source: id, layout: { visibility: 'none' as const }, paint: { 'raster-fade-duration': 150 } })),
    { ...vector('building-3d', 'building'), type: 'fill-extrusion', minzoom: 14, filter: ['!=', ['get', 'hide_3d'], true], paint: {
      'fill-extrusion-color': ['interpolate', ['linear'], ['coalesce', ['get', 'render_height'], 8], 0, '#dedbd2', 30, '#c9c6be', 150, '#a9bbc1'],
      'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 8], 'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
      'fill-extrusion-opacity': 0.94, 'fill-extrusion-vertical-gradient': true
    } },
    { ...vector('road-label', 'transportation_name'), type: 'symbol', minzoom: 12, filter: ['==', ['geometry-type'], 'LineString'], layout: {
      'symbol-placement': 'line', 'text-field': name, 'text-font': font, 'text-size': ['interpolate', ['linear'], ['zoom'], 12, 11, 17, 14], 'text-max-angle': 30, 'symbol-spacing': 280
    }, paint: { 'text-color': '#35434a', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } },
    { ...vector('place-label', 'place'), type: 'symbol', maxzoom: 16, layout: {
      'text-field': name, 'text-font': font, 'text-size': ['match', ['get', 'class'], ['city', 'town'], 17, 12], 'text-transform': 'uppercase', 'text-letter-spacing': 0.08
    }, paint: { 'text-color': '#53636a', 'text-halo-color': '#ffffff', 'text-halo-width': 2 } },
    { ...vector('poi-label', 'poi'), type: 'symbol', minzoom: 16, filter: ['all', ['<=', ['coalesce', ['get', 'rank'], 99], 7], ['!=', ['get', 'class'], 'bus']], layout: {
      'text-field': name, 'text-font': font, 'text-size': 11, 'text-max-width': 8
    }, paint: { 'text-color': '#52675b', 'text-halo-color': '#ffffff', 'text-halo-width': 1.5 } }
  ];
  return {
    version: 8, glyphs: 'https://tiles.openfreemap.org/fonts/{fontstack}/{range}.pbf',
    light: { anchor: 'viewport', color: '#fff6e6', intensity: 0.4, position: [1.5, 210, 35] },
    sources: {
      openmaptiles: { type: 'vector', url: 'https://tiles.openfreemap.org/planet', attribution: '<a href="https://openfreemap.org/">OpenFreeMap</a> · <a href="https://www.openmaptiles.org/">© OpenMapTiles</a> · <a href="https://www.openstreetmap.org/copyright">© OpenStreetMap</a>' },
      'esri-world': { type: 'raster', tileSize: 256, maxzoom: 19, tiles: ['https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}'], attribution: 'Imagery © Esri' },
      'pinellas-2025': { type: 'raster', tileSize: 256, maxzoom: 19, bounds: [-82.94, 27.55, -82.50, 28.20], tiles: ['https://egis.pinellas.gov/gis/rest/services/Aerials2025/ImageServer/tile/{z}/{y}/{x}'], attribution: 'Pinellas County Enterprise GIS' },
      'pinellas-2024': { type: 'raster', tileSize: 256, maxzoom: 19, bounds: [-82.94, 27.55, -82.50, 28.20], tiles: ['https://egis.pinellas.gov/gis/rest/services/Aerials/Aerials2024/ImageServer/exportImage?bbox={bbox-epsg-3857}&bboxSR=3857&imageSR=3857&size=256%2C256&format=jpgpng&transparent=false&f=image'], attribution: 'Pinellas County Enterprise GIS' },
      'hillsborough-2025': { type: 'raster', tileSize: 256, maxzoom: 19, bounds: [-82.78, 27.56, -82.05, 28.19], tiles: ['https://maps.hillsboroughcounty.org/arcgis/rest/services/AerialsNew/Aerials_2025/ImageServer/tile/{z}/{y}/{x}'], attribution: 'Hillsborough County Geospatial Services' }
    }, layers
  };
}
