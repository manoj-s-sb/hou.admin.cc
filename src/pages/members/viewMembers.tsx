import { useEffect, useState } from 'react';

import {
  CreditCard,
  User,
  CheckCircle,
  // XCircle,
  // ChevronDown,
  // BookOpen,
  Shield,
  // Ban,
  Calendar,
  Mail,
  X,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

import SectionTitle from '../../components/SectionTitle';
import { getSingleMemberDetails } from '../../store/members/api';
import { MemberDetailsResponse } from '../../store/members/types';
import { AppDispatch, RootState } from '../../store/store';

const ViewMembers = () => {
  const { memberDetails, isLoading } = useSelector((state: RootState) => state.members) as {
    memberDetails: MemberDetailsResponse | null;
    isLoading: boolean;
  };
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const [isImageModalOpen, setIsImageModalOpen] = useState(false);

  const { userId } = useParams();

  useEffect(() => {
    dispatch(getSingleMemberDetails({ userId: userId as string }));
  }, [dispatch, userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-12 w-12 animate-spin rounded-full border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!memberDetails) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="text-center">
          <p className="text-lg text-gray-500">No member details found</p>
          <button className="mt-4 font-medium text-blue-600 hover:text-blue-700" onClick={() => navigate('/members')}>
            Go back to members list
          </button>
        </div>
      </div>
    );
  }

  // Helper function to get health declaration value
  const getHealthDeclarationValue = (id: string) => {
    if (!memberDetails.userProfile?.healthDeclaration) return 'N/A';
    const item = memberDetails.userProfile.healthDeclaration.find((item: any) => item.id === id);
    return item?.selectedOption || 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full max-w-6xl">
        <SectionTitle
          description="View member subscription details and account information"
          inputPlaceholder=""
          search={false}
          title="Member Details"
          value=""
          onBackClick={() => navigate('/members')}
          onSearch={() => undefined}
        />

        {/* Unified Content Layout */}
        <div className="space-y-4 sm:space-y-6">
          {/* Member Header Card */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 py-6 sm:px-6 sm:py-8">
              <div className="flex flex-col items-center sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center space-x-4">
                  <div className="relative">
                    {memberDetails.profileImageUrl ? (
                      <img
                        alt={`${memberDetails.firstName} ${memberDetails.lastName}`}
                        className="h-20 w-20 cursor-pointer rounded-full border-4 border-white object-cover shadow-xl transition-transform hover:scale-105 sm:h-24 sm:w-24"
                        onClick={() => setIsImageModalOpen(true)}
                        src={memberDetails.profileImageUrl}
                      />
                    ) : (
                      <div className="flex h-20 w-20 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-gray-100 to-gray-200 shadow-xl sm:h-24 sm:w-24">
                        <User className="h-12 w-12 text-gray-400 sm:h-14 sm:w-14" />
                      </div>
                    )}
                    {memberDetails.isActivePlayer && (
                      <div className="absolute -bottom-1 -right-1 rounded-full border-4 border-white bg-green-500 p-1.5 shadow-lg">
                        <CheckCircle className="h-4 w-4 text-white" />
                      </div>
                    )}
                  </div>
                  <div>
                    <h1 className="text-xl font-bold text-white sm:text-2xl">
                      {memberDetails.firstName} {memberDetails.lastName}
                    </h1>
                    <div className="mt-1 flex items-center text-blue-50">
                      <Mail className="mr-1.5 h-4 w-4" />
                      <p className="text-sm">{memberDetails.email}</p>
                    </div>
                    <div className="mt-2 flex items-center gap-4 text-sm text-blue-50">
                      <div className="flex items-center">
                        <Shield className="mr-1.5 h-4 w-4" />
                        <span className="capitalize">{memberDetails.onboardingType}</span>
                      </div>
                      <div className="flex items-center">
                        <Calendar className="mr-1.5 h-4 w-4" />
                        <span>Joined {formatDate(memberDetails.subscription.currentPeriodStart)}</span>
                      </div>
                    </div>
                  </div>
                </div>
                {/* <div className="mt-4 flex gap-3 sm:mt-0">
                  <button className="group flex items-center justify-center rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30">
                    <Ban className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                    Block Facility
                  </button>
                  <button className="group flex items-center justify-center rounded-lg bg-white/20 px-4 py-2 text-sm font-medium text-white backdrop-blur-sm transition-all duration-200 hover:bg-white/30">
                    <XCircle className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                    Block Lane
                  </button>
                </div> */}
              </div>
            </div>
          </div>

          {/* Subscription Details Card */}
          <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
            {/* Subscription Details Card */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Subscription Details</h2>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Subscription Code</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.subscription.subscriptionCode}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Status</p>
                    <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                      {memberDetails.isActivePlayer ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Billing Cycle</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.subscription.billingCycle}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Current Period Start</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodStart)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Current Period End</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Next Billing Date</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodEnd)}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Pricing</p>
                    <p className="text-base font-semibold text-green-600">$ 00.00 USD</p>
                    <p className="mt-1 text-xs text-gray-500">{memberDetails.subscription.billingCycle}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Player Profile Section */}
          {memberDetails.playerProfile && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center">
                  <User className="mr-2 h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Player Profile</h2>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Player Type</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.playerType || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Player Status</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.playerStatus || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Experience Level</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.experienceLevel || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Batting Style</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.battingStyle || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Batting Hand</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.battingHand || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Batsman Type</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.batsmanType || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Bowling Style</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.bowlingStyle || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Bowling Hand</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.bowlingHand || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Bowler Role</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.bowlerRole || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Bowler Type</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.bowlerType || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4 sm:col-span-2">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Cricketing Goal</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.playerProfile.cricketingGoal || 'N/A'}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Personal & Health Profile Section */}
          {memberDetails.userProfile && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center">
                  <Shield className="mr-2 h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Personal & Health Profile</h2>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Gender</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.userProfile.gender || 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Phone</p>
                    <p className="text-base font-semibold text-gray-900">{memberDetails.userProfile.phone || 'N/A'}</p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Date of Birth</p>
                    <p className="text-base font-semibold text-gray-900">
                      {memberDetails.userProfile.dateOfBirth
                        ? formatDate(memberDetails.userProfile.dateOfBirth)
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Height</p>
                    <p className="text-base font-semibold text-gray-900">
                      {memberDetails.userProfile.height?.value
                        ? `${memberDetails.userProfile.height.value} ${memberDetails.userProfile.height.unit || ''}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Weight</p>
                    <p className="text-base font-semibold text-gray-900">
                      {memberDetails.userProfile.weight?.value
                        ? `${memberDetails.userProfile.weight.value} ${memberDetails.userProfile.weight.unit || ''}`
                        : 'N/A'}
                    </p>
                  </div>
                  <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Units of Measure</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.userProfile.unitsOfMeasure || 'N/A'}
                    </p>
                  </div>
                </div>

                {/* Health Declaration */}
                {memberDetails.userProfile.healthDeclaration && (
                  <div className="mt-6 border-t border-gray-200 pt-6">
                    <h3 className="mb-4 text-sm font-semibold uppercase text-gray-700">Health Declaration</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Health Conditions</p>
                        <p className="text-base font-semibold capitalize text-gray-900">
                          {getHealthDeclarationValue('healthConditions')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Health Condition Details</p>
                        <p className="text-base font-semibold text-gray-900">
                          {getHealthDeclarationValue('healthConditionDetails') || 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Doctor Advice</p>
                        <p className="text-base font-semibold capitalize text-gray-900">
                          {getHealthDeclarationValue('doctorAdvice')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Current Injuries</p>
                        <p className="text-base font-semibold capitalize text-gray-900">
                          {getHealthDeclarationValue('currentInjuries')}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Injury Details</p>
                        <p className="text-base font-semibold text-gray-900">
                          {getHealthDeclarationValue('injuryDetails') || 'N/A'}
                        </p>
                      </div>
                      <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
                        <p className="mb-2 text-xs font-medium uppercase text-gray-500">Allergies</p>
                        <p className="text-base font-semibold capitalize text-gray-900">
                          {getHealthDeclarationValue('allergies')}
                        </p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Image Modal */}
      {isImageModalOpen && memberDetails.profileImageUrl && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-75 p-4"
          onClick={() => setIsImageModalOpen(false)}
        >
          <div className="relative">
            <button
              className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 shadow-lg transition-colors hover:bg-gray-100"
              onClick={() => setIsImageModalOpen(false)}
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
            <img
              alt={`${memberDetails.firstName} ${memberDetails.lastName}`}
              className="h-64 w-64 rounded-full border-4 border-white object-cover shadow-2xl sm:h-80 sm:w-80"
              onClick={(e) => e.stopPropagation()}
              src={memberDetails.profileImageUrl}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewMembers;
