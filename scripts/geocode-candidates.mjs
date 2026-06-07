#!/usr/bin/env node
import { readFileSync, writeFileSync } from 'node:fs';

const candidatesPath = 'data/staged-project-candidates.json';
const providerRegistryPath = 'data/geocoding-provider-registry.json';
const userAgent = 'WhatsBeingBuiltGeocoder/0.1 (+https://whatsbeingbuilt.netlify.app/)';
const today = new Date().toISOString().slice(0, 10);

function parseArgs(argv) {
  const args = {
    apply: false,
    provider: 'nominatim',
    limit: Number.POSITIVE_INFINITY,
    includeReviewed: false
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--apply') args.apply = true;
    else if (arg === '--include-reviewed') args.includeReviewed = true;
    else if (arg === '--provider') args.provider = argv[++index] || args.provider;
    else if (arg === '--limit') args.limit = Number(argv[++index] || args.limit);
    else if (arg === '--help' || arg === '-h') {
      printUsage();
      process.exit(0);
    }
  }
  return args;
}

function printUsage() {
  console.log(`Usage: npm run geocode:candidates -- [--apply] [--provider nominatim] [--limit 10] [--include-reviewed]

Dry run by default. Use --apply to write geocode audit fields and safe coordinates back to data/staged-project-candidates.json.
Low-confidence or vague matches stay staged as geocode_status: needs_manual_review.`);
}

function normalize(value) {
  return String(value || '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function inBounds(lat, lng, provider) {
  const [south, west, north, east] = provider.bounds?.bbox || [];
  return typeof south === 'number' && typeof west === 'number' && typeof north === 'number' && typeof east === 'number'
    ? lat >= south && lat <= north && lng >= west && lng <= east
    : true;
}

function queryForCandidate(candidate, provider) {
  const rawAddress = String(candidate.address || '').trim();
  if (!rawAddress) return '';
  const normalized = normalize(rawAddress);
  const hasCity = normalized.includes('st petersburg');
  const hasState = /\bfl\b|\bflorida\b/.test(normalized);
  const parts = [rawAddress];
  if (!hasCity) parts.push(provider.bounds?.city || 'St. Petersburg');
  if (!hasState) parts.push(provider.bounds?.state || 'FL');
  return parts.join(', ');
}

function extractStreetNumber(value) {
  return String(value || '').match(/\b(\d{2,6})\b/)?.[1] || '';
}

function streetTokens(value) {
  const ignored = new Set(['street', 'st', 'avenue', 'ave', 'road', 'rd', 'north', 'south', 'east', 'west', 'n', 's', 'e', 'w', 'fl', 'florida', 'stpetersburg', 'petersburg']);
  return normalize(value).split(' ').filter((token) => token.length > 1 && !ignored.has(token));
}

function scoreNominatimResult(candidate, result, provider) {
  const address = result.address || {};
  const lat = Number(result.lat);
  const lng = Number(result.lon);
  const reasons = [];
  let score = 0;

  if (!Number.isFinite(lat) || !Number.isFinite(lng)) {
    return { score: 0, reasons: ['no numeric lat/lng'], lat, lng, vague: true };
  }

  const candidateAddress = String(candidate.address || '');
  const display = String(result.display_name || '');
  const resultLabel = normalize(display);
  const preciseAddress = /^\d+\s+/.test(candidateAddress);
  const candidateNumber = extractStreetNumber(candidateAddress);
  const resultNumber = address.house_number || extractStreetNumber(display);
  const candidateTokens = new Set(streetTokens(candidateAddress));
  const resultTokens = new Set(streetTokens(`${address.road || ''} ${display}`));
  const tokenMatches = [...candidateTokens].filter((token) => resultTokens.has(token));

  if (candidateAddress) {
    score += 0.2;
    reasons.push('candidate has an address');
  }
  if (preciseAddress) {
    score += 0.1;
    reasons.push('candidate address starts with a street number');
  }
  if (inBounds(lat, lng, provider)) {
    score += 0.2;
    reasons.push('result is inside St. Pete review bounds');
  }
  if (resultLabel.includes('st petersburg') || normalize(address.city || address.town || address.municipality || '').includes('st petersburg')) {
    score += 0.15;
    reasons.push('result city matches St. Petersburg');
  }
  if (normalize(address.state || '').includes('florida')) {
    score += 0.05;
    reasons.push('result state is Florida');
  }
  if (candidateNumber && resultNumber && candidateNumber === String(resultNumber)) {
    score += 0.15;
    reasons.push('street number matches');
  }
  if (tokenMatches.length > 0) {
    score += Math.min(0.1, tokenMatches.length * 0.05);
    reasons.push(`street token match: ${tokenMatches.join(', ')}`);
  }
  if (typeof result.importance === 'number') {
    score += Math.min(0.05, Math.max(0, result.importance) / 10);
  }

  const vagueTypes = new Set(['city', 'town', 'village', 'municipality', 'administrative']);
  const vague = vagueTypes.has(result.type) && !resultNumber;
  if (vague) reasons.push(`vague result type: ${result.type}`);
  if (!inBounds(lat, lng, provider)) reasons.push('outside St. Pete review bounds');

  return { score: Math.min(1, Number(score.toFixed(3))), reasons, lat, lng, vague };
}

async function geocodeWithNominatim(candidate, provider) {
  const query = queryForCandidate(candidate, provider);
  if (!query) {
    return {
      query,
      status: 'needs_manual_review',
      best: null,
      reason: 'candidate has no usable address'
    };
  }

  const params = new URLSearchParams({
    q: query,
    format: 'jsonv2',
    addressdetails: '1',
    limit: '5',
    countrycodes: 'us'
  });
  const response = await fetch(`${provider.endpoint}?${params}`, {
    headers: { 'user-agent': userAgent }
  });
  if (!response.ok) throw new Error(`Geocode fetch failed for ${candidate.id}: ${response.status} ${response.statusText}`);

  const results = await response.json();
  const ranked = results
    .map((result) => ({ result, ...scoreNominatimResult(candidate, result, provider) }))
    .sort((a, b) => b.score - a.score);
  const best = ranked[0] || null;
  const verified = Boolean(best && best.score >= provider.minimumConfidence && !best.vague);

  return {
    query,
    status: verified ? 'verified' : 'needs_manual_review',
    best,
    topResults: ranked.slice(0, 3).map((item) => ({
      label: item.result.display_name,
      lat: item.lat,
      lng: item.lng,
      score: item.score,
      reasons: item.reasons
    }))
  };
}

function candidateNeedsGeocoding(candidate, includeReviewed) {
  if (!includeReviewed && candidate.review_status !== 'needs_review') return false;
  if (!candidate.address) return true;
  return candidate.review_status === 'needs_review' || includeReviewed;
}

function applyGeocodeAudit(candidate, provider, geocodeResult) {
  const best = geocodeResult.best;
  const next = {
    ...candidate,
    geocode_status: geocodeResult.status,
    geocode_provider: provider.id,
    geocode_query: geocodeResult.query,
    geocode_confidence: best?.score || 0,
    geocode_result_label: best?.result?.display_name || '',
    geocode_checked_at: today,
    geocode_reasons: best?.reasons || [geocodeResult.reason || 'no geocode result'],
    geocode_candidates: geocodeResult.topResults || []
  };

  if (geocodeResult.status === 'verified' && best) {
    next.lat = best.lat;
    next.lng = best.lng;
  }

  return next;
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const providers = JSON.parse(readFileSync(providerRegistryPath, 'utf8'));
  const provider = providers.find((item) => item.id === args.provider && item.enabled);
  if (!provider) {
    throw new Error(`Enabled geocoding provider not found: ${args.provider}`);
  }

  const candidates = JSON.parse(readFileSync(candidatesPath, 'utf8'));
  const indexes = candidates
    .map((candidate, index) => ({ candidate, index }))
    .filter(({ candidate }) => candidateNeedsGeocoding(candidate, args.includeReviewed))
    .slice(0, Number.isFinite(args.limit) ? args.limit : candidates.length);

  console.log(`${args.apply ? 'Applying' : 'Running dry run for'} ${indexes.length} candidate geocode checks via ${provider.name}.`);

  let verifiedCount = 0;
  let reviewCount = 0;
  const nextCandidates = [...candidates];

  for (const { candidate, index } of indexes) {
    const result = await geocodeWithNominatim(candidate, provider);
    const audited = applyGeocodeAudit(candidate, provider, result);
    if (audited.geocode_status === 'verified') verifiedCount += 1;
    else reviewCount += 1;

    console.log(`- ${candidate.id}: ${audited.geocode_status} (${audited.geocode_confidence}) ${audited.geocode_result_label || audited.geocode_reasons.join('; ')}`);
    if (args.apply) nextCandidates[index] = audited;

    if (provider.rateLimitMs) await sleep(provider.rateLimitMs);
  }

  if (args.apply) {
    writeFileSync(candidatesPath, `${JSON.stringify(nextCandidates, null, 2)}\n`);
    console.log(`Updated ${candidatesPath}. verified=${verifiedCount}, needs_manual_review=${reviewCount}`);
  } else {
    console.log(`Dry run only; add --apply to write audit fields. verified=${verifiedCount}, needs_manual_review=${reviewCount}`);
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
