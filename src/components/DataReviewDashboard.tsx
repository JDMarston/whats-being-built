import {
  getNeedsReviewCandidates,
  reviewPriority,
  stagedCandidateStats,
  stagedCandidates,
  type StagedCandidate
} from "../lib/stagedCandidates";

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number") return "unknown";
  return Math.round(value * 100) + "%";
}

function reviewStatusLabel(candidate: StagedCandidate) {
  if (candidate.review_status === "needs_review") return "Needs review";
  if (candidate.review_status === "promoted") return "Promoted";
  if (candidate.review_status === "duplicate") return "Duplicate";
  return "Rejected";
}

function reviewCommand(candidate: StagedCandidate) {
  return "npm run review:candidates -- show " + candidate.id;
}

const needsReviewCandidates = getNeedsReviewCandidates();
const recentCandidates = stagedCandidates.slice(0, 8);

export default function DataReviewDashboard() {
  const topQueue = needsReviewCandidates.slice(0, 12);

  return (
    <main className="review-dashboard">
      <section className="review-hero">
        <a className="review-back-link" href="/">← Map</a>
        <div>
          <p className="intro-kicker">data-first build pass</p>
          <h1>Review queue</h1>
          <p>
            Before paying for better maps, use the data queue to decide which scraped projects are real,
            which are duplicates, and which need better address/geocode work.
          </p>
        </div>
      </section>

      <section className="review-stat-grid" aria-label="Staged candidate stats">
        <span><strong>{stagedCandidateStats.needsReview}</strong><small>Needs review</small></span>
        <span><strong>{stagedCandidateStats.promoted}</strong><small>promoted to map</small></span>
        <span><strong>{stagedCandidateStats.duplicate}</strong><small>duplicates caught</small></span>
        <span><strong>{stagedCandidateStats.withDetailEnrichment}</strong><small>detail-enriched</small></span>
        <span><strong>{stagedCandidateStats.geocoded}</strong><small>with coordinates</small></span>
        <span><strong>{stagedCandidateStats.sources}</strong><small>source feeds</small></span>
      </section>

      <section className="review-workflow-card" aria-label="Manual review workflow">
        <h2>Fast review workflow</h2>
        <ol>
          <li>Open the source and skim whether the project is real/current.</li>
          <li>Check address, developer, confidence, geocode status, and duplicate clues.</li>
          <li>Run the suggested CLI command, then promote, duplicate, or reject from terminal.</li>
        </ol>
      </section>

      <section className="review-section" aria-label="Priority candidates">
        <div className="review-section-heading">
          <h2>Priority queue</h2>
          <p>Sorted by reviewPriority: confidence plus address/detail/geocode evidence.</p>
        </div>
        <div className="review-card-grid">
          {topQueue.map((candidate) => (
            <article key={candidate.id} className="review-candidate-card">
              <div className="review-card-header">
                <span>{reviewStatusLabel(candidate)}</span>
                <strong>{reviewPriority(candidate)}</strong>
              </div>
              <h3>{candidate.name}</h3>
              <p>{candidate.summary}</p>
              <dl>
                <div><dt>Address</dt><dd>{candidate.extracted_address || candidate.address || "Needs address"}</dd></div>
                <div><dt>Developer</dt><dd>{candidate.developer || "Unknown"}</dd></div>
                <div><dt>Confidence</dt><dd>{formatPercent(candidate.confidence)}</dd></div>
                <div><dt>Geocode</dt><dd>{candidate.geocode_status || "not checked"} · {formatPercent(candidate.geocode_confidence)}</dd></div>
                <div><dt>Source</dt><dd>{candidate.source_name || candidate.source_id}</dd></div>
                <div><dt>Last seen</dt><dd>{candidate.last_seen}</dd></div>
              </dl>
              <p className="review-excerpt">{candidate.detail_excerpt || "No detail excerpt captured yet."}</p>
              <div className="review-actions">
                <a href={candidate.source_url} target="_blank" rel="noreferrer">Open source</a>
                <code>{reviewCommand(candidate)}</code>
              </div>
              <span className="visually-hidden">
                source_url confidence geocode_status detail_excerpt
              </span>
            </article>
          ))}
        </div>
      </section>

      <section className="review-section" aria-label="Recent staged candidates">
        <div className="review-section-heading">
          <h2>Recently staged</h2>
          <p>Quick sanity check that ingest is still finding useful candidates.</p>
        </div>
        <ul className="review-recent-list">
          {recentCandidates.map((candidate) => (
            <li key={candidate.id}>
              <strong>{candidate.name}</strong>
              <span>{reviewStatusLabel(candidate)} · {candidate.source_name || candidate.source_id}</span>
            </li>
          ))}
        </ul>
      </section>
    </main>
  );
}
