import { useEffect, useState } from 'react';

import {
  CreditCard,
  User,
  CheckCircle,
  // XCircle,
  ChevronDown,
  ChevronUp,
  // BookOpen,
  Shield,
  // Ban,
  Calendar,
  Mail,
  X,
  Activity,
  TrendingUp,
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
  const [expandedCycles, setExpandedCycles] = useState<number[]>([]);

  const { userId } = useParams();

  const toggleCycle = (cycleNumber: number) => {
    setExpandedCycles(prev =>
      prev.includes(cycleNumber) ? prev.filter(num => num !== cycleNumber) : [...prev, cycleNumber]
    );
  };

  useEffect(() => {
    dispatch(getSingleMemberDetails({ userId: userId as string }));
  }, [dispatch, userId]);

  const formatDate = (dateString: string | null) => {
    if (!dateString) {
      return '-';
    }
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
    const item = memberDetails.userProfile.healthDeclaration.find((item: any) => item.id === id) as any;
    return item?.selectedOption || item?.selectedOptions || 'N/A';
  };

  return (
    <div className="min-h-screen bg-gray-50 px-3 py-4 sm:px-4 sm:py-6 lg:px-8 lg:py-8">
      <div className="mx-auto w-full">
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
                      <button
                        className="h-20 w-20 cursor-pointer overflow-hidden rounded-full border-4 border-white bg-transparent object-cover p-0 shadow-xl transition-transform hover:scale-105 sm:h-24 sm:w-24"
                        type="button"
                        onClick={() => setIsImageModalOpen(true)}
                      >
                        <img
                          alt={`${memberDetails.firstName} ${memberDetails.lastName}`}
                          className="h-full w-full object-cover"
                          src={memberDetails.profileImageUrl}
                        />
                      </button>
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
                        <Calendar className="mr-1.5 h-4 w-4" />
                        <span> {formatDate(memberDetails.subscription.paymentProcessedAt)}</span>
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
                    <p className="text-base font-semibold text-green-600">$ {memberDetails.pricing.totalPrice} USD</p>
                    <p className="mt-1 text-xs text-gray-500">{memberDetails.subscription.billingCycle}</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Slot Usage & Cycle Details - Accordion Style */}
          {memberDetails.slotUsageTable?.cycles && (
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <Activity className="mr-2 h-5 w-5 text-blue-600" />
                    <h2 className="text-lg font-semibold text-gray-900">Slot Usage & Cycle Details</h2>
                  </div>
                  <div className="text-sm text-gray-500">
                    Total Cycles:{' '}
                    <span className="font-semibold text-blue-600">{memberDetails.slotUsageTable.cycles.length}</span>
                  </div>
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6 sm:py-5">
                {/* Cycles Accordion */}
                <div className="space-y-3">
                  {memberDetails.slotUsageTable.cycles.map((cycle, index) => {
                    const isExpanded = expandedCycles.includes(cycle.cycleNumber);

                    return (
                      <div
                        key={index}
                        className="overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm transition-all duration-200 hover:shadow-md"
                      >
                        {/* Accordion Header - Clickable */}
                        <button
                          className="w-full text-left transition-colors hover:bg-gray-50"
                          type="button"
                          onClick={() => toggleCycle(cycle.cycleNumber)}
                        >
                          <div className="flex items-center justify-between px-4 py-4">
                            <div className="flex items-center gap-3">
                              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-blue-100">
                                <TrendingUp className="h-5 w-5 text-blue-600" />
                              </div>
                              <div>
                                <h3 className="text-base font-bold text-gray-900">
                                  Cycle {cycle.cycleNumber} -
                                  <span className="px-2.5 py-0.5 text-xs font-semibold uppercase text-gray-700">
                                    {cycle.billingCycle}
                                  </span>
                                </h3>
                              </div>
                            </div>

                            {/* Quick Stats + Expand Icon */}
                            <div className="flex items-center gap-4">
                              <div className="hidden items-center gap-4 sm:flex">
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Available</p>
                                  <p className="text-sm font-bold text-green-600">{cycle.totalAvailable}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Used</p>
                                  <p className="text-sm font-bold text-orange-600">{cycle.slotsUsed}</p>
                                </div>
                                <div className="text-right">
                                  <p className="text-xs text-gray-500">Remaining</p>
                                  <p className="text-sm font-bold text-teal-600">{cycle.unused}</p>
                                </div>
                              </div>

                              <div
                                className={`rounded-full p-1 transition-all duration-200 ${isExpanded ? 'bg-blue-100' : 'bg-gray-100'}`}
                              >
                                {isExpanded ? (
                                  <ChevronUp className="h-5 w-5 text-blue-600" />
                                ) : (
                                  <ChevronDown className="h-5 w-5 text-gray-600" />
                                )}
                              </div>
                            </div>
                          </div>
                        </button>

                        {/* Accordion Content - Expandable */}
                        <div
                          className={`overflow-hidden transition-all duration-300 ease-in-out ${
                            isExpanded ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
                          }`}
                        >
                          <div className="border-t border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50 px-4 py-4">
                            {/* Detailed Stats Table */}
                            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
                              {/* New Slots */}
                              <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  New Slots
                                </p>
                                <p className="text-2xl font-bold text-blue-600">{cycle.newSlots}</p>
                              </div>

                              {/* Carried Forward */}
                              <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Carried Over
                                </p>
                                <p className="text-2xl font-bold text-purple-600">{cycle.carriedFromPrevious}</p>
                              </div>

                              {/* Total Available */}
                              <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Total Available
                                </p>
                                <p className="text-2xl font-bold text-green-600">{cycle.totalAvailable}</p>
                              </div>

                              {/* Slots Used */}
                              <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Slots Used
                                </p>
                                <p className="text-2xl font-bold text-orange-600">{cycle.slotsUsed}</p>
                              </div>

                              {/* Unused Slots */}
                              <div className="flex flex-col items-center justify-center rounded-lg bg-white p-4 shadow-sm">
                                <p className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-500">
                                  Remaining
                                </p>
                                <p className="text-2xl font-bold text-teal-600">{cycle.unused}</p>
                              </div>
                            </div>

                            {/* Additional Cycle Details */}
                            <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
                              <h4 className="mb-3 text-sm font-semibold text-gray-700">Period Details</h4>
                              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <span className="text-xs font-medium text-gray-500">Cycle Number</span>
                                  <span className="text-sm font-bold text-gray-900">#{cycle.cycleNumber}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <span className="text-xs font-medium text-gray-500">Month Number</span>
                                  <span className="text-sm font-bold text-gray-900">Month {cycle.monthNumber}</span>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <span className="text-xs font-medium text-gray-500">Period Start</span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatDate(cycle.periodStart)}
                                  </span>
                                </div>
                                <div className="flex items-center justify-between border-b border-gray-100 pb-2">
                                  <span className="text-xs font-medium text-gray-500">Period End</span>
                                  <span className="text-sm font-semibold text-gray-900">
                                    {formatDate(cycle.periodEnd)}
                                  </span>
                                </div>
                              </div>
                            </div>

                            {/* Usage Percentage Bar */}
                            {/* <div className="mt-4 rounded-lg bg-white p-4 shadow-sm">
                              <div className="mb-2 flex items-center justify-between">
                                <span className="text-xs font-medium text-gray-500">Usage Progress</span>
                                <span className="text-xs font-bold text-gray-900">
                                  {cycle.totalAvailable > 0
                                    ? `${Math.round((cycle.slotsUsed / cycle.totalAvailable) * 100)}%`
                                    : '0%'}
                                </span>
                              </div>
                              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200">
                                <div
                                  className="h-full rounded-full bg-gradient-to-r from-blue-500 to-indigo-600 transition-all duration-500"
                                  style={{
                                    width:
                                      cycle.totalAvailable > 0
                                        ? `${Math.min((cycle.slotsUsed / cycle.totalAvailable) * 100, 100)}%`
                                        : '0%',
                                  }}
                                />
                              </div>
                            </div> */}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

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
                          {(() => {
                            const value = getHealthDeclarationValue('healthConditionDetails');
                            if (!value || value === 'N/A') return 'N/A';
                            if (Array.isArray(value)) return value.join(', ');
                            return value;
                          })()}
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
          role="button"
          tabIndex={0}
          onClick={() => setIsImageModalOpen(false)}
          onKeyDown={e => {
            if (e.key === 'Escape') {
              setIsImageModalOpen(false);
            }
          }}
        >
          <div className="relative">
            <button
              className="absolute -right-2 -top-2 z-10 rounded-full bg-white p-2 shadow-lg transition-colors hover:bg-gray-100"
              type="button"
              onClick={() => setIsImageModalOpen(false)}
            >
              <X className="h-5 w-5 text-gray-600" />
            </button>
            <div role="presentation" onClick={e => e.stopPropagation()}>
              <img
                alt={`${memberDetails.firstName} ${memberDetails.lastName}`}
                className="h-64 w-64 rounded-full border-4 border-white object-cover shadow-2xl sm:h-80 sm:w-80"
                src={memberDetails.profileImageUrl}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ViewMembers;
