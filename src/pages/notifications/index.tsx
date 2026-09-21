import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { useCentreNav } from '../../contexts/CentreNavContext';

/**
 * Bulk push notification composer + history, scoped to the current centre.
 *
 * UI only — everything here (the draft, and the Sent/Scheduled lists) lives in local
 * component state. There is no API wired up yet; `sendNotif()` simulates a send/schedule
 * so the flow can be reviewed end-to-end before the backend module exists.
 */

type AudienceMode = 'All' | 'Centre' | 'Age' | 'Individual';
type Channel = 'push' | 'email' | 'both';
type NotifTab = 'compose' | 'sent' | 'scheduled';

interface AttachmentFile {
  name: string;
  url: string;
  isImage: boolean;
}
interface ComposeState {
  channel: Channel;
  heading: string;
  subject: string;
  body: string;
  audience: AudienceMode;
  ages: string[];
  individualUsers: string[];
  schedule: boolean;
  when: string;
  attachment: AttachmentFile | null;
}
interface NotifRecord {
  channel: Channel;
  heading: string;
  audienceLabel: string;
  when: string;
  media: boolean;
}

const AGE_BANDS = ['Under 10', 'Under 12', 'Under 14', 'Under 16', 'Under 19', '17+'];
// Dummy member directory for the Individual-user picker — no user-search API yet.
const DIRECTORY_USERS = [
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

function emptyCompose(): ComposeState {
  return {
    channel: 'push',
    heading: '',
    subject: '',
    body: '',
    audience: 'All',
    ages: [],
    individualUsers: [],
    schedule: false,
    when: '',
    attachment: null,
  };
}

function seedSent(): NotifRecord[] {
  return [
    {
      channel: 'push',
      heading: 'Centre closed for maintenance this Sunday',
      audienceLabel: 'All users',
      when: 'Jan 22, 09:10',
      media: false,
    },
    {
      channel: 'both',
      heading: 'New bowling machine live on Lane 3',
      audienceLabel: 'Centre · this centre',
      when: 'Jan 20, 17:45',
      media: false,
    },
    {
      channel: 'email',
      heading: 'Junior camp registrations now open',
      audienceLabel: 'Ages Under 12, Under 14',
      when: 'Jan 18, 12:00',
      media: false,
    },
  ];
}
function seedScheduled(): NotifRecord[] {
  return [
    {
      channel: 'push',
      heading: 'Republic Day tournament reminder',
      audienceLabel: 'All users',
      when: 'Jan 26, 08:00',
      media: false,
    },
    {
      channel: 'email',
      heading: 'Membership renewal window opens',
      audienceLabel: 'Ages 17+',
      when: 'Feb 1, 10:00',
      media: false,
    },
  ];
}
function channelLabel(ch: Channel): string {
  return ch === 'push' ? 'Push' : ch === 'email' ? 'Email' : 'Push + Email';
}

const fieldClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const labelClass = 'mb-1.5 block text-[13px] font-medium text-gray-500';
const eyebrowClass = 'mb-2 text-[11px] font-semibold uppercase tracking-wider text-gray-400';

const segBtn = (active: boolean) =>
  `px-4 py-2 text-[13px] font-medium first:rounded-l-lg last:rounded-r-lg ${
    active ? 'bg-[#21295A] text-white' : 'bg-white text-gray-600 hover:bg-gray-50'
  }`;

const Notifications = () => {
  const { activeCentre } = useCentreNav();
  const [tab, setTab] = useState<NotifTab>('compose');
  const [compose, setCompose] = useState<ComposeState>(() => emptyCompose());
  const [sentList, setSentList] = useState<NotifRecord[]>(() => seedSent());
  const [scheduledList, setScheduledList] = useState<NotifRecord[]>(() => seedScheduled());
  const [userSearch, setUserSearch] = useState('');

  const toggleAge = (band: string) => {
    setCompose(c => {
      const has = c.ages.includes(band);
      return { ...c, ages: has ? c.ages.filter(a => a !== band) : [...c.ages, band] };
    });
  };

  const audienceLabel = (c: ComposeState): string => {
    if (c.audience === 'All') return 'All users';
    if (c.audience === 'Centre') return `Centre · ${activeCentre?.name || 'this centre'}`;
    if (c.audience === 'Individual')
      return c.individualUsers.length ? c.individualUsers.join(', ') : 'Individual (none selected)';
    return c.ages.length ? `Ages ${c.ages.join(', ')}` : 'Age-wise (none selected)';
  };

  const sendNotif = () => {
    if (compose.channel !== 'email' && (!compose.heading.trim() || !compose.body.trim())) {
      toast.error('Heading and message are both required.');
      return;
    }
    if (compose.channel !== 'push' && !compose.subject.trim()) {
      toast.error('Subject line is required for email.');
      return;
    }
    if (compose.audience === 'Age' && !compose.ages.length) {
      toast.error('Select at least one age band.');
      return;
    }
    if (compose.audience === 'Individual' && !compose.individualUsers.length) {
      toast.error('Add at least one user to notify.');
      return;
    }
    if (compose.schedule && !compose.when.trim()) {
      toast.error('Set a send time, or switch to Send now.');
      return;
    }
    const rec: NotifRecord = {
      channel: compose.channel,
      heading: compose.channel === 'push' ? compose.heading.trim() : compose.subject.trim() || compose.heading.trim(),
      audienceLabel: audienceLabel(compose),
      when: compose.schedule ? compose.when.trim() : 'Just now',
      media: !!compose.attachment,
    };
    if (compose.schedule) {
      setScheduledList(prev => [rec, ...prev]);
      setTab('scheduled');
    } else {
      setSentList(prev => [rec, ...prev]);
      setTab('sent');
    }
    setCompose(emptyCompose());
    toast.success(compose.schedule ? 'Notification scheduled.' : 'Notification sent!');
  };

  const cancelScheduled = (index: number) => {
    setScheduledList(prev => prev.filter((_, i) => i !== index));
  };

  const renderHistory = (list: NotifRecord[], kind: 'sent' | 'scheduled') => (
    <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
      {list.length === 0 ? (
        <div className="p-10 text-center">
          <p className="text-[14px] font-semibold text-[#21295A]">Nothing {kind}</p>
          <p className="mt-1 text-[12px] text-gray-400">
            {kind === 'sent' ? 'Sent notifications will appear here.' : 'Scheduled notifications will appear here.'}
          </p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-[1.9fr_.8fr_1.2fr_1fr_110px] gap-2 border-b border-gray-100 bg-gray-50 px-4 py-2.5 text-[11px] font-semibold uppercase tracking-wider text-gray-400">
            <div>Notification</div>
            <div>Channel</div>
            <div>Audience</div>
            <div>{kind === 'sent' ? 'Sent' : 'Scheduled for'}</div>
            <div />
          </div>
          {list.map((n, i) => (
            <div
              key={`${n.heading}-${i}`}
              className="grid grid-cols-[1.9fr_.8fr_1.2fr_1fr_110px] items-center gap-2 border-b border-gray-100 px-4 py-3 text-[13px] last:border-b-0"
            >
              <div className="font-semibold text-[#21295A]">
                {n.media && <span className="mr-1.5 text-gray-400">📎</span>}
                {n.heading}
              </div>
              <div className="text-gray-600">{channelLabel(n.channel)}</div>
              <div className="text-gray-500">{n.audienceLabel}</div>
              <div className="text-gray-500">{n.when || '—'}</div>
              <div className="text-right">
                {kind === 'scheduled' ? (
                  <button
                    className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                    title="Cancel scheduled"
                    type="button"
                    onClick={() => cancelScheduled(i)}
                  >
                    Cancel
                  </button>
                ) : (
                  <span className="rounded-full bg-gray-100 px-2.5 py-0.5 text-[11px] font-semibold text-gray-600">
                    Delivered
                  </span>
                )}
              </div>
            </div>
          ))}
        </>
      )}
    </div>
  );

  return (
    <div className="w-full">
      <div className="mb-5 flex items-start justify-between gap-4 border-b border-gray-100 pb-4">
        <div>
          <h1 className="text-[18px] font-bold tracking-tight text-[#21295A]">Notifications</h1>
          <p className="mt-1 text-[12px] font-medium text-gray-400">
            Compose and schedule bulk notifications to users.
          </p>
        </div>
        {tab === 'compose' && (
          <div className="inline-flex flex-none overflow-hidden rounded-lg border border-gray-200">
            {(['push', 'email', 'both'] as Channel[]).map(ch => (
              <button
                key={ch}
                className={segBtn(compose.channel === ch)}
                type="button"
                onClick={() => setCompose(c => ({ ...c, channel: ch }))}
              >
                {ch === 'push' ? 'Push' : ch === 'email' ? 'Email' : 'Both'}
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="mb-5 flex gap-1.5">
        {(
          [
            ['compose', 'Compose'],
            ['sent', `Sent · ${sentList.length}`],
            ['scheduled', `Scheduled · ${scheduledList.length}`],
          ] as [NotifTab, string][]
        ).map(([key, label]) => (
          <button
            key={key}
            className={`rounded-lg border px-4 py-2 text-[13px] font-medium ${
              tab === key
                ? 'border-[#21295A] bg-[#21295A] text-white'
                : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
            }`}
            type="button"
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === 'sent' && renderHistory(sentList, 'sent')}
      {tab === 'scheduled' && renderHistory(scheduledList, 'scheduled')}

      {tab === 'compose' && (
        <div className="overflow-hidden rounded-xl border border-gray-100 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
            <h2 className="text-[16px] font-bold text-[#21295A]">New notification</h2>
            <span className="text-[13px] text-gray-400">
              {compose.channel === 'push'
                ? 'In-app + push'
                : compose.channel === 'email'
                  ? 'Email'
                  : 'In-app + push + Email'}
            </span>
          </div>

          <div className="space-y-5 px-5 py-5">
            {compose.channel !== 'email' && (
              <div>
                <label className={labelClass} htmlFor="compose-heading">
                  Heading
                </label>
                <input
                  className={fieldClass}
                  id="compose-heading"
                  placeholder="Short, clear title"
                  type="text"
                  value={compose.heading}
                  onChange={e => setCompose(c => ({ ...c, heading: e.target.value }))}
                />
              </div>
            )}

            {compose.channel !== 'push' && (
              <div className="space-y-5 rounded-lg border border-gray-100 bg-gray-50/60 p-4">
                <div>
                  <label className={labelClass} htmlFor="compose-subject">
                    Subject line
                  </label>
                  <input
                    className={fieldClass}
                    id="compose-subject"
                    placeholder="Email subject"
                    type="text"
                    value={compose.subject}
                    onChange={e => setCompose(c => ({ ...c, subject: e.target.value }))}
                  />
                </div>

                <div>
                  <div className={eyebrowClass}>
                    Email attachment <span className="normal-case text-gray-400">· optional · PDF or image</span>
                  </div>
                  {compose.attachment ? (
                    <div className="flex max-w-sm items-center gap-3 rounded-lg border border-gray-200 bg-white p-2.5">
                      {compose.attachment.isImage && compose.attachment.url ? (
                        <img
                          alt="attachment preview"
                          className="h-14 w-14 flex-none rounded-md object-cover"
                          src={compose.attachment.url}
                        />
                      ) : (
                        <span className="grid h-14 w-14 flex-none place-items-center rounded-md bg-gray-100 text-gray-400">
                          📎
                        </span>
                      )}
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium">{compose.attachment.name}</div>
                        <div className="text-[11px] text-gray-400">
                          {compose.attachment.isImage ? 'Image' : 'Media'} · attached
                        </div>
                      </div>
                      <button
                        className="rounded-lg border border-red-200 px-2 py-1 text-[11px] font-semibold text-red-600 hover:bg-red-50"
                        type="button"
                        onClick={() => setCompose(c => ({ ...c, attachment: null }))}
                      >
                        Remove
                      </button>
                    </div>
                  ) : (
                    <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-full border border-dashed border-gray-300 bg-white px-3.5 py-2 text-[13px] font-medium text-[#21295A] hover:border-[#21295A]">
                      + Add attachment
                      <input
                        accept="image/*,application/pdf"
                        className="hidden"
                        type="file"
                        onChange={e => {
                          const f = e.target.files?.[0];
                          if (!f) return;
                          const isImage = f.type.startsWith('image/');
                          setCompose(c => ({
                            ...c,
                            attachment: { name: f.name, url: isImage ? URL.createObjectURL(f) : '', isImage },
                          }));
                        }}
                      />
                    </label>
                  )}
                </div>
              </div>
            )}

            <div>
              <label className={labelClass} htmlFor="compose-message">
                Message
              </label>
              <textarea
                className={fieldClass}
                id="compose-message"
                placeholder="Write the message users will receive…"
                rows={4}
                value={compose.body}
                onChange={e => setCompose(c => ({ ...c, body: e.target.value }))}
              />
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className={eyebrowClass}>Audience</div>
              <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                {(['All', 'Centre', 'Age', 'Individual'] as AudienceMode[]).map(a => (
                  <button
                    key={a}
                    className={segBtn(compose.audience === a)}
                    type="button"
                    onClick={() => setCompose(c => ({ ...c, audience: a }))}
                  >
                    {a === 'All'
                      ? 'All users'
                      : a === 'Centre'
                        ? 'Centre-wise'
                        : a === 'Age'
                          ? 'Age-wise'
                          : 'Individual'}
                  </button>
                ))}
              </div>

              {compose.audience === 'Age' && (
                <div className="mt-4">
                  <div className={labelClass}>Age bands</div>
                  <div className="flex flex-wrap gap-2">
                    {AGE_BANDS.map(band => {
                      const on = compose.ages.includes(band);
                      return (
                        <button
                          key={band}
                          className={`rounded-full border px-4 py-2 text-[13px] font-medium ${
                            on
                              ? 'border-[#21295A] bg-[#21295A]/10 text-[#21295A]'
                              : 'border-gray-200 bg-white text-gray-600 hover:border-gray-300'
                          }`}
                          type="button"
                          onClick={() => toggleAge(band)}
                        >
                          {band}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {compose.audience === 'Individual' && (
                <div className="mt-4">
                  <label className={labelClass} htmlFor="individual-user-search">
                    Search users
                  </label>
                  <div className="relative rounded-lg border border-gray-200 p-2">
                    <div className="mb-1.5 flex flex-wrap gap-1.5">
                      {compose.individualUsers.map(u => (
                        <span
                          key={u}
                          className="inline-flex items-center gap-1.5 rounded-full border border-[#21295A]/30 bg-[#21295A]/5 px-2.5 py-1 text-[12px] font-medium text-[#21295A]"
                        >
                          {u}
                          <button
                            aria-label="Remove"
                            className="font-bold"
                            type="button"
                            onClick={() =>
                              setCompose(c => ({ ...c, individualUsers: c.individualUsers.filter(x => x !== u) }))
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
                      placeholder="Type a name or email…"
                      type="text"
                      value={userSearch}
                      onChange={e => setUserSearch(e.target.value)}
                    />
                    {userSearch.trim() && (
                      <div className="absolute left-0 right-0 top-full z-10 mt-1 max-h-40 overflow-y-auto rounded-lg border border-gray-200 bg-white shadow-lg">
                        {DIRECTORY_USERS.filter(
                          u =>
                            u.toLowerCase().includes(userSearch.trim().toLowerCase()) &&
                            !compose.individualUsers.includes(u)
                        )
                          .slice(0, 8)
                          .map(u => (
                            <button
                              key={u}
                              className="block w-full px-3 py-2 text-left text-[13px] hover:bg-gray-50"
                              type="button"
                              onClick={() => {
                                setCompose(c => ({ ...c, individualUsers: [...c.individualUsers, u] }));
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
            </div>

            <div className="border-t border-gray-100 pt-5">
              <div className={eyebrowClass}>Delivery</div>
              <div className="inline-flex overflow-hidden rounded-lg border border-gray-200">
                <button
                  className={segBtn(!compose.schedule)}
                  type="button"
                  onClick={() => setCompose(c => ({ ...c, schedule: false }))}
                >
                  Send now
                </button>
                <button
                  className={segBtn(compose.schedule)}
                  type="button"
                  onClick={() => setCompose(c => ({ ...c, schedule: true }))}
                >
                  Schedule
                </button>
              </div>

              {compose.schedule && (
                <div className="mt-4 max-w-xs">
                  <label className={labelClass} htmlFor="compose-when">
                    Send at
                  </label>
                  <input
                    className={fieldClass}
                    id="compose-when"
                    placeholder="Jan 26, 08:00"
                    type="text"
                    value={compose.when}
                    onChange={e => setCompose(c => ({ ...c, when: e.target.value }))}
                  />
                </div>
              )}
            </div>

            <p className="flex items-start gap-1.5 text-[12px] text-gray-400">
              <span>ⓘ</span>
              <span>
                Audience is single-select (All / Centre / Age / Individual). Combining Centre{' '}
                <b className="font-semibold text-gray-500">and</b> Age is an open item pending sign-off.
              </span>
            </p>
          </div>

          <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-5 py-3.5">
            <button
              className="rounded-lg bg-[#21295A] px-5 py-2 text-[12px] font-semibold text-white transition hover:bg-[#2d3570]"
              type="button"
              onClick={sendNotif}
            >
              {compose.schedule ? 'Schedule' : 'Send now'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Notifications;
