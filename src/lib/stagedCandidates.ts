import rawStagedCandidates from "../../data/staged-project-candidates.json";

export type ReviewStatus = "needs_review" | "promoted" | "duplicate" | "rejected";

export type StagedCandidate = {
  id: string;
  source_id: string;
  source_name?: string;
  source_url: string;
  name: string;
  address: string;
  extracted_address?: string | null;
  developer?: string | null;
  detail_excerpt?: string | null;
  detail_fetched_at?: string | null;
  lat?: number | null;
  lng?: number | null;
  status: string;
  category?: string;
  summary: string;
  confidence: number;
  review_status: ReviewStatus;
  last_seen: string;
  geocode_status?: string | null;
  geocode_confidence?: number | null;
  geocode_provider?: string | null;
  geocode_result_label?: string | null;
  duplicate_of_project_id?: string | null;
  promoted_project_id?: string | null;
};

export type StagedCandidateStats = {
  total: number;
  needsReview: number;
  promoted: number;
  duplicate: number;
  rejected: number;
  geocoded: number;
  withDetailEnrichment: number;
  sources: number;
};

export const stagedCandidates = rawStagedCandidates as StagedCandidate[];

export function reviewPriority(candidate: StagedCandidate): number {
  if (candidate.review_status !== "needs_review") return 0;

  let priority = Math.round(candidate.confidence * 100);
  if (candidate.lat && candidate.lng) priority += 35;
  if (candidate.geocode_status === "matched") priority += 25;
  if (candidate.extracted_address) priority += 20;
  if (candidate.developer) priority += 15;
  if (candidate.detail_excerpt) priority += 10;
  return priority;
}

export function getNeedsReviewCandidates(candidates: StagedCandidate[] = stagedCandidates): StagedCandidate[] {
  return candidates
    .filter((candidate) => candidate.review_status === "needs_review")
    .sort((left, right) => reviewPriority(right) - reviewPriority(left) || left.name.localeCompare(right.name));
}

export const stagedCandidateStats: StagedCandidateStats = stagedCandidates.reduce(
  (stats, candidate) => {
    stats.total += 1;
    if (candidate.review_status === "needs_review") stats.needsReview += 1;
    if (candidate.review_status === "promoted") stats.promoted += 1;
    if (candidate.review_status === "duplicate") stats.duplicate += 1;
    if (candidate.review_status === "rejected") stats.rejected += 1;
    if (candidate.lat && candidate.lng) stats.geocoded += 1;
    if (candidate.detail_excerpt || candidate.extracted_address || candidate.developer) stats.withDetailEnrichment += 1;
    return stats;
  },
  {
    total: 0,
    needsReview: 0,
    promoted: 0,
    duplicate: 0,
    rejected: 0,
    geocoded: 0,
    withDetailEnrichment: 0,
    sources: new Set(stagedCandidates.map((candidate) => candidate.source_id)).size
  }
);
