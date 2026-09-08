import assert from 'node:assert/strict';
import { distanceMeters, distanceLabel } from '../src/lib/nearby.ts';
import { test } from 'node:test';
import { validateStyleMin } from '@maplibre/maplibre-gl-style-spec';
import { createMapStyle, vectorBaseLayers, vectorLabelLayers } from '../src/lib/mapStyle.ts';
import { headingFromReading, normalizeDegrees, smoothHeading } from '../src/lib/orientation.ts';

test('default vector map conforms to MapLibre style specification', () => {
  assert.deepEqual(validateStyleMin(createMapStyle()), []);
});
test('default does not request raster imagery or elevation', () => {
  const style = createMapStyle();
  assert.equal(style.terrain, undefined);
  assert(!Object.values(style.sources).some(source => source.type === 'raster-dem'));
  assert(style.layers.filter(layer => layer.type === 'raster').every(layer => layer.layout.visibility === 'none'));
});
test('every mode-switch layer exists and shares the vector source', () => {
  const style = createMapStyle();
  for (const id of [...vectorBaseLayers, ...vectorLabelLayers]) assert(style.layers.some(layer => layer.id === id));
  for (const id of [...vectorLabelLayers, 'building-3d']) assert.equal(style.layers.find(layer => layer.id === id).source, 'openmaptiles');
});
test('relative alpha cannot masquerade as north', () => {
  assert.equal(headingFromReading({alpha: 90, absolute: false}), null);
  assert.equal(headingFromReading({alpha: NaN, absolute: true}), null);
  assert.equal(headingFromReading({alpha: null, absolute: true}), null);
});
test('absolute and iOS headings respect screen orientation', () => {
  assert.equal(headingFromReading({alpha: 90, absolute: true}), 270);
  assert.equal(headingFromReading({alpha: 90, absolute: true}, 90), 0);
  assert.equal(headingFromReading({alpha: null, webkitCompassHeading: 350, webkitCompassAccuracy: 10}, 90), 80);
});
test('reject unreliable iOS compass fixes', () => {
  for (const accuracy of [-1, 45, NaN]) assert.equal(headingFromReading({alpha: null, webkitCompassHeading: 90, webkitCompassAccuracy: accuracy}), null);
});
test('nearby distances handle identity, symmetry and the date line', () => {
  assert.equal(distanceMeters({lat: 0, lng: 0}, {lat: 0, lng: 0}), 0);
  const a = {lat: 27.77, lng: -82.64}, b = {lat: 40.71, lng: -74};
  assert.equal(distanceMeters(a,b), distanceMeters(b,a));
  assert(distanceMeters({lat: 0, lng: 179.99}, {lat: 0, lng: -179.99}) < 2300);
});
test('distance labels distinguish feet, miles and invalid readings', () => {
  assert.equal(distanceLabel(30.48), '100 ft');
  assert.equal(distanceLabel(1609.344), '1.0 mi');
  assert.equal(distanceLabel(NaN), '');
});

test('heading smoothing crosses north on the short path', () => {
  assert.equal(normalizeDegrees(-10), 350);
  assert.equal(smoothHeading(359, 1), 359.5);
  assert.equal(smoothHeading(1, 359), 0.5);
  assert.equal(smoothHeading(null, 370), 10);
});
