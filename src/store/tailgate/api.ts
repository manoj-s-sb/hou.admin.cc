import { createAsyncThunk } from '@reduxjs/toolkit';

import { handleApiError } from '../../utils/errorUtils';

import { TailgateLog, TailgateStats } from './types';

// TODO: replace with real API calls when backend is ready
const DUMMY_LOGS: TailgateLog[] = [
  {
    id: 'tg-001', date: 'Apr 22, 2025', dateVal: '2025-04-22', t: '08:14 AM',
    ev: 'Entry', gate: 'Lane 1 – Entry', name: 'Rahul Sharma', actorId: 'MEM-001',
    actorType: 'Member', memberId: 'MEM-001', ini: 'RS', ab: '#eef2ff', ac: '#2563eb',
    status: 'reviewed', viol: false, notes: null, tr: '0:02', videoUrl: null,
  },
  {
    id: 'tg-002', date: 'Apr 22, 2025', dateVal: '2025-04-22', t: '08:17 AM',
    ev: 'Tailgate', gate: 'Lane 1 – Entry', name: null, actorId: null,
    actorType: null, memberId: null, ini: '?', ab: '#fef3c7', ac: '#d97706',
    status: 'pending', viol: false, notes: null, tr: '0:03', videoUrl: null,
  },
  {
    id: 'tg-003', date: 'Apr 22, 2025', dateVal: '2025-04-22', t: '09:02 AM',
    ev: 'Entry', gate: 'Lane 3 – Exit', name: 'Priya Nair', actorId: 'MEM-002',
    actorType: 'Member', memberId: 'MEM-002', ini: 'PN', ab: '#f0fdf4', ac: '#16a34a',
    status: 'reviewed', viol: false, notes: null, tr: '0:01', videoUrl: null,
  },
  {
    id: 'tg-004', date: 'Apr 22, 2025', dateVal: '2025-04-22', t: '09:45 AM',
    ev: 'Tailgate', gate: 'Main Gate – Entry', name: 'Arun Kumar', actorId: 'MEM-003',
    actorType: 'Member', memberId: 'MEM-003', ini: 'AK', ab: '#fff1f2', ac: '#dc2626',
    status: 'violation', viol: true, notes: 'Repeated tailgating — 3rd offence', tr: '0:04', videoUrl: null,
  },
  {
    id: 'tg-005', date: 'Apr 21, 2025', dateVal: '2025-04-21', t: '07:55 AM',
    ev: 'Entry', gate: 'Lane 2 – Entry', name: null, actorId: null,
    actorType: null, memberId: null, ini: '?', ab: '#fef3c7', ac: '#d97706',
    status: 'pending', viol: false, notes: null, tr: '0:02', videoUrl: null,
  },
  {
    id: 'tg-006', date: 'Apr 21, 2025', dateVal: '2025-04-21', t: '10:30 AM',
    ev: 'Exit', gate: 'Lane 2 – Exit', name: 'Sam Patel', actorId: 'MEM-004',
    actorType: 'Member', memberId: 'MEM-004', ini: 'SP', ab: '#ecfeff', ac: '#0891b2',
    status: 'reviewed', viol: false, notes: null, tr: '0:01', videoUrl: null,
  },
  {
    id: 'tg-007', date: 'Apr 21, 2025', dateVal: '2025-04-21', t: '11:15 AM',
    ev: 'Tailgate', gate: 'Lane 1 – Entry', name: 'Arun Kumar', actorId: 'MEM-003',
    actorType: 'Member', memberId: 'MEM-003', ini: 'AK', ab: '#fff1f2', ac: '#dc2626',
    status: 'violation', viol: true, notes: 'Flagged by NOC', tr: '0:05', videoUrl: null,
  },
  {
    id: 'tg-008', date: 'Apr 20, 2025', dateVal: '2025-04-20', t: '08:00 AM',
    ev: 'Entry', gate: 'Main Gate – Entry', name: 'Divya Menon', actorId: 'MEM-005',
    actorType: 'Member', memberId: 'MEM-005', ini: 'DM', ab: '#fdf4ff', ac: '#9333ea',
    status: 'reviewed', viol: false, notes: null, tr: '0:02', videoUrl: null,
  },
];

const DUMMY_STATS: TailgateStats = {
  today_total: 4,
  today_date: 'Apr 22, 2025',
  today_entries: 2,
  today_tailgates: 2,
  total_unidentified: 2,
  total_violations: 2,
};

export const fetchTailgateLogs = createAsyncThunk(
  'tailgate/fetchLogs',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: replace with real API call
      // const response = await api.get(endpoints.tailgate.logs);
      // return response?.data?.data;
      return DUMMY_LOGS;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch tailgate logs'));
    }
  }
);

export const fetchTailgateStats = createAsyncThunk(
  'tailgate/fetchStats',
  async (_, { rejectWithValue }) => {
    try {
      // TODO: replace with real API call
      // const response = await api.get(endpoints.tailgate.stats);
      // return response?.data?.data;
      return DUMMY_STATS;
    } catch (error: any) {
      return rejectWithValue(handleApiError(error, 'Failed to fetch tailgate stats'));
    }
  }
);
