export interface WorkListRequest {
  facilityCode: string;
  page: number;
  limit: number;
  type?: string;
  status?: string;
  category?: string;
  frequency?: string;
  scheduledDate?: string;
  laneId?: number;
  isActive?: boolean;
}

export interface WorkStep {
  stepId: string;
  order: number;
  title: string;
  imageUrl: string | null;
  videoUrl: string | null;
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
  notes: string | null;
  templateId: string | null;
  isActive: boolean | null;
  laneId: number | null;
  createdAt: string;
  createdBy: string;
  updatedAt: string;
  updatedBy: string;
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
