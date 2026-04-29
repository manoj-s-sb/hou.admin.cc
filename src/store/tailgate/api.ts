import { createAsyncThunk } from '@reduxjs/toolkit';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { handleApiError } from '../../utils/errorUtils';

import { CreateTailgateEventRequest, TailgateEventType, TailgateLog, TailgateReview } from './types';

const EVENT_TYPE_MAP: Record<string, TailgateEventType> = {
  entry:    'Entry',
  exit:     'Exit',
  tailgate: 'Tailgate',
};

const COLOR_MAP: Record<TailgateEventType, { ab: string; ac: string }> = {
  Entry:    { ab: '#eef2ff', ac: '#2563eb' },
  Exit:     { ab: '#f0fdf4', ac: '#16a34a' },
  Tailgate: { ab: '#fff1f2', ac: '#dc2626' },
};

const TZ = 'America/Chicago';

function normalizeEvent(e: any): TailgateLog {
  const ts      = new Date(e.timestamp);
  const dateVal = ts.toLocaleDateString('en-CA', { timeZone: TZ });           // YYYY-MM-DD
  const date    = ts.toLocaleDateString('en-US', { timeZone: TZ, month: 'short', day: 'numeric', year: 'numeric' });
  const t       = ts.toLocaleTimeString('en-US', { timeZone: TZ, hour: '2-digit', minute: '2-digit', hour12: true });

  const ev: TailgateEventType = e.review?.isViolation
    ? 'Tailgate'
    : e.review?.actualEventType
      ? (EVENT_TYPE_MAP[e.review.actualEventType.toLowerCase()] ?? 'Tailgate')
      : (EVENT_TYPE_MAP[e.event_type?.toLowerCase()] ?? 'Tailgate');
  const { ab, ac } = COLOR_MAP[ev];

  const actorName = (e.review?.reviewed ? e.review?.personName : null) || e.actor?.name || null;
  const actorId   = (e.review?.reviewed ? e.review?.memberId   : null) || e.actor?.id   || null;
  const actorType = e.actor?.type !== 'system' ? (e.actor?.type || null) : null;
  const ini = actorName
    ? actorName.split(' ').map((w: string) => w[0] ?? '').join('').slice(0, 2).toUpperCase()
    : '?';

  return {
    id:          e.event_id,
    cosmosId:    e.id ?? '',
    date,
    dateVal,
    sortTs:      ts.getTime(),
    t,
    ev,
    gate:        e.door?.name    ?? '—',
    name:        actorName,
    actorId,
    actorType,
    memberId:    actorId,
    ini,
    ab,
    ac,
    status:      e.review ? (e.review.isViolation ? 'violation' : 'reviewed') : 'pending',
    viol:        e.review ? (e.review.isViolation ?? false) : ev === 'Tailgate',
    notes:       e.review?.comment ?? null,
    tr:          '',
    videoUrl:      e.video_url            || null,
    snapshotUrl:   e.snapshot_url         || null,
    personCount:   e.detection?.person_count ?? null,
    personName:    e.review?.memberName  ?? null,
    personType:    e.review?.memberType === 'member' ? 'Member' : e.review?.memberType === 'non-member' ? 'Non-Member' : null,
    personMemberId: e.review?.memberId      ?? null,
    subscription:   (e.review?.subscription as import('./types').SubscriptionType) ?? null,
    review:        e.review ? (e.review as TailgateReview) : null,
  };
}

export const submitTailgateReview = createAsyncThunk(
  'tailgate/submitReview',
  async (payload: {
    cosmosId:        string;
    comment:         string;
    memberName:      string | null;
    memberType:      string | null;
    memberId:        string | null;
    subscription:    string | null;
    isViolation:     boolean;
    actualEventType: string | null;
  }, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.tailgate.review, {
        id:           payload.cosmosId,
        facilityCode: 'HOU01',
        comment:      payload.comment,
        memberName:   payload.memberName,
        memberType:   payload.memberType,
        memberId:     payload.memberId,
        subscription:    payload.subscription,
        isViolation:     payload.isViolation,
        actualEventType: payload.isViolation ? null : payload.actualEventType,
      });
      return response?.data?.data as { id: string; eventId: string; review: TailgateReview };
    } catch (error: any) {
      if (error?.response?.status === 404) {
        return rejectWithValue('Event not found in the database.');
      }
      return rejectWithValue(handleApiError(error, 'Failed to submit review'));
    }
  }
);

export const createTailgateEvent = createAsyncThunk(
  'tailgate/createEvent',
  async (payload: CreateTailgateEventRequest, { rejectWithValue }) => {
    try {
      const response = await api.post(endpoints.tailgate.createEvent, payload);
      const events: any[] = response?.data?.data?.events ?? [];
      return events.map(normalizeEvent);
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch tailgate events'));
    }
  }
);
