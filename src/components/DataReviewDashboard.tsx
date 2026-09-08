import {
  getNeedsReviewCandidates,
  stagedCandidateStats,
  stagedCandidates,
  type StagedCandidate
} from '../lib/stagedCandidates';

function formatPercent(value: number | null | undefined) {
  if (typeof value !== 'number') return 'unknown';
  return Math.round(value * 100) + '%';
}

function reviewStatusLabel(candidate: StagedCandidate) {
  if (candidate.review_status === 'needs_review') return 'Needs review';
  if (candidate.review_status === 'promoted') return 'Promoted';
  if (candidate.review_status === 'duplicate') return 'Duplicate';
  return 'Rejected';
}

function reviewCommand(candidate: StagedCandidate) {
  return 'npm run review:candidates -- show ' + candidate.id;
}

function candidateAddress(candidate: StagedCandidate) {
  return candidate.extracted_address || candidate.address || 'Address still needs to be checked';
}

const needsReviewCandidates = getNeedsReviewCandidates();
const recentCandidates = stagedCandidates.slice(0, 8);

export default function DataReviewDashboard() {
  const topQueue = needsReviewCandidates.slice(0, 12);

  return (
    <main className="review-dashboard">
      <header className="review-topbar">
        <a className="review-back-link" href="/">← Map</a>
        <strong>{stagedCandidateStats.needsReview} waiting</strong>
        <nav aria-label="Review page sections">
          <a href="#queue">Queue</a>
          <a href="#recent">Recent</a>
        </nav>
      </header>

      <section className="review-hero">
        <h1>Review imports</h1>
        <p>
          These projects came from public sources and are not on the map yet. Open one, check the details, then use the command on the card.
        </p>
      </section>

      <section id="queue" className="review-section" aria-label="Projects to check">
        <div className="review-section-heading">
          <h2>Projects to check</h2>
          <span>{topQueue.length}</span>
        </div>
        <div className="review-card-grid">
          {topQueue.map((candidate) => (
            <details key={candidate.id} className="review-candidate-card">
              <summary>
                <div className="review-card-header">{reviewStatusLabel(candidate)}</div>
                <h3>{candidate.name}</h3>
                <p className="review-card-address">{candidateAddress(candidate)}</p>
                <small>{candidate.source_name || candidate.source_id}</small>
              </summary>
              <div className="review-card-body">
                <dl>
                  <div><dt>Address</dt><dd>{candidateAddress(candidate)}</dd></div>
                  <div><dt>Developer</dt><dd>{candidate.developer || 'Unknown'}</dd></div>
                  <div><dt>Confidence</dt><dd>{formatPercent(candidate.confidence)}</dd></div>
                  <div><dt>Geocode</dt><dd>{candidate.geocode_status || 'not checked'} · {formatPercent(candidate.geocode_confidence)}</dd></div>
                  <div><dt>Source</dt><dd>{candidate.source_name || candidate.source_id}</dd></div>
                  <div><dt>Last seen</dt><dd>{candidate.last_seen}</dd></div>
                </dl>
                <div className="review-actions">
                  <a href={candidate.source_url} target="_blank" rel="noreferrer">Open source</a>
                  <code>{reviewCommand(candidate)}</code>
                </div>
              </div>
            </details>
          ))}
        </div>
      </section>

      <section id="recent" className="review-section" aria-label="Recent imports">
        <div className="review-section-heading">
          <h2>Latest imports</h2>
          <span>{recentCandidates.length}</span>
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
