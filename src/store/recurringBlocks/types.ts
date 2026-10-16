// Mirrors recurringblocks/domain/models/block_series_models.py — keep field
// names/shapes in sync with that file.

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type RecurrenceType = 'weekly' | 'monthly' | 'specific_dates';
export type SeriesEndType = 'never' | 'on_date' | 'after_count';
export type OccurrenceConflictType = 'none' | 'member' | 'coach' | 'already_blocked' | 'not_yet_created';
export type ConflictDecision = 'keep' | 'cancel';
export type OccurrenceOutcome =
  | 'blocked'
  | 'member_cancelled_and_blocked'
  | 'coach_cancelled_and_blocked'
  | 'kept_booking_skipped'
  | 'not_yet_created'
  | 'already_blocked'
  | 'conflict_unresolved';

/** The recurrence pattern fields shared by the preview and create requests. */
export interface SeriesCoreFields {
  facilityCode: string;
  laneCode: string;
  recurrenceType: RecurrenceType;
  daysOfWeek: DayOfWeek[]; // required (min 1) when recurrenceType='weekly', else []
  monthlyEndDay?: number; // 1-31 — only for recurrenceType='monthly': the LAST day of the recurring range, paired with startDate's own day as the range's first day
  specificDates: string[]; // YYYY-MM-DD — required (min 1) when recurrenceType='specific_dates', else []
  startTimeLocal: string; // HH:MM
  endTimeLocal: string; // HH:MM
  timezone: string; // IANA
  startDate: string; // YYYY-MM-DD — first occurrence (weekly/monthly), or the lower bound of specificDates' range
  endType?: SeriesEndType; // required when recurrenceType='weekly'; omitted when recurrenceType='specific_dates'
  endDate?: string; // required when endType='on_date', OR when recurrenceType='specific_dates' (upper bound of the range)
  occurrenceCount?: number; // required when endType='after_count'; not applicable to recurrenceType='specific_dates'
  reason: string;
}

export type SeriesPreviewRequest = SeriesCoreFields;

export interface BookingSummary {
  bookingCode: string;
  memberName: string;
  isCoachBooking: boolean;
}

export interface OccurrencePreview {
  occurrenceDate: string;
  conflictType: OccurrenceConflictType;
  booking?: BookingSummary;
}

export interface SeriesPreviewResponse {
  occurrences: OccurrencePreview[];
  totalOccurrences: number;
  memberConflictCount: number;
  coachConflictCount: number;
}

export interface ConflictResolution {
  occurrenceDate: string;
  decision: ConflictDecision;
  reason?: string; // required when decision='cancel'
}

export interface CreateSeriesRequest extends SeriesCoreFields {
  idempotencyKey: string;
  conflictResolutions: ConflictResolution[];
}

export interface OccurrenceResult {
  occurrenceDate: string;
  outcome: OccurrenceOutcome;
  refundAmount: number;
}

export interface BlockSeries extends SeriesCoreFields {
  id: string;
  type: 'block_series';
  status: 'active' | 'paused' | 'cancelled';
  skippedDates: string[];
  createdBy: string;
  createdAt: string;
  updatedBy?: string;
  updatedAt?: string;
  idempotencyKey: string;
  version: number;
}

export interface CreateSeriesResponse {
  series: BlockSeries;
  occurrences: OccurrenceResult[];
  unresolvedConflicts: string[];
  idempotentReplay: boolean;
}

// ───────────────────────────── Phase 4 ─────────────────────────────

export type EditScope = 'this_one' | 'this_and_following' | 'all';

/** BlockSeries plus the Cosmos _etag to echo back on the next edit/skip/cancel. */
export interface SeriesWithEtag extends BlockSeries {
  etag?: string;
}

export interface GetSeriesResponse {
  series: SeriesWithEtag;
}

export interface SkipOccurrenceRequest {
  seriesId: string;
  occurrenceDate: string;
  expectedEtag: string;
}

export interface SkipOccurrenceResponse {
  series: SeriesWithEtag;
  unblocked: boolean;
}

export interface CancelSeriesRequest {
  seriesId: string;
  expectedEtag: string;
}

export interface CancelSeriesResponse {
  series: SeriesWithEtag;
}

export interface EditSeriesRequest {
  seriesId: string;
  scope: EditScope;
  reason: string;
  occurrenceDate?: string; // required for 'this_one' and 'this_and_following'
  expectedEtag?: string; // required for 'this_and_following' and 'all'
  idempotencyKey?: string; // required for 'this_and_following'
  recurrenceType?: RecurrenceType;
  daysOfWeek?: DayOfWeek[];
  monthlyEndDay?: number;
  specificDates?: string[];
  startTimeLocal?: string;
  endTimeLocal?: string;
  timezone?: string;
  endType?: SeriesEndType;
  endDate?: string;
  occurrenceCount?: number;
}

export interface EditSeriesResponse {
  oldSeries: SeriesWithEtag;
  newSeries?: SeriesWithEtag;
  createResult?: CreateSeriesResponse;
}

// ───────────────────────────── Phase 5 ─────────────────────────────

export interface SeriesListItem {
  series: SeriesWithEtag;
  remainingBlockedDates: string[];
  remainingBlockedCount: number;
}

export interface ListSeriesResponse {
  series: SeriesListItem[];
}

export interface UnblockAllResponse {
  seriesId: string;
  unblockedCount: number;
  unblockedDates: string[];
}

// ───────────────────────────── Conflicts surface ─────────────────────────────
// A live, on-demand view of every member/coach conflict an ACTIVE series'
// upcoming occurrence currently has — recomputed fresh on every request,
// never read from a stale old extension-job run log.

export interface ConflictItem {
  seriesId: string;
  facilityCode: string;
  laneCode: string;
  occurrenceDate: string;
  conflictType: 'member' | 'coach';
  booking?: BookingSummary;
  reason: string;
}

export interface ListConflictsResponse {
  conflicts: ConflictItem[];
  totalCount: number;
}

export interface ResolveConflictRequest {
  seriesId: string;
  occurrenceDate: string;
  decision: ConflictDecision;
  reason?: string; // required when decision='cancel'
}

export interface ResolveConflictResponse {
  series: SeriesWithEtag;
  occurrenceResult: OccurrenceResult;
}
