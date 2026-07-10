/**
 * Maintenance & Tasks — TypeScript models mirroring the backend contract
 * (POST /admin/maintenance, action-dispatched). Global `task_template` documents
 * live under facilityCode "GLOBAL"; per-centre `task_schedule` documents carry the
 * facility code and embed a `template` snapshot on read. Attachments/videoUrl are
 * returned as temporary SAS URLs on read.
 */

export type TaskType = 'mech' | 'elec' | 'other';
export type FreqUnit = 'day' | 'week' | 'month' | 'year';
export type TemplatePriority = 'low' | 'medium' | 'high';
export type TemplateStatus = 'active' | 'archived';
export type ScheduleStatus = 'pending' | 'done' | 'overdue';
export type ScheduleView = 'today' | 'week' | 'overdue';

export interface TemplateStep {
  stepId: string;
  order: number;
  title: string;
  imageUrl: string | null;
}

export interface TaskTemplate {
  id: string;
  facilityCode: string; // "GLOBAL"
  type: 'task_template';
  title: string;
  description: string;
  category: string;
  equipment: string | null;
  equipmentCustom: string | null;
  taskType: TaskType;
  freqN: number;
  freqUnit: FreqUnit;
  steps: TemplateStep[];
  priority: TemplatePriority;
  status: TemplateStatus;
  videoUrl: string | null;
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
}

/** Template snapshot embedded in a schedule read response. */
export interface TemplateEnrich {
  id: string;
  title: string;
  description: string;
  category: string;
  equipment: string | null;
  equipmentCustom: string | null;
  taskType: TaskType;
  freqN: number;
  freqUnit: FreqUnit;
  steps: TemplateStep[];
  priority: TemplatePriority;
  status: TemplateStatus;
  videoUrl: string | null;
}

export interface ScheduleAttachment {
  blobName: string; // SAS URL on read; raw blobName on write
  addedAt: string;
  addedBy: string;
  addedByName: string;
}

export interface TaskSchedule {
  id: string;
  facilityCode: string;
  type: 'task_schedule';
  templateId: string;
  laneNo: number | null;
  status: ScheduleStatus; // backend-derived (pending | done | overdue)
  scheduledDate: string;
  nextDueDate: string | null;
  lastCompletedAt: string | null;
  actionTaken: string | null;
  attachments: ScheduleAttachment[];
  createdAt: string;
  createdBy: string;
  createdByName: string;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string;
  template: TemplateEnrich;
}

/* ── Request payloads ── */

/** A step on write: title, plus an optional image blobName (from upload_url).
 * Omit `imageUrl` to keep an existing step's image on update (merged by order). */
export interface StepInput {
  title: string;
  imageUrl?: string | null;
}

export interface CreateTemplatePayload {
  title: string;
  description?: string;
  category: string;
  equipment?: string | null;
  equipmentCustom?: string | null;
  taskType: TaskType;
  freqN: number;
  freqUnit: FreqUnit;
  steps?: StepInput[];
  priority: TemplatePriority;
  videoUrl?: string | null;
}

export interface UpdateTemplatePayload extends Partial<CreateTemplatePayload> {
  id: string;
  status?: TemplateStatus;
}

export interface ListTemplatesPayload {
  status?: TemplateStatus;
  freqUnit?: FreqUnit;
}

export interface ScheduleTaskPayload {
  templateId: string;
  facilityCode: string;
  laneNo?: number | null;
  scheduledDate: string; // YYYY-MM-DD
}

export interface ListSchedulesPayload {
  facilityCode: string;
  status?: ScheduleStatus;
  view?: ScheduleView;
}

export interface CompleteTaskPayload {
  id: string;
  facilityCode: string;
  actionTaken?: string;
  attachments?: string[];
}

export interface FlagIssuePayload {
  scheduleId: string;
  facilityCode: string;
  title: string;
  notes?: string;
  priority: TemplatePriority;
  laneNo?: number | null;
  attachments?: string[];
}

export interface UnscheduleTaskPayload {
  id: string;
  facilityCode: string;
}

/* ── Response shapes ── */

export interface ListTemplatesResponse {
  items: TaskTemplate[];
  total: number;
}

export interface ListSchedulesResponse {
  items: TaskSchedule[];
  total: number;
  facilityCode: string;
}

export interface FlagIssueResponse {
  ticket: { id: string; ticketNo?: string } & Record<string, unknown>;
  scheduleId: string;
}

/* ── Redux slice state ── */

export interface MaintenanceState {
  templates: TaskTemplate[];
  templatesLoading: boolean;
  schedules: TaskSchedule[];
  schedulesLoading: boolean;
  saving: boolean;
  error: string | null;
}

export const initialMaintenanceState: MaintenanceState = {
  templates: [],
  templatesLoading: false,
  schedules: [],
  schedulesLoading: false,
  saving: false,
  error: null,
};
