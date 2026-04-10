export interface UpdateWorkRequest {
  itemId: string;
  scheduledDate?: string;
  status?: string;
  lastCompletedAt?: string;
  nextDueDate?: string;
  updatedBy?: string;
  updatedByName?: string;
  actionTaken?: string;
  attachments?: string[];
  comment?: string;
  commentAttachment?: string;
}

export interface CreateWorkRequest {
  facilityCode: string;
  type: string;
  title: string;
  category: string;
  frequency?: string;
  priority: string;
  laneNo?: number;
  notes?: string;
  videoUrl?: string;
  status?: string;
  raisedBy?: string;
  raisedByName?: string;
  assignedTo?: string;
  createdBy?: string;
  createdByName?: string;
  attachments?: string[];
  steps?: {
    stepId: string;
    order: number;
    title: string;
    imageUrl: string | null;
    videoUrl: string | null;
  }[];
}

export interface WorkListRequest {
  facilityCode: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
  category?: string;
  frequency?: string;
  scheduledDate?: string;
  fromDate?: string;
  toDate?: string;
  laneNo?: number;
  isActive?: boolean;
}

export interface WorkStep {
  stepId: string;
  order: number;
  title: string;
  imageUrl: string | null;
  videoUrl: string | null;
}

export interface WorkActivity {
  action: string;
  label: string;
  byId: string | null;
  byName: string | null;
  toId: string | null;
  toName: string | null;
  at: string;
  attachmentUrl?: string | null;
}

export interface Work {
  itemId: string;
  facilityCode: string;
  type: string;
  title: string;
  category: string | null;
  description: string | null;
  steps: WorkStep[];
  frequency: string | null;
  status: string | null;
  priority: string | null;
  scheduledDate: string | null;
  lastCompletedAt: string | null;
  nextDueDate: string | null;
  actionTaken: string | null;
  notes: string | null;
  videoUrl: string | null;
  attachments: { blobName: string; addedAt: string; addedBy: string; addedByName: string }[] | null;
  raisedBy: string | null;
  raisedByName: string | null;
  assignedTo: string | null;
  templateId: string | null;
  isActive: boolean | null;
  laneNo: number | null;
  createdAt: string;
  createdBy: string;
  createdByName: string | null;
  updatedAt: string;
  updatedBy: string;
  updatedByName: string | null;
  activities: WorkActivity[] | null;
}

export interface WorkListResponse {
  items: Work[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface MaintenanceState {
  isLoading: boolean;
  error: string | null;
  workList: WorkListResponse;
}

export const initialState: MaintenanceState = {
  isLoading: false,
  error: '',
  workList: {
    items: [],
    total: 0,
    page: 1,
    limit: 20,
    totalPages: 1,
  },
};
