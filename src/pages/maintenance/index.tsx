import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch, useSelector } from 'react-redux';
import { useParams } from 'react-router-dom';

import { getFacilityCode } from '../../constants/user';
import {
  archiveTemplate,
  listSchedules,
  listTemplates,
  restoreTemplate,
  unscheduleTask,
} from '../../store/maintenance/api';
import { AppDispatch, RootState } from '../../store/store';

import FlagIssueModal from './components/FlagIssueModal';
import LaneTaskCard from './components/LaneTaskCard';
import LogsView from './components/LogsView';
import MaintenanceCalendarView from './components/MaintenanceCalendarView';
import ScheduleCard from './components/ScheduleCard';
import ScheduleModal from './components/ScheduleModal';
import StepsModal from './components/StepsModal';
import TemplateCard from './components/TemplateCard';
import TemplateModal from './components/TemplateModal';
import {
  ALL_LANES,
  CENTRE_BUCKETS,
  GLOBAL_BUCKETS,
  canManageTasks,
  centreBucket,
  globalBucket,
  type CentreBucket,
  type GlobalBucket,
} from './constants';

import type { TaskSchedule, TaskTemplate, TemplateStep } from '../../store/maintenance/types';

type CentreModule = 'library' | 'schedule';
interface StepsView {
  title: string;
  steps: TemplateStep[];
  videoUrl: string | null;
}

const tabBtn = (active: boolean) =>
  `px-3 py-1.5 text-[13px] font-semibold transition border-b-2 ${
    active ? 'border-[#21295A] text-[#21295A]' : 'border-transparent text-gray-400 hover:text-gray-600'
  }`;

const lanePillCls = (active: boolean) =>
  `rounded-lg border px-3 py-1 text-[12px] font-semibold transition ${
    active ? 'border-[#21295A] bg-[#21295A] text-white' : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
  }`;

const toISODate = (d: Date): string => {
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${m}-${day}`;
};

const Maintenance: React.FC = () => {
  const { facilityCode: routeFacility } = useParams<{ facilityCode?: string }>();
  // Prefer the centre route param; otherwise fall back to the user's own scoped centre
  // (facility roles reach Maintenance via the global nav, not by opening a centre —
  // they should still get the full per-centre scheduling view for their own centre).
  // Superadmin on the global route has no scoped centre → sees the global task library.
  const facilityCode = routeFacility || getFacilityCode();
  const isCentre = Boolean(facilityCode);
  const dispatch = useDispatch<AppDispatch>();
  const { templates, templatesLoading, schedules, schedulesLoading } = useSelector((s: RootState) => s.maintenance);
  const canManage = canManageTasks();

  // View state
  // Defaults to "My Schedule" inside a centre — that's the day-to-day working view;
  // the global task library (no centre context) is unaffected, since this state is
  // only ever read when isCentre is true.
  const [centreModule, setCentreModule] = useState<CentreModule>('schedule');
  const [globalTab, setGlobalTab] = useState<GlobalBucket>('weekly');
  const [centreTab, setCentreTab] = useState<CentreBucket>('weekly');
  const [scheduleDay, setScheduleDay] = useState<string>(toISODate(new Date())); // ISO date | 'overdue'
  const scheduleDateInputRef = useRef<HTMLInputElement>(null);
  const [showArchived, setShowArchived] = useState(false);
  const [libLane, setLibLane] = useState<number>(1); // Task Library lane (centre)
  // "My Schedule" view mode: day-tabs + list (existing), or the month-grid calendar
  // (reuses the same react-big-calendar UI as the unified Calendar page) — see
  // MaintenanceCalendarView. Purely a client-side re-view of already-loaded `schedules`.
  const [scheduleView, setScheduleView] = useState<'list' | 'calendar'>('list');
  const [calendarSchedule, setCalendarSchedule] = useState<TaskSchedule | null>(null);

  // Modals
  const [templateModal, setTemplateModal] = useState<{ open: boolean; template: TaskTemplate | null }>({
    open: false,
    template: null,
  });
  const [scheduleTemplate, setScheduleTemplate] = useState<TaskTemplate | null>(null);
  const [reschedule, setReschedule] = useState<TaskSchedule | null>(null);
  const [stepsView, setStepsView] = useState<StepsView | null>(null);
  const [flag, setFlag] = useState<TaskSchedule | null>(null);
  const [showLogs, setShowLogs] = useState(false);

  const loadTemplates = useCallback(() => {
    dispatch(listTemplates({ status: showArchived ? undefined : 'active' }));
  }, [dispatch, showArchived]);

  // One fetch of ALL this centre's schedules powers both the day tabs and the
  // Task Library "scheduled" counts.
  const loadSchedules = useCallback(() => {
    if (isCentre) dispatch(listSchedules({ facilityCode }));
  }, [dispatch, isCentre, facilityCode]);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  useEffect(() => {
    loadSchedules();
  }, [loadSchedules]);

  // Filter active-ish templates by the current frequency tab bucket.
  const visibleTemplates = useMemo(
    () => templates.filter(t => (isCentre ? centreBucket(t) === centreTab : globalBucket(t) === globalTab)),
    [templates, isCentre, centreTab, globalTab]
  );

  // Per-frequency counts for the library tab badges.
  const bucketCounts = useMemo(() => {
    const c: Record<string, number> = {};
    templates.forEach(t => {
      const key = isCentre ? centreBucket(t) : globalBucket(t);
      c[key] = (c[key] || 0) + 1;
    });
    return c;
  }, [templates, isCentre]);

  // A template's schedule at a given lane (for the per-lane Task Library rows).
  const scheduleFor = useCallback(
    (templateId: string, lane: number): TaskSchedule | null =>
      schedules.find(s => s.templateId === templateId && s.laneNo === lane) ?? null,
    [schedules]
  );

  // Frequency-tab status dot for the selected lane: red = something needs doing,
  // green = all scheduled tasks done, null = nothing scheduled.
  const bucketDot = useCallback(
    (bucketKey: string): 'red' | 'green' | null => {
      const scheds = templates
        .filter(t => centreBucket(t) === bucketKey)
        .map(t => scheduleFor(t.id, libLane))
        .filter((s): s is TaskSchedule => Boolean(s));
      if (!scheds.length) return null;
      if (scheds.some(s => s.status !== 'done')) return 'red';
      return 'green';
    },
    [templates, scheduleFor, libLane]
  );

  // Day tabs — today + next 6 days, plus an Overdue tab. Tasks bucket by scheduledDate.
  const dayTabs = useMemo(() => {
    const base = new Date();
    base.setHours(0, 0, 0, 0);
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(base);
      d.setDate(base.getDate() + i);
      const iso = toISODate(d);
      const label = i === 0 ? 'Today' : i === 1 ? 'Tomorrow' : d.toLocaleDateString('en-US', { weekday: 'short' });
      const sub = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      return { iso, label, sub };
    });
  }, []);

  const overdueSchedules = useMemo(() => schedules.filter(s => s.status === 'overdue'), [schedules]);
  const dayCount = useCallback(
    (iso: string) => schedules.filter(s => s.status !== 'overdue' && s.scheduledDate === iso).length,
    [schedules]
  );

  const visibleSchedules = useMemo(() => {
    if (scheduleDay === 'overdue') return overdueSchedules;
    // "All" — every scheduled task, past and future, newest first.
    if (scheduleDay === 'all') {
      return [...schedules].sort((a, b) => (a.scheduledDate < b.scheduledDate ? 1 : -1));
    }
    return schedules.filter(s => s.status !== 'overdue' && s.scheduledDate === scheduleDay);
  }, [schedules, overdueSchedules, scheduleDay]);

  // Whether the selected date falls outside the 7-day quick tabs (picked via the
  // calendar) — used to surface a labelled chip for that custom day.
  const isCustomDay = scheduleDay !== 'overdue' && scheduleDay !== 'all' && !dayTabs.some(d => d.iso === scheduleDay);

  const onArchiveToggle = async (t: TaskTemplate) => {
    try {
      await dispatch(t.status === 'archived' ? restoreTemplate(t.id) : archiveTemplate(t.id)).unwrap();
      toast.success(t.status === 'archived' ? 'Task restored' : 'Task archived');
      loadTemplates();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not update the task');
    }
  };

  const onUnschedule = async (s: TaskSchedule) => {
    if (!window.confirm('Remove this scheduled task?')) return;
    try {
      await dispatch(unscheduleTask({ id: s.id, facilityCode })).unwrap();
      toast.success('Schedule removed');
      loadSchedules();
    } catch (e) {
      toast.error(typeof e === 'string' ? e : 'Could not remove the schedule');
    }
  };

  const openTemplateSteps = (t: TaskTemplate) => setStepsView({ title: t.title, steps: t.steps, videoUrl: t.videoUrl });
  const openScheduleSteps = (s: TaskSchedule) =>
    setStepsView({ title: s.template.title, steps: s.template.steps, videoUrl: s.template.videoUrl });

  const buckets = isCentre ? CENTRE_BUCKETS : GLOBAL_BUCKETS;
  const activeBucket: string = isCentre ? centreTab : globalTab;
  const setBucket = (key: string) => (isCentre ? setCentreTab(key as CentreBucket) : setGlobalTab(key as GlobalBucket));

  const renderLibrary = () => (
    <>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-1 border-b border-gray-100">
          {buckets.map(b => {
            const dot = isCentre ? bucketDot(b.key) : null;
            return (
              <button
                key={b.key}
                className={tabBtn(activeBucket === b.key)}
                type="button"
                onClick={() => setBucket(b.key)}
              >
                {b.label}
                {isCentre ? (
                  dot && (
                    <span
                      className={`ml-1.5 inline-block h-1.5 w-1.5 rounded-full align-middle ${dot === 'red' ? 'bg-red-500' : 'bg-emerald-500'}`}
                    />
                  )
                ) : (
                  <span className="ml-1.5 rounded-full bg-gray-100 px-1.5 py-0.5 text-[10.5px] font-semibold text-gray-500">
                    {bucketCounts[b.key] || 0}
                  </span>
                )}
              </button>
            );
          })}
        </div>
        <div className="flex items-center gap-3">
          {!isCentre && (
            <label className="flex cursor-pointer items-center gap-1.5 text-[12px] font-medium text-gray-500">
              <input
                checked={showArchived}
                className="h-3.5 w-3.5 rounded border-gray-300"
                type="checkbox"
                onChange={e => setShowArchived(e.target.checked)}
              />
              Show archived
            </label>
          )}
          {canManage && (
            <button
              className="rounded-lg bg-[#21295A] px-3.5 py-2 text-[12px] font-semibold text-white shadow-sm transition hover:bg-[#2d3570]"
              type="button"
              onClick={() => setTemplateModal({ open: true, template: null })}
            >
              Add Task
            </button>
          )}
        </div>
      </div>

      {/* Lane tabs — centre Task Library is tracked per lane. */}
      {isCentre && (
        <div className="flex flex-wrap gap-1.5">
          {ALL_LANES.map(n => (
            <button key={n} className={lanePillCls(libLane === n)} type="button" onClick={() => setLibLane(n)}>
              Lane {n}
            </button>
          ))}
        </div>
      )}

      {templatesLoading ? (
        <p className="py-12 text-center text-[13px] text-gray-400">Loading tasks…</p>
      ) : visibleTemplates.length === 0 ? (
        <div className="py-12 text-center">
          <p className="text-[13px] font-semibold text-gray-500">No tasks in this frequency.</p>
          <p className="mt-1 text-[12px] text-gray-400">
            {canManage ? 'Add a task to the library to get started.' : 'Nothing here yet.'}
          </p>
        </div>
      ) : isCentre ? (
        <div className="space-y-3">
          {visibleTemplates.map(t => (
            <LaneTaskCard
              key={t.id}
              canManage={canManage}
              schedule={scheduleFor(t.id, libLane)}
              template={t}
              onSchedule={tmpl => setScheduleTemplate(tmpl)}
              onViewSteps={openTemplateSteps}
            />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-3.5">
          {visibleTemplates.map(t => (
            <TemplateCard
              key={t.id}
              canManage={canManage}
              scheduledCount={0}
              template={t}
              onArchiveToggle={canManage ? onArchiveToggle : undefined}
              onEdit={canManage ? tmpl => setTemplateModal({ open: true, template: tmpl }) : undefined}
              onViewSteps={openTemplateSteps}
            />
          ))}
        </div>
      )}
    </>
  );

  const renderSchedule = () =>
    scheduleView === 'calendar' ? (
      <MaintenanceCalendarView schedules={schedules} onSelectSchedule={setCalendarSchedule} />
    ) : (
      <>
        <div className="flex flex-wrap items-end gap-1 border-b border-gray-100 pb-px">
          {dayTabs.map(d => {
            const count = dayCount(d.iso);
            return (
              <button
                key={d.iso}
                className={`flex flex-col items-center border-b-2 px-3 py-1.5 text-[12px] font-semibold transition ${
                  scheduleDay === d.iso
                    ? 'border-[#21295A] text-[#21295A]'
                    : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
                type="button"
                onClick={() => setScheduleDay(d.iso)}
              >
                <span>
                  {d.label}
                  {/* Colour the count only when the day has tasks; muted otherwise. */}
                  <span
                    className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                      count > 0 ? 'bg-[#21295A] text-white' : 'bg-gray-100 text-gray-400'
                    }`}
                  >
                    {count}
                  </span>
                </span>
                <span className="text-[10px] font-medium text-gray-400">{d.sub}</span>
              </button>
            );
          })}
          <button
            className={`flex flex-col items-center border-b-2 px-3 py-1.5 text-[12px] font-semibold transition ${
              scheduleDay === 'overdue'
                ? 'border-red-500 text-red-600'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            type="button"
            onClick={() => setScheduleDay('overdue')}
          >
            <span>
              Overdue
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  overdueSchedules.length > 0 ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {overdueSchedules.length}
              </span>
            </span>
            <span className="text-[10px] font-medium text-gray-400">Past due</span>
          </button>

          {/* All — every scheduled task, past and future. */}
          <button
            className={`flex flex-col items-center border-b-2 px-3 py-1.5 text-[12px] font-semibold transition ${
              scheduleDay === 'all'
                ? 'border-[#21295A] text-[#21295A]'
                : 'border-transparent text-gray-400 hover:text-gray-600'
            }`}
            type="button"
            onClick={() => setScheduleDay('all')}
          >
            <span>
              All
              <span
                className={`ml-1.5 rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                  schedules.length > 0 ? 'bg-[#21295A] text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                {schedules.length}
              </span>
            </span>
            <span className="text-[10px] font-medium text-gray-400">Past &amp; future</span>
          </button>

          {/* Calendar — jump to any specific date (past or future). A visually-hidden
            input can't reliably be opened via an implicit <label> click forward
            (browser-dependent for a near-zero-size element), so the button opens
            it explicitly via showPicker(). */}
          <button
            className={`ml-auto flex cursor-pointer items-center gap-1.5 self-center rounded-lg border px-2.5 py-1.5 text-[12px] font-semibold transition ${
              isCustomDay
                ? 'border-[#21295A] bg-[#ecedf4] text-[#21295A]'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            }`}
            title="Pick a date"
            type="button"
            onClick={() => {
              const input = scheduleDateInputRef.current;
              if (!input) return;
              if (typeof input.showPicker === 'function') input.showPicker();
              else input.click();
            }}
          >
            📅{' '}
            {isCustomDay
              ? new Date(`${scheduleDay}T00:00:00`).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
              : 'Calendar'}
            <input
              ref={scheduleDateInputRef}
              className="sr-only"
              type="date"
              value={isCustomDay ? scheduleDay : ''}
              onChange={e => e.target.value && setScheduleDay(e.target.value)}
            />
          </button>
        </div>

        {schedulesLoading ? (
          <p className="py-12 text-center text-[13px] text-gray-400">Loading schedule…</p>
        ) : visibleSchedules.length === 0 ? (
          <div className="py-12 text-center">
            <p className="text-[13px] font-semibold text-gray-500">
              {scheduleDay === 'overdue'
                ? '🎉 No overdue tasks — all up to date!'
                : scheduleDay === 'all'
                  ? 'No tasks scheduled yet.'
                  : 'No tasks scheduled for this day.'}
            </p>
            {canManage && <p className="mt-1 text-[12px] text-gray-400">Schedule tasks from the Task Library.</p>}
          </div>
        ) : (
          <div className="space-y-3">
            {visibleSchedules.map(s => (
              <ScheduleCard
                key={s.id}
                canManage={canManage}
                facilityCode={facilityCode}
                schedule={s}
                onChanged={loadSchedules}
                onFlag={setFlag}
                onReschedule={canManage ? setReschedule : undefined}
                onUnschedule={canManage ? onUnschedule : undefined}
                onViewSteps={openScheduleSteps}
              />
            ))}
          </div>
        )}
      </>
    );

  return (
    <div className="space-y-5">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-[20px] font-bold text-[#21295A]">Maintenance &amp; Tasks</h1>
          <p className="mt-0.5 text-[13px] text-gray-500">
            {isCentre
              ? 'Browse the task library, schedule tasks for this centre, mark them done, and flag issues.'
              : 'Global task library — define a task once and it becomes available at every centre for scheduling.'}
          </p>
        </div>
        {isCentre && (
          <div className="flex flex-shrink-0 flex-col items-end gap-2">
            <button
              className={`flex items-center gap-1.5 rounded-lg border px-3.5 py-2 text-[12px] font-semibold transition ${
                scheduleView === 'calendar'
                  ? 'border-[#21295A] bg-[#ecedf4] text-[#21295A]'
                  : 'border-gray-200 bg-white text-gray-600 hover:bg-gray-50'
              }`}
              type="button"
              onClick={() => {
                setCentreModule('schedule');
                setShowLogs(false);
                setScheduleView(v => (v === 'calendar' ? 'list' : 'calendar'));
              }}
            >
              📅 Calendar
            </button>
            <button
              className="flex items-center gap-1.5 rounded-lg border border-gray-200 bg-white px-3.5 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
              type="button"
              onClick={() => setShowLogs(true)}
            >
              📋 Logs
            </button>
          </div>
        )}
      </div>

      {isCentre && (
        <div className="flex gap-2">
          {(
            [
              { key: 'library', label: 'Task Library', sub: 'Browse · schedule tasks' },
              { key: 'schedule', label: 'My Schedule', sub: 'Today · this week · overdue' },
            ] as { key: CentreModule; label: string; sub: string }[]
          ).map(m => {
            const active = centreModule === m.key;
            // "My Schedule" shows a live count of everything currently scheduled at this centre.
            const count = m.key === 'schedule' ? schedules.length : 0;
            return (
              <button
                key={m.key}
                className={`flex-1 rounded-xl border px-4 py-3 text-left transition ${
                  active ? 'border-[#21295A] bg-[#ecedf4]' : 'border-gray-200 bg-white hover:bg-gray-50'
                }`}
                type="button"
                onClick={() => {
                  setCentreModule(m.key);
                  setShowLogs(false);
                }}
              >
                <div className="flex items-center gap-2">
                  <span className="text-[13px] font-bold text-[#21295A]">{m.label}</span>
                  {m.key === 'schedule' && count > 0 && (
                    <span className="rounded-full bg-[#21295A] px-1.5 py-0.5 text-[10.5px] font-bold leading-none text-white">
                      {count}
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-gray-500">{m.sub}</div>
              </button>
            );
          })}
        </div>
      )}

      {isCentre && showLogs ? (
        <LogsView schedules={schedules} onBack={() => setShowLogs(false)} />
      ) : isCentre && centreModule === 'schedule' ? (
        renderSchedule()
      ) : (
        renderLibrary()
      )}

      {templateModal.open && (
        <TemplateModal
          template={templateModal.template}
          onClose={() => setTemplateModal({ open: false, template: null })}
          onSaved={() => {
            setTemplateModal({ open: false, template: null });
            loadTemplates();
          }}
        />
      )}
      {scheduleTemplate && (
        <ScheduleModal
          defaultLane={libLane}
          facilityCode={facilityCode}
          template={scheduleTemplate}
          onClose={() => setScheduleTemplate(null)}
          onScheduled={() => {
            setScheduleTemplate(null);
            loadSchedules();
          }}
        />
      )}
      {reschedule && (
        <ScheduleModal
          existing={reschedule}
          facilityCode={facilityCode}
          template={reschedule.template}
          onClose={() => setReschedule(null)}
          onScheduled={() => {
            setReschedule(null);
            loadSchedules();
          }}
        />
      )}
      {flag && (
        <FlagIssueModal
          facilityCode={facilityCode}
          schedule={flag}
          onClose={() => setFlag(null)}
          onFlagged={() => {
            setFlag(null);
            loadSchedules();
          }}
        />
      )}
      {stepsView && (
        <StepsModal
          steps={stepsView.steps}
          title={stepsView.title}
          videoUrl={stepsView.videoUrl}
          onClose={() => setStepsView(null)}
        />
      )}
      {calendarSchedule && (
        <div
          aria-modal="true"
          className="fixed inset-0 z-[650] flex items-center justify-center bg-black/50 p-4"
          role="dialog"
        >
          {/* Solid white card, matching StepsModal/ScheduleModal — ScheduleCard's own
              tinted backgrounds (e.g. bg-teal-50/50) assume an opaque white page
              behind them and look washed-out floating directly on the dark overlay. */}
          <div className="flex max-h-[90vh] w-full max-w-[560px] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-start justify-between bg-[#1a2340] px-6 py-4">
              <div className="min-w-0 truncate text-[16px] font-bold text-white">{calendarSchedule.template.title}</div>
              <button
                aria-label="Close"
                className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
                type="button"
                onClick={() => setCalendarSchedule(null)}
              >
                ✕
              </button>
            </div>
            <div className="overflow-y-auto bg-white p-5">
              <ScheduleCard
                canManage={canManage}
                facilityCode={facilityCode}
                schedule={calendarSchedule}
                onChanged={() => {
                  loadSchedules();
                  setCalendarSchedule(null);
                }}
                onFlag={s => {
                  setCalendarSchedule(null);
                  setFlag(s);
                }}
                onReschedule={
                  canManage
                    ? s => {
                        setCalendarSchedule(null);
                        setReschedule(s);
                      }
                    : undefined
                }
                onUnschedule={
                  canManage
                    ? s => {
                        setCalendarSchedule(null);
                        onUnschedule(s);
                      }
                    : undefined
                }
                onViewSteps={s => {
                  setCalendarSchedule(null);
                  openScheduleSteps(s);
                }}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Maintenance;
