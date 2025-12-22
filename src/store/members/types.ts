export interface MemberRequest {
  skip: number;
  limit: number;
  facilityCode: string;
  email?: string;
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
  height: any;
  weight: any;
}

export interface Member {
  firstName: string;
  lastName: string;
  email: string;
  onboardingType: string;
  profileImageUrl: string;
  playerProfile: PlayerProfile;
  subscription: UserSubscription;
  userProfile: any;
  userId: string;
}

export interface MemberListResponse {
  members: Member[];
  limit: number;
  skip: number;
  total: number;
}

export interface AdditionalMemberDetails {
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string;
  userId: string;
  dateOfBirth: string;
  isActivePlayer: boolean;
}

export interface MembersSubscription {
  subscriptionCode: string;
  billingCycle: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  paymentProcessedAt: string;
}

export interface Pricing {
  basePrice: number;
  taxRate: number;
  taxAmount: number;
  totalPrice: number;
  currency: string;
  isPromoPrice: boolean;
}
export interface MemberDetailsResponse {
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string;
  userId: string;
  isActivePlayer: boolean;
  pricing: Pricing;
  onboardingType: string;
  subscription: MembersSubscription;
  members: AdditionalMemberDetails[];
  playerProfile?: PlayerProfile;
  userProfile?: userProfile;
}

export interface ActivateSubscriptionRequest {
  userId: string;
  adminId: string;
  adminName: string;
}
export interface MembersInitialState {
  isLoading: boolean;
  error: string | null | any;
  membersList: MemberListResponse;
  memberDetails: MemberDetailsResponse | null;
  isSubscriptionActivation: boolean;
}

export const initialState: MembersInitialState = {
  isLoading: false,
  error: '',
  membersList: {
    members: [],
    limit: 15,
    skip: 0,
    total: 0,
  },
  memberDetails: null,
  isSubscriptionActivation: false,
};
