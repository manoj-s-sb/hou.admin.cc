// Mirrors recurringblocks/domain/models/block_series_models.py — keep field
// names/shapes in sync with that file.

export type DayOfWeek = 'monday' | 'tuesday' | 'wednesday' | 'thursday' | 'friday' | 'saturday' | 'sunday';
export type SeriesEndType = 'never' | 'on_date' | 'after_count';
export type OccurrenceConflictType = 'none' | 'member' | 'coach' | 'already_blocked' | 'not_yet_created';
export type CoachConflictDecision = 'keep' | 'cancel';
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
  dayOfWeek: DayOfWeek;
  startTimeLocal: string; // HH:MM
  endTimeLocal: string; // HH:MM
  timezone: string; // IANA
  startDate: string; // YYYY-MM-DD
  endType: SeriesEndType;
  endDate?: string; // required when endType='on_date'
  occurrenceCount?: number; // required when endType='after_count'
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

export interface CoachConflictResolution {
  occurrenceDate: string;
  decision: CoachConflictDecision;
  reason?: string; // required when decision='cancel'
}

export interface CreateSeriesRequest extends SeriesCoreFields {
  idempotencyKey: string;
  coachConflictResolutions: CoachConflictResolution[];
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
  dayOfWeek?: DayOfWeek;
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
