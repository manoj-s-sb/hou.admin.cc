export interface MemberRequest {
  skip: number;
  limit: number;
  facilityCode: string;
  /** Free-text filter — matches name, email, or phone (partial, case-insensitive). */
  search?: string;
  billingCycle?: 'annual' | 'fortnightly';
  subscriptionCode?: 'standard' | 'premium' | 'family';
  subscriptionStatus?: 'active' | 'pendingactivation' | 'paused' | 'canceled' | 'resumed' | 'inactive';
}

export interface PlayerProfile {
  playerType: string;
  battingStyle: string;
  bowlingStyle: string;
  playerStatus: string;
  battingHand: string;
  bowlingHand: string;
  batsmanType: string;
  bowlerRole: string;
  bowlerType: string;
  experienceLevel: string;
  cricketingGoal: string;
}

export interface UserSubscription {
  billingCycle: string;
  currentPeriodEnd: string;
  currentPeriodStart: string;
  subscriptionCode: string;
  subscriptionStatus: string;
}

export interface userProfile {
  gender: string;
  phone: string;
  dateOfBirth: string;
  unitsOfMeasure: string;
  healthDeclaration: [
    {
      id: string;
      selectedOption: string;
    },
    {
      id: string;
      selectedOption: string;
    },
    {
      id: string;
      selectedOption: string;
    },
    {
      id: string;
      selectedOption: string;
    },
    {
      id: string;
      selectedOption: string;
    },
    {
      id: string;
      selectedOption: string;
    },
  ];
  height: { value: number | string; unit?: string };
  weight: { value: number | string; unit?: string };
}

export interface Member {
  firstName: string;
  lastName: string;
  email: string;
  cycleLimits: {
    carryForward: number;
    cycleNumber: number;
    period: string;
    total: number;
    used: number;
  };
  onboardingType: string;
  profileImageUrl: string;
  playerProfile: PlayerProfile;
  subscription: UserSubscription;
  userProfile: Record<string, unknown>;
  userId: string;
}

export interface MemberListResponse {
  members: Member[];
  limit: number;
  skip: number;
  total: number;
}

export interface PlayerProfileDetails {
  batsmanType: string;

  battingHand: string;
  battingStyle: string;
  bowlerRole: string;
  bowlerType: string;
  bowlingHand: string;
  bowlingStyle: string;
  cricketingGoal: string;
  experienceLevel: string;
  playerStatus: string;
  playerType: string;
}

export interface AdditionalMemberDetails {
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string;
  userId: string;
  dateOfBirth: string;
  isActivePlayer: boolean;
  playerProfile: PlayerProfileDetails;
  userProfile: {
    gender: string;
    phone: string;
    dateOfBirth: string;
    unitsOfMeasure: string;
    healthDeclaration: [
      {
        selectedOption: string;
        id: string;
      },
      {
        selectedOption: string;
        id: string;
      },
      {
        selectedOption: string;
        id: 'doctorAdvice';
      },
      {
        selectedOption: 'No';
        id: string;
      },
      {
        selectedOption: string;
        id: string;
      },
      {
        selectedOption: string;
        id: string;
      },
    ];
    height: {
      value: number;
      unit: string;
    };
    weight: {
      value: number;
      unit: string;
    };
  };
}

export interface MembersSubscription {
  subscriptionCode: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paymentProcessedAt: string;
  /** e.g. active, paused, canceled/cancelled, past_due, pendingactivation, resumed, or '' */
  subscriptionStatus?: string;
}

export interface Pricing {
  basePrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  currency: string;
  isPromoPrice: boolean;
}

export interface Cycles {
  billingCycle: string;
  periodStart: string;
  periodEnd: string;
  cycleNumber: number;
  monthNumber: number;
  newSlots: number;
  carriedFromPrevious: number;
  totalAvailable: number;
  slotsUsed: number;
  unused: number;
  purchasedSlotCount?: number;
  status: string;
  cancelledAt: string | null;
  holdFrom: string | null;
  holdUntil: string | null;
  planChange?: { type?: string; from?: string; to?: string; effectiveDate?: string } | null;
}

export interface SlotUsageTable {
  cycles: Cycles[];
  summary: {
    currentUnused: number;
    totalNewSlots: number;
    totalUsed: number;
  };
}

export interface EmergencyContacts {
  email: string;
  firstName: string;
  lastName: string;
  phone: string;
  relationship: string;
}
export interface MemberDetailsResponse {
  slotUsageTable: SlotUsageTable;
  firstName: string;
  lastName: string;
  countryCode?: string;
  email: string;
  profileImageUrl: string;
  userId: string;
  isActivePlayer: boolean;
  pricing: Pricing;
  onboardingType: string;
  subscription: MembersSubscription;
  members: AdditionalMemberDetails[];
  playerProfile?: PlayerProfile;
  emergencyContacts: [
    {
      firstName: string;
      lastName: string;
      email: string;
      phone: string;
      relationship: string;
      countryCode: string;
    },
  ];
  userProfile?: userProfile;
}

export interface ActivateSubscriptionRequest {
  userId: string;
  adminId: string;
  adminName: string;
}

/** One admin note on a member — see src/pages/members/components/AdminNotesSection.tsx. */
export interface MemberNoteItem {
  id: string;
  userId: string;
  noteText: string;
  createdById: string | null;
  createdByName: string;
  createdAt: string;
  updatedAt: string | null;
}

/** One attachment reference on a sent member email — see SendEmailSection.tsx. */
export interface MemberEmailAttachment {
  blobName: string;
  fileName: string;
  contentType?: string | null;
  sizeBytes?: number | null;
}

/** One custom email sent to a member — see src/pages/members/components/SendEmailSection.tsx. */
export interface MemberEmailItem {
  id: string;
  userId: string;
  subject: string;
  body: string;
  attachments: MemberEmailAttachment[];
  sentById: string | null;
  sentByName: string;
  sentAt: string;
  status: 'sent' | 'failed';
}

/** One recipient's outcome from a bulk send — see BulkSendEmailModal.tsx. */
export interface BulkMemberEmailResult {
  userId: string;
  status: 'sent' | 'failed' | 'skipped_no_email';
}

/** Response for POST /admin/members/email/bulk-send. Counts are synchronous —
 * 'sent' means successfully queued/direct-sent (same meaning as MemberEmailItem's
 * status), not confirmed delivery. */
export interface BulkMemberEmailResponse {
  totalSelected: number;
  sentCount: number;
  failedCount: number;
  skippedNoEmail: number;
  results: BulkMemberEmailResult[];
}

export interface MembersCountResponse {
  premiumFortnightly: number;
  premiumAnnual: number;
  standardFortnightly: number;
  standardAnnual: number;
  familyFortnightly: number;
  familyAnnual: number;
  offpeakFortnightly: number;
  offpeakAnnual: number;
  activeCount: number;
  cancelledCount: number;
  pendingActivationCount: number;
  total: number;
  activeMembersCount: number;
  inactiveMembersCount: number;
  pausedCount?: number;
}
export interface PurchasedSlot {
  purchaseId: string;
  slots: number;
  purchasedAt: string;
  expiresAt?: string;
  status: 'active' | 'used' | 'expired';
  paidAmount?: number;
  currency?: string;
}

export interface PurchasedSlotsData {
  purchases: PurchasedSlot[];
  summary: {
    totalPurchased: number;
    totalUsed: number;
    remaining: number;
  };
}

export interface MembersInitialState {
  isLoading: boolean;
  membersCountLoading: boolean;
  isPurchasedSlotsLoading: boolean;
  error: string | null;
  membersList: MemberListResponse;
  memberDetails: MemberDetailsResponse | null;
  isSubscriptionActivation: boolean;
  membersCount: MembersCountResponse | null;
  purchasedSlotsData: PurchasedSlotsData | null;
  /** Admin Notes — kept separate from `memberDetails` so a note add/edit/delete
   * never has to refetch the whole member object. */
  memberNotes: MemberNoteItem[];
  memberNotesLoading: boolean;
  memberNotesError: string | null;
  /** Custom emails sent to a member — kept separate from `memberDetails` for
   * the same reason `memberNotes` is (see above). */
  memberEmails: MemberEmailItem[];
  memberEmailsLoading: boolean;
  memberEmailsError: string | null;
  memberEmailSending: boolean;
  /** Bulk send (Members grid row selection) — kept separate from the
   * single-member email state above for the same reason memberEmails is. */
  memberEmailBulkSending: boolean;
  memberEmailBulkResult: BulkMemberEmailResponse | null;
}

export const initialState: MembersInitialState = {
  isLoading: false,
  membersCountLoading: false,
  isPurchasedSlotsLoading: false,
  error: '',
  membersList: {
    members: [],
    limit: 20,
    skip: 0,
    total: 0,
  },
  memberDetails: null,
  isSubscriptionActivation: false,
  memberNotes: [],
  memberNotesLoading: false,
  memberNotesError: null,
  memberEmails: [],
  memberEmailsLoading: false,
  memberEmailsError: null,
  memberEmailSending: false,
  memberEmailBulkSending: false,
  memberEmailBulkResult: null,
  membersCount: null,
  purchasedSlotsData: null,
};
