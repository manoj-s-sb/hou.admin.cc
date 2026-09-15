import { useState } from 'react';

import { toast } from 'react-hot-toast';

/**
 * Bulk push/email notification composer + history, scoped to the current centre.
 *
 * UI only — everything here (drafts, history, delivery stats) lives in local component
 * state. There is no API wired up yet; `sendNotif()` simulates a send/schedule so the
 * flow can be reviewed end-to-end before the backend module exists.
 */

type Channel = 'push' | 'email' | 'both';
type AudienceType = 'all' | 'segment' | 'individual';
type ScheduleMode = 'now' | 'later';
type NotifStatus = 'sent' | 'scheduled' | 'failed';
type StepKey = 'type' | 'audience' | 'content' | 'email' | 'schedule' | 'review';

interface AttachmentFile {
  name: string;
  url: string;
  isImage: boolean;
}
interface SegmentFilters {
  ageGroup: string;
  gender: string;
  team: string;
  activity: string;
}
interface EmailFields {
  subject: string;
  senderName: string;
  replyTo: string;
  template: string;
  body: string;
  attachment: AttachmentFile | null;
}
interface NotifDraft {
  id: string | null;
  channel: Channel;
  audienceType: AudienceType;
  segment: SegmentFilters;
  individualUsers: string[];
  title: string;
  body: string;
  deepLinkType: string;
  deepLinkValue: string;
  media: AttachmentFile | null;
  email: EmailFields;
  scheduleMode: ScheduleMode;
  scheduleDate: string;
  scheduleTime: string;
  timezone: string;
}
interface NotifStats {
  sent: number;
  delivered: number;
  opened: number;
  clicked: number;
  failed: number;
}
interface NotifRecord {
  id: string;
  title: string;
  channel: Channel;
  audienceLabel: string;
  status: NotifStatus;
  when: string;
  stats: NotifStats | null;
  draft: NotifDraft;
}

const AGE_GROUPS = ['Under 10', 'Under 12', 'Under 14', 'Under 16', 'Under 19', '17+'];
const FAVORITE_TEAMS = [
  'Mumbai Indians',
  'Chennai Super Kings',
  'Royal Challengers Bengaluru',
  'Kolkata Knight Riders',
];
const DEEPLINK_TYPES: [string, string][] = [
  ['none', 'No deep link'],
  ['match', 'Match'],
  ['player', 'Player'],
  ['article', 'Article'],
  ['tournament', 'Tournament'],
  ['offer', 'Offer'],
  ['custom', 'Custom URL'],
];
const EMAIL_TEMPLATES: [string, string][] = [
  ['custom', 'Custom'],
  ['match_reminder', 'Match Reminder'],
  ['newsletter', 'Newsletter'],
  ['offer', 'Offer'],
  ['tournament_update', 'Tournament Update'],
];
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Los_Angeles',
  'Asia/Kolkata',
  'Europe/London',
  'Australia/Sydney',
  'UTC',
];
const TOKENS = ['{user_name}', '{favorite_team}', '{match_name}'];
const NOTIF_USERS = [
  'Dev Sharma',
  'Priya Nair',
  'Aarav Mehta',
  'Kabir Rao',
  'Isha Verma',
  'Rohan Das',
  'Neha Pillai',
  'Arjun Menon',
  'Sara Khan',
  'Vivaan Shah',
];
const EMAIL_TEMPLATE_BODY: Record<string, string> = {
  match_reminder:
    'Hi {user_name},\n\nJust a reminder — your upcoming match {match_name} is coming up soon. Make sure to check in at least 15 minutes early.\n\nSee you on the field!\nCentury Cricket',
  newsletter:
    "Hi {user_name},\n\nHere's what's new at this centre this month — new drills, upcoming contests, and community highlights.",
  offer:
    "Hi {user_name},\n\nAs a valued member, enjoy an exclusive offer on your next booking. Don't miss out!\n\n[button:Claim Offer|https://example.com/offer]",
  tournament_update:
    "Hi {user_name},\n\nHere's the latest update on {match_name} — schedules, standings, and what to expect next.",
};
const STEP_LABELS: Record<StepKey, string> = {
  type: 'Type & Channel',
  audience: 'Audience',
  content: 'Content',
  email: 'Email',
  schedule: 'Schedule',
  review: 'Review & Send',
};
const STATUS_META: Record<NotifStatus, { label: string; className: string }> = {
  sent: { label: 'Sent', className: 'bg-green-100 text-green-700' },
  scheduled: { label: 'Scheduled', className: 'bg-yellow-100 text-yellow-700' },
  failed: { label: 'Failed', className: 'bg-red-100 text-red-700' },
};

function emptyDraft(): NotifDraft {
  return {
    id: null,
    channel: 'push',
    audienceType: 'all',
    segment: { ageGroup: 'all', gender: 'all', team: 'all', activity: 'all' },
    individualUsers: [],
    title: '',
    body: '',
    deepLinkType: 'none',
    deepLinkValue: '',
    media: null,
    email: {
      subject: '',
      senderName: 'Century Cricket',
      replyTo: 'support@centurycricket.com',
      template: 'custom',
      body: '',
      attachment: null,
    },
    scheduleMode: 'now',
    scheduleDate: '',
    scheduleTime: '',
    timezone: 'America/New_York',
  };
}

function seedNotifications(): NotifRecord[] {
  return [
    {
      id: 'n1',
      title: 'Centre closed for maintenance this Sunday',
      channel: 'push',
      audienceLabel: 'All members',
      status: 'sent',
      when: 'Jan 22, 09:10',
      stats: { sent: 1180, delivered: 1142, opened: 640, clicked: 180, failed: 38 },
      draft: {
        ...emptyDraft(),
        title: 'Centre closed for maintenance this Sunday',
        body: 'Our centre will be closed this Sunday for scheduled maintenance.',
      },
    },
    {
      id: 'n2',
      title: 'New bowling machine live on Lane 3',
      channel: 'both',
      audienceLabel: 'Segment · Active',
      status: 'sent',
      when: 'Jan 20, 17:45',
      stats: { sent: 612, delivered: 598, opened: 340, clicked: 97, failed: 14 },
      draft: {
        ...emptyDraft(),
        channel: 'both',
        title: 'New bowling machine live on Lane 3',
        body: 'Come try it out this week!',
        audienceType: 'segment',
        segment: { ageGroup: 'all', gender: 'all', team: 'all', activity: 'active' },
      },
    },
    {
      id: 'n3',
      title: 'Junior camp registrations now open',
      channel: 'email',
      audienceLabel: 'Segment · Under 12',
      status: 'failed',
      when: 'Jan 18, 12:00',
      stats: { sent: 388, delivered: 301, opened: 140, clicked: 38, failed: 87 },
      draft: {
        ...emptyDraft(),
        channel: 'email',
        audienceType: 'segment',
        segment: { ageGroup: 'Under 12', gender: 'all', team: 'all', activity: 'all' },
      },
    },
    {
      id: 'n4',
      title: 'Republic Day tournament reminder',
      channel: 'push',
      audienceLabel: 'All members',
      status: 'scheduled',
      when: 'Jan 26, 08:00',
      stats: null,
      draft: {
        ...emptyDraft(),
        title: 'Republic Day tournament reminder',
        body: "Don't miss the Republic Day tournament!",
        scheduleMode: 'later',
        scheduleDate: '2026-01-26',
        scheduleTime: '08:00',
      },
    },
  ];
}

function stepsFor(d: NotifDraft): StepKey[] {
  const s: StepKey[] = ['type', 'audience', 'content'];
  if (d.channel !== 'push') s.push('email');
  s.push('schedule', 'review');
  return s;
}

function estimateRecipients(d: NotifDraft): number {
  if (d.audienceType === 'individual') return d.individualUsers.length;
  if (d.audienceType === 'all') return 1240;
  const seg = d.segment;
  let n = 1240;
  if (seg.ageGroup !== 'all') n = Math.round(n * 0.34);
  if (seg.gender !== 'all') n = Math.round(n * 0.52);
  if (seg.team !== 'all') n = Math.round(n * 0.27);
  if (seg.activity === 'active') n = Math.round(n * 0.6);
  if (seg.activity === 'dormant') n = Math.round(n * 0.16);
  return n;
}

function audienceSummaryLabel(d: NotifDraft): string {
  if (d.audienceType === 'all') return 'All members';
  if (d.audienceType === 'individual')
    return d.individualUsers.length ? `${d.individualUsers.length} selected user(s)` : 'No users selected';
  const seg = d.segment;
  const parts: string[] = [];
  if (seg.ageGroup !== 'all') parts.push(seg.ageGroup);
  if (seg.gender !== 'all') parts.push(seg.gender);
  if (seg.team !== 'all') parts.push(seg.team);
  if (seg.activity !== 'all') parts.push(seg.activity === 'active' ? 'Active' : 'Dormant');
  return parts.length ? `Segment · ${parts.join(', ')}` : 'Segment · Any';
}

function deepLinkPlaceholder(type: string): string {
  const map: Record<string, string> = {
    match: 'Select match ID / code',
    player: 'Player ID or name',
    article: 'Article slug or ID',
    tournament: 'Tournament ID',
    offer: 'Offer code',
    custom: 'https://…',
  };
  return map[type] || '';
}

function renderEmailBody(text: string): string {
  const escape = (t: string) => t.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  let h = escape(text || '');
  h = h.replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');
  h = h.replace(/\*(.+?)\*/g, '<i>$1</i>');
  h = h.replace(
    /!\[(.*?)\]\((.*?)\)/g,
    '<img src="$2" alt="$1" style="max-width:100%;border-radius:8px;margin:8px 0" />'
  );
  h = h.replace(
    /\[button:(.+?)\|(.+?)\]/g,
    '<a href="$2" style="display:inline-block;margin-top:10px;background:#21295A;color:#fff;padding:9px 16px;border-radius:8px;font-weight:600;font-size:12.5px;text-decoration:none">$1</a>'
  );
  h = h.replace(/\[(.+?)\]\((.+?)\)/g, '<a href="$2" target="_blank" rel="noopener" style="color:#0064FF">$1</a>');
  return h;
}

function validateStep(d: NotifDraft, key: StepKey): string | null {
  if (key === 'audience') {
    if (d.audienceType === 'individual' && !d.individualUsers.length)
      return 'Add at least one user, or switch audience type.';
    if (estimateRecipients(d) < 1) return "This audience doesn't match any members. Adjust your filters.";
  }
  if (key === 'content' && d.channel !== 'email') {
    if (!d.title.trim()) return 'Title is required.';
    if (!d.body.trim()) return 'Message body is required.';
  }
  if (key === 'email' && d.channel !== 'push') {
    if (!d.email.subject.trim()) return 'Subject line is required.';
    if (!d.email.body.trim()) return 'Email body is required.';
  }
  if (key === 'schedule' && d.scheduleMode === 'later') {
    if (!d.scheduleDate || !d.scheduleTime) return 'Set both a date and a time, or switch to Send Now.';
    const when = new Date(`${d.scheduleDate}T${d.scheduleTime}`);
    if (Number.isNaN(when.getTime()) || when.getTime() <= Date.now()) return 'Scheduled time must be in the future.';
  }
  return null;
}
function validateAll(d: NotifDraft): string | null {
  for (const key of ['audience', 'content', 'email', 'schedule'] as StepKey[]) {
    const err = validateStep(d, key);
    if (err) return err;
  }
  return null;
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const labelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

const Notifications = () => {
  const [mode, setMode] = useState<'list' | 'compose'>('list');
  const [stepKey, setStepKey] = useState<StepKey>('type');
  const [draft, setDraft] = useState<NotifDraft>(emptyDraft());
  const [showTest, setShowTest] = useState(false);
  const [testTarget, setTestTarget] = useState('');
  const [previewMobile, setPreviewMobile] = useState(false);
  const [statusFilter, setStatusFilter] = useState<'all' | NotifStatus>('all');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [userSearch, setUserSearch] = useState('');
  const [notifications, setNotifications] = useState<NotifRecord[]>(() => seedNotifications());

  const openCompose = (base?: NotifDraft) => {
    setDraft(base || emptyDraft());
    setStepKey('type');
    setShowTest(false);
    setTestTarget('');
    setUserSearch('');
    setMode('compose');
  };
  const cancelCompose = () => {
    const hasContent = draft.title.trim() || draft.body.trim() || draft.email.subject.trim() || draft.email.body.trim();
    if (hasContent && !window.confirm('Discard this notification draft?')) return;
    setMode('list');
  };
  const goNext = () => {
    const err = validateStep(draft, stepKey);
    if (err) {
      toast.error(err);
      return;
    }
    const steps = stepsFor(draft);
    const i = steps.indexOf(stepKey);
    if (i < steps.length - 1) setStepKey(steps[i + 1]);
  };
  const goBack = () => {
    const steps = stepsFor(draft);
    const i = steps.indexOf(stepKey);
    setStepKey(steps[Math.max(0, i - 1)]);
  };
  const sendTest = () => {
    if (!testTarget.trim()) {
      toast.error('Enter an email address or user ID to send the test to.');
      return;
    }
    toast.success(`Test ${draft.channel === 'email' ? 'email' : 'notification'} sent to ${testTarget.trim()}.`);
    setShowTest(false);
  };
  const sendFinal = () => {
    const err = validateAll(draft);
    if (err) {
      toast.error(err);
      return;
    }
    const est = estimateRecipients(draft);
    const isScheduled = draft.scheduleMode === 'later';
    const title = draft.channel === 'email' ? draft.email.subject.trim() : draft.title.trim();
    const rec: NotifRecord = {
      id: `n${Date.now()}`,
      title,
      channel: draft.channel,
      audienceLabel: audienceSummaryLabel(draft),
      status: isScheduled ? 'scheduled' : 'sent',
      when: isScheduled ? `${draft.scheduleDate} ${draft.scheduleTime}` : 'Just now',
      stats: isScheduled
        ? null
        : {
            sent: est,
            delivered: Math.round(est * 0.97),
            opened: Math.round(est * 0.48),
            clicked: Math.round(est * 0.14),
            failed: Math.round(est * 0.03),
          },
      draft: JSON.parse(JSON.stringify(draft)),
    };
    setNotifications(prev => [rec, ...prev]);
    setMode('list');
    toast.success(isScheduled ? 'Notification scheduled.' : 'Notification sent!');
  };
  const duplicateNotif = (id: string) => {
    const n = notifications.find(x => x.id === id);
    if (!n) return;
    const d: NotifDraft = JSON.parse(JSON.stringify(n.draft));
    d.id = null;
    if (d.title) d.title = `${d.title} (Copy)`;
    if (d.email.subject) d.email.subject = `${d.email.subject} (Copy)`;
    d.scheduleMode = 'now';
    d.scheduleDate = '';
    d.scheduleTime = '';
    setDetailId(null);
    openCompose(d);
  };
  const cancelScheduled = (id: string) => {
    const n = notifications.find(x => x.id === id);
    if (!n) return;
    if (!window.confirm(`Cancel scheduled notification "${n.title}"?`)) return;
    setNotifications(prev => prev.filter(x => x.id !== id));
    setDetailId(null);
  };

  const channelIcon = (ch: Channel) => (ch === 'push' ? '🔔 Push' : ch === 'email' ? '✉️ Email' : '🔔✉️ Both');
  const filteredRows = notifications.filter(n => statusFilter === 'all' || n.status === statusFilter);
  const detail = detailId ? notifications.find(n => n.id === detailId) || null : null;

  return (
    <div className="w-full">
      <div className="mb-5 border-b border-gray-100 pb-4">
        <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Notifications</h1>
        <p className="mt-1 text-[12px] font-medium text-gray-400">
          Compose and schedule bulk push/email notifications to this centre&apos;s members.
        </p>
      </div>

      {mode === 'list' && (
        <>
          <div className="mb-4 flex items-end justify-between gap-3 rounded-xl border border-gray-100 bg-white p-4 shadow-sm">
            <div>
              <label className={labelClass} htmlFor="notif-status-filter">
                Status
              </label>
              <select
                className={fieldClass}
                id="notif-status-filter"
                value={statusFilter}
                onChange={e => setStatusFilter(e.target.value as 'all' | NotifStatus)}
              >
                <option value="all">All statuses</option>
                <option value="sent">Sent</option>
                <option value="scheduled">Scheduled</option>
                <option value="failed">Failed</option>
              </select>
            </div>
            <button
              className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
              type="button"
              onClick={() => openCompose()}
            >
              + New Notification
            </button>
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            {filteredRows.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-[14px] font-semibold text-[#21295A]">No notifications yet</p>
                <p className="mt-1 text-[12px] text-gray-400">Send your first notification to see it here.</p>
              </div>
            ) : (
              <>
                <div className="grid grid-cols-[1.8fr_.8fr_1.1fr_.8fr_.9fr_230px] gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                  <div>Title / Subject</div>
                  <div>Channel</div>
                  <div>Audience</div>
                  <div>Status</div>
                  <div>Sent / Scheduled</div>
                  <div />
                </div>
                {filteredRows.map(n => {
                  const st = STATUS_META[n.status];
                  return (
                    <div
                      key={n.id}
                      className="grid cursor-pointer grid-cols-[1.8fr_.8fr_1.1fr_.8fr_.9fr_230px] items-center gap-2 border-b border-gray-100 px-4 py-3 text-[13px] last:border-b-0 hover:bg-gray-50"
                      role="button"
                      tabIndex={0}
                      onClick={() => setDetailId(n.id)}
                      onKeyDown={e => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          setDetailId(n.id);
                        }
                      }}
                    >
                      <div className="font-semibold text-[#21295A]">{n.title}</div>
                      <div className="text-gray-600">{channelIcon(n.channel)}</div>
                      <div className="text-gray-500">{n.audienceLabel}</div>
                      <div>
                        <span className={`rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${st.className}`}>
                          {st.label}
                        </span>
                      </div>
                      <div className="text-gray-500">{n.when}</div>
                      <div className="flex items-center gap-2">
                        <button
                          className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                          title="View stats"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            setDetailId(n.id);
                          }}
                        >
                          Stats
                        </button>
                        <button
                          className="rounded-lg border border-gray-200 px-2 py-1 text-[11px] font-semibold text-gray-600 hover:bg-gray-50"
                          title="Duplicate"
                          type="button"
                          onClick={e => {
                            e.stopPropagation();
                            duplicateNotif(n.id);
                          }}
                        >
                          Duplicate
                        </button>
                        {n.status === 'scheduled' && (
                          <button
                            className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                            title="Cancel"
                            type="button"
                            onClick={e => {
                              e.stopPropagation();
                              cancelScheduled(n.id);
                            }}
                          >
                            Cancel
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </>
            )}
          </div>
        </>
      )}

      {mode === 'compose' && (
        <>
          <div className="mb-4 flex flex-wrap items-center gap-2">
            {stepsFor(draft).map((k, i) => {
              const idx = stepsFor(draft).indexOf(stepKey);
              const isOn = k === stepKey;
              const isDone = i < idx;
              return (
                <button
                  key={k}
                  className={`inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-[12.5px] font-medium transition ${
                    isOn
                      ? 'border-[#21295A] bg-[#21295A]/10 text-[#21295A]'
                      : isDone
                        ? 'border-green-200 text-green-700'
                        : 'border-gray-200 bg-white text-gray-400'
                  }`}
                  type="button"
                  onClick={() => setStepKey(k)}
                >
                  <span
                    className={`h-4.5 w-4.5 grid place-items-center rounded-full text-[10px] font-bold ${
                      isOn
                        ? 'bg-[#21295A] text-white'
                        : isDone
                          ? 'bg-green-600 text-white'
                          : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {i + 1}
                  </span>
                  {STEP_LABELS[k]}
                </button>
              );
            })}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
            <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
              <h2 className="text-[16px] font-bold text-[#21295A]">New notification</h2>
              <button
                className="rounded-lg border border-gray-200 px-3 py-1.5 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                type="button"
                onClick={cancelCompose}
              >
                Cancel
              </button>
            </div>
            <div className="max-h-[62vh] overflow-y-auto px-5 py-5">
              {stepKey === 'type' && (
                <div>
                  <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                    Delivery type
                  </div>
                  <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                    {(['push', 'email', 'both'] as Channel[]).map(ch => (
                      <button
                        key={ch}
                        className={`px-4 py-2 text-[13px] font-medium ${draft.channel === ch ? 'bg-[#21295A] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                        type="button"
                        onClick={() => setDraft(d => ({ ...d, channel: ch }))}
                      >
                        {ch === 'push' ? 'Push Notification' : ch === 'email' ? 'Email' : 'Both'}
                      </button>
                    ))}
                  </div>
                  <p className="mt-3 text-[12px] text-gray-400">
                    Push sends an in-app/mobile alert. Email sends a full HTML email. Both sends each independently.
                  </p>
                </div>
              )}

              {stepKey === 'audience' && (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Audience
                    </div>
                    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                      {(['all', 'segment', 'individual'] as AudienceType[]).map(t => (
                        <button
                          key={t}
                          className={`px-4 py-2 text-[13px] font-medium ${draft.audienceType === t ? 'bg-[#21295A] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, audienceType: t }))}
                        >
                          {t === 'all' ? 'All Users' : t === 'segment' ? 'Segment' : 'Individual Users'}
                        </button>
                      ))}
                    </div>
                  </div>

                  {draft.audienceType === 'segment' && (
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className={labelClass} htmlFor="seg-age-group">
                          Age group
                        </label>
                        <select
                          className={fieldClass}
                          id="seg-age-group"
                          value={draft.segment.ageGroup}
                          onChange={e => setDraft(d => ({ ...d, segment: { ...d.segment, ageGroup: e.target.value } }))}
                        >
                          <option value="all">Any age</option>
                          {AGE_GROUPS.map(a => (
                            <option key={a} value={a}>
                              {a}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="seg-gender">
                          Gender
                        </label>
                        <select
                          className={fieldClass}
                          id="seg-gender"
                          value={draft.segment.gender}
                          onChange={e => setDraft(d => ({ ...d, segment: { ...d.segment, gender: e.target.value } }))}
                        >
                          <option value="all">Any</option>
                          <option value="Men">Men</option>
                          <option value="Women">Women</option>
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="seg-team">
                          Favorite team / player
                        </label>
                        <select
                          className={fieldClass}
                          id="seg-team"
                          value={draft.segment.team}
                          onChange={e => setDraft(d => ({ ...d, segment: { ...d.segment, team: e.target.value } }))}
                        >
                          <option value="all">Any</option>
                          {FAVORITE_TEAMS.map(t => (
                            <option key={t} value={t}>
                              {t}
                            </option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="seg-activity">
                          Activity status
                        </label>
                        <select
                          className={fieldClass}
                          id="seg-activity"
                          value={draft.segment.activity}
                          onChange={e => setDraft(d => ({ ...d, segment: { ...d.segment, activity: e.target.value } }))}
                        >
                          <option value="all">Any</option>
                          <option value="active">Active</option>
                          <option value="dormant">Dormant</option>
                        </select>
                      </div>
                    </div>
                  )}

                  {draft.audienceType === 'individual' && (
                    <div>
                      <label className={labelClass} htmlFor="individual-user-search">
                        Search users
                      </label>
                      <div className="relative rounded-lg border border-gray-200 p-2">
                        <div className="mb-1.5 flex flex-wrap gap-1.5">
                          {draft.individualUsers.map(u => (
                            <span
                              key={u}
                              className="inline-flex items-center gap-1.5 rounded-full border border-[#21295A]/30 bg-[#21295A]/5 px-2.5 py-1 text-[12px] font-medium text-[#21295A]"
                            >
                              {u}
                              <button
                                className="font-bold"
                                type="button"
                                onClick={() =>
                                  setDraft(d => ({ ...d, individualUsers: d.individualUsers.filter(x => x !== u) }))
                                }
                              >
                                ×
                              </button>
                            </span>
                          ))}
                        </div>
                        <input
                          className="w-full border-none text-[13px] outline-none"
                          id="individual-user-search"
                          placeholder="Type a name…"
                          type="text"
                          value={userSearch}
                          onChange={e => setUserSearch(e.target.value)}
                        />
                        {userSearch.trim() && (
                          <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                            {NOTIF_USERS.filter(
                              u =>
                                u.toLowerCase().includes(userSearch.trim().toLowerCase()) &&
                                !draft.individualUsers.includes(u)
                            )
                              .slice(0, 8)
                              .map(u => (
                                <button
                                  key={u}
                                  className="block w-full px-3 py-2 text-left text-[13px] hover:bg-gray-50"
                                  type="button"
                                  onClick={() => {
                                    setDraft(d => ({ ...d, individualUsers: [...d.individualUsers, u] }));
                                    setUserSearch('');
                                  }}
                                >
                                  {u}
                                </button>
                              ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex items-center gap-3 rounded-lg border border-green-200 bg-green-50 px-4 py-3">
                    <span className="font-mono text-[22px] font-bold text-green-700">
                      {estimateRecipients(draft).toLocaleString()}
                    </span>
                    <span className="text-[13px] text-green-800">users match this audience</span>
                  </div>
                </div>
              )}

              {stepKey === 'content' && (
                <div className="space-y-5">
                  <div>
                    <label className={labelClass} htmlFor="notif-title">
                      Title / Heading
                    </label>
                    <input
                      className={fieldClass}
                      id="notif-title"
                      maxLength={65}
                      placeholder="Short, clear title"
                      type="text"
                      value={draft.title}
                      onChange={e => setDraft(d => ({ ...d, title: e.target.value }))}
                    />
                    <div className="mt-1 text-right text-[11px] text-gray-400">{draft.title.length}/65</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TOKENS.map(t => (
                        <button
                          key={`title-${t}`}
                          className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-[11px] font-medium text-[#21295A] hover:border-[#21295A]"
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, title: d.title + t }))}
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="notif-body">
                      Message
                    </label>
                    <textarea
                      className={fieldClass}
                      id="notif-body"
                      maxLength={240}
                      placeholder="Write the message users will receive…"
                      rows={4}
                      value={draft.body}
                      onChange={e => setDraft(d => ({ ...d, body: e.target.value }))}
                    />
                    <div className="mt-1 text-right text-[11px] text-gray-400">{draft.body.length}/240</div>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {TOKENS.map(t => (
                        <button
                          key={`body-${t}`}
                          className="rounded-full border border-dashed border-gray-300 px-2.5 py-1 text-[11px] font-medium text-[#21295A] hover:border-[#21295A]"
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, body: d.body + t }))}
                        >
                          + {t}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="notif-deeplink-type">
                      Deep link <span className="normal-case text-gray-400">· optional</span>
                    </label>
                    <select
                      className={fieldClass}
                      id="notif-deeplink-type"
                      style={{ maxWidth: 240 }}
                      value={draft.deepLinkType}
                      onChange={e => setDraft(d => ({ ...d, deepLinkType: e.target.value }))}
                    >
                      {DEEPLINK_TYPES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                    {draft.deepLinkType !== 'none' && (
                      <input
                        className={`${fieldClass} mt-2`}
                        placeholder={deepLinkPlaceholder(draft.deepLinkType)}
                        type="text"
                        value={draft.deepLinkValue}
                        onChange={e => setDraft(d => ({ ...d, deepLinkValue: e.target.value }))}
                      />
                    )}
                  </div>
                  <div>
                    <div className={labelClass}>
                      Image / media <span className="normal-case text-gray-400">· optional</span>
                    </div>
                    {draft.media ? (
                      <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 p-2.5">
                        {draft.media.isImage && draft.media.url ? (
                          <img
                            alt="attachment preview"
                            className="h-14 w-14 flex-none rounded-md object-cover"
                            src={draft.media.url}
                          />
                        ) : (
                          <span className="grid h-14 w-14 flex-none place-items-center rounded-md bg-gray-100 text-gray-400">
                            📎
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium">{draft.media.name}</div>
                          <div className="text-[11px] text-gray-400">
                            {draft.media.isImage ? 'Image' : 'Media'} · attached
                          </div>
                        </div>
                        <button
                          className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, media: null }))}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-3.5 py-2 text-[13px] font-medium text-[#21295A] hover:border-[#21295A]">
                        + Add attachment
                        <input
                          accept="image/*"
                          className="hidden"
                          type="file"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const isImage = f.type.startsWith('image/');
                            setDraft(d => ({
                              ...d,
                              media: { name: f.name, url: isImage ? URL.createObjectURL(f) : '', isImage },
                            }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                </div>
              )}

              {stepKey === 'email' && (
                <div className="space-y-5">
                  <div>
                    <label className={labelClass} htmlFor="email-subject">
                      Subject line
                    </label>
                    <input
                      className={fieldClass}
                      id="email-subject"
                      placeholder="Email subject"
                      type="text"
                      value={draft.email.subject}
                      onChange={e => setDraft(d => ({ ...d, email: { ...d.email, subject: e.target.value } }))}
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className={labelClass} htmlFor="email-sender-name">
                        Sender name
                      </label>
                      <input
                        className={fieldClass}
                        id="email-sender-name"
                        type="text"
                        value={draft.email.senderName}
                        onChange={e => setDraft(d => ({ ...d, email: { ...d.email, senderName: e.target.value } }))}
                      />
                    </div>
                    <div>
                      <label className={labelClass} htmlFor="email-reply-to">
                        Reply-to email
                      </label>
                      <input
                        className={fieldClass}
                        id="email-reply-to"
                        type="text"
                        value={draft.email.replyTo}
                        onChange={e => setDraft(d => ({ ...d, email: { ...d.email, replyTo: e.target.value } }))}
                      />
                    </div>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="email-template">
                      Template
                    </label>
                    <select
                      className={fieldClass}
                      id="email-template"
                      style={{ maxWidth: 260 }}
                      value={draft.email.template}
                      onChange={e => {
                        const tpl = e.target.value;
                        setDraft(d => ({
                          ...d,
                          email: {
                            ...d.email,
                            template: tpl,
                            body: tpl !== 'custom' ? EMAIL_TEMPLATE_BODY[tpl] || '' : d.email.body,
                          },
                        }));
                      }}
                    >
                      {EMAIL_TEMPLATES.map(([k, l]) => (
                        <option key={k} value={k}>
                          {l}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className={labelClass} htmlFor="email-body">
                      Email body
                    </label>
                    <div className="flex gap-1 rounded-t-lg border border-b-0 border-gray-200 bg-gray-50 p-1.5">
                      {[
                        ['**', '**', 'B'],
                        ['*', '*', 'I'],
                        ['[', '](https://)', '🔗'],
                        ['![alt](', 'https://)', '🖼'],
                        ['[button:Label|', 'https://)', '▭'],
                      ].map(([pre, post, label], i) => (
                        <button
                          key={i}
                          className="grid h-7 w-7 place-items-center rounded-md text-[12px] font-bold text-gray-500 hover:bg-gray-200 hover:text-[#21295A]"
                          type="button"
                          onClick={() =>
                            setDraft(d => ({ ...d, email: { ...d.email, body: `${d.email.body + pre}text${post}` } }))
                          }
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                    <textarea
                      className="w-full rounded-b-lg border border-gray-200 px-3 py-2.5 text-[13px] text-gray-700 outline-none focus:border-[#21295A]"
                      id="email-body"
                      rows={6}
                      value={draft.email.body}
                      onChange={e => setDraft(d => ({ ...d, email: { ...d.email, body: e.target.value } }))}
                    />
                  </div>
                  <div>
                    <div className={labelClass}>
                      Attachment <span className="normal-case text-gray-400">· optional · PDF or image</span>
                    </div>
                    {draft.email.attachment ? (
                      <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 p-2.5">
                        {draft.email.attachment.isImage && draft.email.attachment.url ? (
                          <img
                            alt="attachment preview"
                            className="h-14 w-14 flex-none rounded-md object-cover"
                            src={draft.email.attachment.url}
                          />
                        ) : (
                          <span className="grid h-14 w-14 flex-none place-items-center rounded-md bg-gray-100 text-gray-400">
                            📎
                          </span>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="truncate text-[13px] font-medium">{draft.email.attachment.name}</div>
                        </div>
                        <button
                          className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, email: { ...d.email, attachment: null } }))}
                        >
                          Remove
                        </button>
                      </div>
                    ) : (
                      <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-300 px-3.5 py-2 text-[13px] font-medium text-[#21295A] hover:border-[#21295A]">
                        + Add attachment
                        <input
                          accept="image/*,application/pdf"
                          className="hidden"
                          type="file"
                          onChange={e => {
                            const f = e.target.files?.[0];
                            if (!f) return;
                            const isImage = f.type.startsWith('image/');
                            setDraft(d => ({
                              ...d,
                              email: {
                                ...d.email,
                                attachment: { name: f.name, url: isImage ? URL.createObjectURL(f) : '', isImage },
                              },
                            }));
                          }}
                        />
                      </label>
                    )}
                  </div>
                  <div className="border-t border-gray-100 pt-4">
                    <div className="mb-2 flex items-center justify-between">
                      <div className="text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                        Live preview
                      </div>
                      <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                        <button
                          className={`px-3 py-1 text-[12px] font-medium ${!previewMobile ? 'bg-[#21295A] text-white' : 'bg-white text-gray-600'}`}
                          type="button"
                          onClick={() => setPreviewMobile(false)}
                        >
                          Desktop
                        </button>
                        <button
                          className={`px-3 py-1 text-[12px] font-medium ${previewMobile ? 'bg-[#21295A] text-white' : 'bg-white text-gray-600'}`}
                          type="button"
                          onClick={() => setPreviewMobile(true)}
                        >
                          Mobile
                        </button>
                      </div>
                    </div>
                    <div
                      className={`rounded-xl border border-gray-100 bg-gray-50 p-5 ${previewMobile ? 'mx-auto max-w-[340px]' : ''}`}
                    >
                      <div className="rounded-lg bg-white p-4 shadow-sm">
                        <div className="text-[15px] font-bold text-[#21295A]">
                          {draft.email.subject || '(no subject)'}
                        </div>
                        <div className="mb-3 text-[11.5px] text-gray-400">
                          From {draft.email.senderName} &lt;{draft.email.replyTo}&gt;
                        </div>
                        {/* eslint-disable-next-line react/no-danger -- trusted local composer input, rendered as a preview only */}
                        <div
                          className="whitespace-pre-wrap text-[13px] leading-relaxed text-gray-700"
                          dangerouslySetInnerHTML={{ __html: renderEmailBody(draft.email.body) }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {stepKey === 'schedule' && (
                <div className="space-y-5">
                  <div>
                    <div className="mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
                      Delivery
                    </div>
                    <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                      {(['now', 'later'] as ScheduleMode[]).map(m => (
                        <button
                          key={m}
                          className={`px-4 py-2 text-[13px] font-medium ${draft.scheduleMode === m ? 'bg-[#21295A] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'}`}
                          type="button"
                          onClick={() => setDraft(d => ({ ...d, scheduleMode: m }))}
                        >
                          {m === 'now' ? 'Send Now' : 'Schedule for later'}
                        </button>
                      ))}
                    </div>
                  </div>
                  {draft.scheduleMode === 'later' && (
                    <div className="grid grid-cols-3 gap-4">
                      <div>
                        <label className={labelClass} htmlFor="schedule-date">
                          Date
                        </label>
                        <input
                          className={fieldClass}
                          id="schedule-date"
                          type="date"
                          value={draft.scheduleDate}
                          onChange={e => setDraft(d => ({ ...d, scheduleDate: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="schedule-time">
                          Time
                        </label>
                        <input
                          className={fieldClass}
                          id="schedule-time"
                          type="time"
                          value={draft.scheduleTime}
                          onChange={e => setDraft(d => ({ ...d, scheduleTime: e.target.value }))}
                        />
                      </div>
                      <div>
                        <label className={labelClass} htmlFor="schedule-timezone">
                          Timezone
                        </label>
                        <select
                          className={fieldClass}
                          id="schedule-timezone"
                          value={draft.timezone}
                          onChange={e => setDraft(d => ({ ...d, timezone: e.target.value }))}
                        >
                          {TIMEZONES.map(z => (
                            <option key={z} value={z}>
                              {z}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {stepKey === 'review' && (
                <div className="space-y-4">
                  <div className="rounded-lg border border-gray-100 bg-gray-50 p-4">
                    {[
                      [
                        'Channel',
                        draft.channel === 'push'
                          ? 'Push Notification'
                          : draft.channel === 'email'
                            ? 'Email'
                            : 'Push + Email',
                      ],
                      [
                        'Audience',
                        `${audienceSummaryLabel(draft)} · ≈ ${estimateRecipients(draft).toLocaleString()} users`,
                      ],
                      [
                        draft.channel === 'email' ? 'Subject' : 'Title',
                        (draft.channel === 'email' ? draft.email.subject : draft.title) || '—',
                      ],
                      [
                        'Schedule',
                        draft.scheduleMode === 'later'
                          ? `${draft.scheduleDate || '—'} ${draft.scheduleTime || ''} (${draft.timezone})`
                          : 'Immediately',
                      ],
                    ].map(([k, v]) => (
                      <div
                        key={k}
                        className="flex justify-between border-b border-gray-100 py-2 text-[13px] last:border-b-0"
                      >
                        <span className="text-gray-400">{k}</span>
                        <span className="font-semibold text-[#21295A]">{v}</span>
                      </div>
                    ))}
                  </div>
                  {!showTest ? (
                    <button
                      className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                      type="button"
                      onClick={() => setShowTest(true)}
                    >
                      Send Test
                    </button>
                  ) : (
                    <div className="flex items-center gap-2">
                      <input
                        className={fieldClass}
                        placeholder="Email or phone / user ID"
                        type="text"
                        value={testTarget}
                        onChange={e => setTestTarget(e.target.value)}
                      />
                      <button
                        className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                        type="button"
                        onClick={sendTest}
                      >
                        Send
                      </button>
                      <button
                        className="rounded-lg border border-gray-200 px-3 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                        type="button"
                        onClick={() => setShowTest(false)}
                      >
                        Cancel
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-between border-t border-gray-100 bg-gray-50 px-5 py-3.5">
              {stepsFor(draft).indexOf(stepKey) > 0 ? (
                <button
                  className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                  type="button"
                  onClick={goBack}
                >
                  Back
                </button>
              ) : (
                <span />
              )}
              {stepsFor(draft).indexOf(stepKey) < stepsFor(draft).length - 1 ? (
                <button
                  className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570]"
                  type="button"
                  onClick={goNext}
                >
                  Next
                </button>
              ) : (
                <button
                  className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570]"
                  type="button"
                  onClick={sendFinal}
                >
                  {draft.scheduleMode === 'later' ? 'Schedule' : 'Send'}
                </button>
              )}
            </div>
          </div>
        </>
      )}

      {/* ── View stats / detail modal ─────────────────────────── */}
      {detail && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="border-b border-gray-100 px-5 py-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="text-[15px] font-bold text-[#21295A]">{detail.title}</h3>
                  <p className="mt-1 text-[12px] text-gray-400">
                    {channelIcon(detail.channel)} · {detail.audienceLabel} · {detail.when}
                  </p>
                </div>
                <button
                  className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600"
                  type="button"
                  onClick={() => setDetailId(null)}
                >
                  ✕
                </button>
              </div>
              <span
                className={`mt-3 inline-block rounded-full px-2.5 py-0.5 text-[11px] font-semibold ${STATUS_META[detail.status].className}`}
              >
                {STATUS_META[detail.status].label}
              </span>
            </div>
            <div className="px-5 py-4">
              {detail.stats ? (
                <div className="grid grid-cols-2 gap-3">
                  {[
                    ['Sent', detail.stats.sent],
                    ['Delivered', detail.stats.delivered],
                    ['Opened', detail.stats.opened],
                    ['Clicked', detail.stats.clicked],
                  ].map(([k, v]) => (
                    <div key={k as string} className="rounded-lg border border-gray-100 p-3 text-center">
                      <div className="text-[22px] font-bold text-[#21295A]">{(v as number).toLocaleString()}</div>
                      <div className="text-[11px] text-gray-400">{k}</div>
                    </div>
                  ))}
                  <div className="col-span-2 rounded-lg border border-gray-100 p-3 text-center">
                    <div className="text-[22px] font-bold text-[#21295A]">{detail.stats.failed.toLocaleString()}</div>
                    <div className="text-[11px] text-gray-400">Failed / Bounced</div>
                  </div>
                </div>
              ) : (
                <p className="text-[13px] text-gray-400">
                  This notification hasn&apos;t been sent yet — delivery stats will appear once it goes out.
                </p>
              )}
            </div>
            <div className="flex justify-between gap-2 border-t border-gray-100 px-5 py-3">
              <button
                className="rounded-lg border border-gray-200 px-4 py-2 text-[12px] font-semibold text-gray-600 hover:bg-gray-50"
                type="button"
                onClick={() => duplicateNotif(detail.id)}
              >
                Duplicate
              </button>
              {detail.status === 'scheduled' && (
                <button
                  className="rounded-lg border border-red-200 px-4 py-2 text-[12px] font-semibold text-red-600 hover:bg-red-50"
                  type="button"
                  onClick={() => cancelScheduled(detail.id)}
                >
                  Cancel
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
