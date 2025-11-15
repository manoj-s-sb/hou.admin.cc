export interface MemberRequest {
  skip: number;
  limit: number;
  facilityCode: string;
}

export interface Member {
  firstName: string;
  lastName: string;
  email: string;
  onboardingType: string;
  profileImageUrl: string;
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
}

export interface MemberDetailsResponse {
  firstName: string;
  lastName: string;
  email: string;
  profileImageUrl: string;
  userId: string;
  isActivePlayer: boolean;
  onboardingType: string;
  subscription: MembersSubscription;
  members: AdditionalMemberDetails[];
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
  isSubscriptionActivation:boolean
}

export const initialState: MembersInitialState = {
  isLoading: false,
  error: "",
  membersList: {
    members: [],
    limit: 15,
    skip: 0,
    total: 0,
  },
  memberDetails: null,
  isSubscriptionActivation:false
};
