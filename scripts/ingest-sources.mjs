import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';

const registryPath = new URL('../data/source-registry.json', import.meta.url);
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

function addressFromName(name) {
  return /^\d+\s+/.test(name) ? `${name}, St. Petersburg, FL` : '';
}

function candidateFromListing({ source, name, detailUrl, imageUrl }) {
  const address = addressFromName(name);
  const confidence = address ? 0.65 : 0.55;
  const id = `${source.id}-${slugify(name)}`;
  return {
    id,
    source_id: source.id,
    source_name: source.name,
    source_url: detailUrl || source.url,
    name,
    address,
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

const adapters = {
  'st-pete-rising-under-construction': async (source) => {
    const html = await fetchText(source.url);
    return parseStPeteRisingUnderConstruction(html, source);
  }
};

async function main() {
  const registry = JSON.parse(readFileSync(registryPath, 'utf8'));
  const enabledSources = registry.filter((source) => source.enabled);
  const stagedCandidates = [];

  for (const source of enabledSources) {
    const adapter = adapters[source.id];
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

  mkdirSync(new URL('../data/', import.meta.url), { recursive: true });
  writeFileSync(outputPath, `${JSON.stringify(uniqueCandidates, null, 2)}\n`);
  console.log(`Wrote ${uniqueCandidates.length} staged candidates to data/staged-project-candidates.json`);
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
