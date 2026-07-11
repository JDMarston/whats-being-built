import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const registryPath = new URL('../data/source-registry.json', import.meta.url);
const areaRegistryPath = new URL('../data/area-registry.json', import.meta.url);
const outputPath = new URL('../data/staged-project-candidates.json', import.meta.url);

const USER_AGENT = 'WhatsBeingBuiltSourceIngest/0.1 (+https://whatsbeingbuilt.netlify.app/)';
const TODAY = new Date().toISOString().slice(0, 10);

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/&/g, ' and ')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
}

function decodeHtml(value) {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&#(\d+);/g, (_, code) => String.fromCharCode(Number(code)))
    .replace(/&#x([a-f0-9]+);/gi, (_, code) => String.fromCharCode(Number.parseInt(code, 16)));
}

function stripTags(value) {
  return decodeHtml(value.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim());
}

function absoluteUrl(url, baseUrl) {
  if (!url) return baseUrl;
  return new URL(decodeHtml(url), baseUrl).toString();
}

function areaContextForSource(source) {
  return source.addressContext || source.area || '';
}

function addressFromName(name, source) {
  const context = areaContextForSource(source);
  return /^\d+\s+/.test(name) && context ? `${name}, ${context}` : '';
}

function candidateFromListing({ source, name, detailUrl, imageUrl }) {
  const address = addressFromName(name, source);
  const confidence = address ? 0.65 : 0.55;
  const id = `${source.id}-${slugify(name)}`;
  return {
    id,
    source_id: source.id,
    source_name: source.name,
    source_url: detailUrl || source.url,
    area_id: source.area_id || 'global',
    area_name: source.area || source.addressContext || '',
    name,
    address,
    extracted_address: '',
    developer: '',
    detail_excerpt: '',
    detail_fetched_at: null,
    lat: null,
    lng: null,
    status: 'under_construction',
    category: 'unknown',
    summary: `Potential project from ${source.name}. Needs manual review for address, coordinates, category, and construction details before publishing.`,
    image_url: imageUrl || null,
    confidence,
    review_status: 'needs_review',
    duplicate_of: null,
    last_seen: TODAY
  };
}

function parseStPeteRisingUnderConstruction(html, source) {
  const candidates = [];
  const slideBlocks = html.split('<!--SLIDE-->');

  for (const block of slideBlocks) {
    if (!block.includes('class="slide"')) continue;

    const detailMatch = block.match(/data-click-through-url="([^"]+)"/i) || block.match(/<a\s+href="([^"]+)"/i);
    const imageMatch = block.match(/(?:data-src|data-image)="([^"]+)"/i);
    const titleMatch = block.match(/<p class="title">([\s\S]*?)<\/p>/i) || block.match(/alt="([^"]+)"/i);
    const name = titleMatch ? stripTags(titleMatch[1]) : '';

    if (!name || /^subscribe$/i.test(name) || /^community supporters$/i.test(name)) continue;

    candidates.push(candidateFromListing({
      source,
      name,
      detailUrl: detailMatch ? absoluteUrl(detailMatch[1], source.url) : source.url,
      imageUrl: imageMatch ? absoluteUrl(imageMatch[1], source.url) : null
    }));
  }

  return candidates;
}

function dedupeCandidates(candidates) {
  const seen = new Set();
  return candidates.filter((candidate) => {
    if (seen.has(candidate.id)) return false;
    seen.add(candidate.id);
    return true;
  });
}

async function fetchText(url) {
  const response = await fetch(url, {
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
    }
  });

  if (!response.ok) {
    throw new Error(`Fetch failed for ${url}: ${response.status} ${response.statusText}`);
  }

  return response.text();
}

function articleTextFromHtml(html) {
  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<footer[\s\S]*?<\/footer>/gi, ' ')
    .replace(/<header[\s\S]*?<\/header>/gi, ' ');

  const articleMatch = body.match(/<article[\s\S]*?<\/article>/i)
    || body.match(/<main[\s\S]*?<\/main>/i);

  return stripTags(articleMatch ? articleMatch[0] : body).replace(/\s+/g, ' ').trim();
}

function cleanExtractedAddress(address) {
  return address
    .replace(/\s+(?:near|at|in|on)\s+.+$/i, '')
    .replace(/[,.\s]+$/g, '')
    .trim();
}

function extractAddressFromText(text, source) {
  const candidates = [
    ...text.matchAll(/\b\d{2,6}\s+(?:[A-Za-z0-9]+\s+){0,5}(?:Street|St\.?|Avenue|Ave\.?|Road|Rd\.?|Boulevard|Blvd\.?|Drive|Dr\.?|Lane|Ln\.?|Court|Ct\.?|Way|Place|Pl\.?|Terrace|Ter\.?)\s*(?:North|South|East|West|N\.?|S\.?|E\.?|W\.?)?/gi)
  ].map((match) => cleanExtractedAddress(match[0]));

  const filtered = candidates.filter((address) => {
    const normalized = address.toLowerCase();
    if (/\b(2020|2021|2022|2023|2024|2025|2026)\b/.test(normalized)) return false;
    if (/\b(acre|parcel|units?|square feet|fronting|block of|new townhomes|concrete|trucks|make their way|will make|workers|residents|apartments?)\b/i.test(address)) return false;
    return /\b\d{2,6}\b/.test(address) && /\b(street|st\.?|avenue|ave\.?|road|rd\.?|boulevard|blvd\.?|drive|dr\.?|lane|ln\.?|court|ct\.?|way|place|pl\.?|terrace|ter\.?)\b/i.test(address);
  });

  filtered.sort((a, b) => {
    const score = (address) => {
      let value = address.length;
      if (/\b\d+(?:st|nd|rd|th)\b/i.test(address)) value += 20;
      if (/\b(north|south|east|west|n\.?|s\.?|e\.?|w\.?)$/i.test(address)) value += 10;
      return value;
    };
    return score(b) - score(a);
  });

  const context = areaContextForSource(source);
  return filtered[0] && context ? `${filtered[0]}, ${context}` : '';
}

function extractDeveloperFromText(text) {
  const patterns = [
    /(?:developer|developed by|from developer|by developer)\s+(?:is|will be|,|:)?\s*([A-Z][A-Za-z0-9&.,'’\- ]{2,80}?)(?:\s+(?:on|at|near|has|is|will|plans|proposes|received|submitted)|[.;,])/,
    /([A-Z][A-Za-z0-9&.,'’\- ]{2,80}?)(?:\s+is the developer|\s+will develop|\s+is developing|\s+has proposed)/
  ];

  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match?.[1]) {
      return match[1].replace(/\s+/g, ' ').replace(/[,.\s]+$/g, '').trim();
    }
  }

  return '';
}

function excerptForCandidate(text, candidate) {
  if (!text) return '';
  const normalizedName = candidate.name.toLowerCase();
  const index = text.toLowerCase().indexOf(normalizedName.split(' ')[0] || normalizedName);
  const start = index >= 0 ? Math.max(0, index - 160) : 0;
  return text.slice(start, start + 420).replace(/\s+/g, ' ').trim();
}

function enrichCandidateFromDetailPage(candidate, html, source) {
  const articleText = articleTextFromHtml(html);
  const extracted_address = candidate.address || extractAddressFromText(articleText, source || candidate);
  const developer = extractDeveloperFromText(articleText);
  const detail_excerpt = excerptForCandidate(articleText, candidate);
  const enrichedAddress = candidate.address || extracted_address;

  return {
    ...candidate,
    address: enrichedAddress,
    extracted_address,
    developer,
    detail_excerpt,
    detail_fetched_at: TODAY,
    confidence: Math.min(1, Number((candidate.confidence + (extracted_address ? 0.1 : 0) + (developer ? 0.05 : 0) + (detail_excerpt ? 0.03 : 0)).toFixed(2))),
    summary: detail_excerpt
      ? `${candidate.summary} Detail page excerpt: ${detail_excerpt.slice(0, 220)}${detail_excerpt.length > 220 ? '…' : ''}`
      : candidate.summary
  };
}

function mergeExistingReviewState(candidate, existingCandidate) {
  if (!existingCandidate) return candidate;
  const preservedFields = [
    'review_status',
    'duplicate_of',
    'duplicate_of_project_id',
    'promoted_project_id',
    'rejected_reason',
    'lat',
    'lng',
    'extracted_address',
    'developer',
    'detail_excerpt',
    'detail_fetched_at',
    'detail_error',
    'geocode_status',
    'geocode_provider',
    'geocode_query',
    'geocode_confidence',
    'geocode_result_label',
    'geocode_checked_at',
    'geocode_reasons',
    'geocode_candidates'
  ];
  const merged = { ...candidate };
  for (const field of preservedFields) {
    if (Object.hasOwn(existingCandidate, field)) merged[field] = existingCandidate[field];
  }
  return merged;
}

async function fetchDetailPages(candidates, sourceById, { limit = Number.POSITIVE_INFINITY } = {}) {
  const enriched = [];
  let fetched = 0;

  for (const candidate of candidates) {
    const shouldFetch = candidate.source_url && candidate.source_url.startsWith('https://') && candidate.source_url !== candidate.source_url.split('#')[0] + '#';
    if (!shouldFetch || fetched >= limit) {
      enriched.push(candidate);
      continue;
    }

    try {
      const html = await fetchText(candidate.source_url);
      enriched.push(enrichCandidateFromDetailPage(candidate, html, sourceById.get(candidate.source_id)));
      fetched += 1;
      console.log(`detail: enriched ${candidate.id}`);
    } catch (error) {
      enriched.push({
        ...candidate,
        detail_fetched_at: TODAY,
        detail_excerpt: candidate.detail_excerpt || '',
        extracted_address: candidate.extracted_address || '',
        developer: candidate.developer || '',
        detail_error: error.message
      });
      console.warn(`detail: skipped ${candidate.id}: ${error.message}`);
    }
  }

  return enriched;
}

function loadExistingCandidates() {
  if (!existsSync(outputPath)) return new Map();
  const existing = JSON.parse(readFileSync(outputPath, 'utf8'));
  return new Map(existing.map((candidate) => [candidate.id, candidate]));
}

const adapters = {
  'st-pete-rising-under-construction': async (source) => {
    const html = await fetchText(source.url);
    return parseStPeteRisingUnderConstruction(html, source);
  }
};

async function main() {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const areas = JSON.parse(readFileSync(areaRegistryPath, 'utf8'));
  const areaById = new Map(areas.map((area) => [area.id, area]));
  const sourceById = new Map(registry.map((source) => [source.id, source]));
  const enabledSources = registry
    .filter((source) => source.enabled)
    .map((source) => ({ ...areaById.get(source.area_id), ...source }));
  const stagedCandidates = [];
  const existingCandidates = loadExistingCandidates();

  for (const source of enabledSources) {
    const adapter = adapters[source.adapter || source.id];
    if (!adapter) {
      console.warn(`No adapter for enabled source ${source.id}; skipping`);
      continue;
    }

    const candidates = await adapter(source);
    stagedCandidates.push(...candidates);
    console.log(`${source.id}: staged ${candidates.length} candidates`);
  }

  const uniqueCandidates = dedupeCandidates(stagedCandidates)
    .sort((a, b) => a.name.localeCompare(b.name));
  const enrichedCandidates = await fetchDetailPages(uniqueCandidates, sourceById, { limit: Number(process.env.WBB_DETAIL_LIMIT || 8) });
  const mergedCandidates = enrichedCandidates.map((candidate) => mergeExistingReviewState(candidate, existingCandidates.get(candidate.id)));

  mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(mergedCandidates, null, 2)}\n`);
  console.log(`Wrote ${mergedCandidates.length} staged candidates to data/staged-project-candidates.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
