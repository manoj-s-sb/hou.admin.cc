import { useEffect, useState } from 'react';

import {
  CreditCard,
  User,
  CheckCircle,
  XCircle,
  ChevronDown,
  BookOpen,
  Shield,
  Ban,
  Calendar,
  Mail,
} from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';
import { useParams, useNavigate } from 'react-router-dom';

import SectionTitle from '../../components/SectionTitle';
import { getSingleMemberDetails } from '../../store/members/api';
import { AppDispatch, RootState } from '../../store/store';

const ViewMembers = () => {
  const { memberDetails, isLoading } = useSelector((state: RootState) => state.members);
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { userId } = useParams();

  // Accordion state management
  const [openAccordion, setOpenAccordion] = useState<string>('inductionSteps');

  useEffect(() => {
    dispatch(getSingleMemberDetails({ userId: userId as string }));
  }, [dispatch, userId]);

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? '' : section);
  };

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

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 gap-4 sm:gap-6 lg:grid-cols-3">
          {/* Left Column - Member Profile */}
          <div className="lg:col-span-1">
            {/* User Profile Card with All Details */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 py-6 sm:px-6 sm:py-8">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {memberDetails.profileImageUrl ? (
                      <img
                        alt={`${memberDetails.firstName} ${memberDetails.lastName}`}
                        className="h-28 w-28 rounded-full border-4 border-white object-cover shadow-xl sm:h-32 sm:w-32"
                        src={memberDetails.profileImageUrl}
                      />
                    ) : (
                      <div className="flex h-28 w-28 items-center justify-center rounded-full border-4 border-white bg-gradient-to-br from-gray-100 to-gray-200 shadow-xl sm:h-32 sm:w-32">
                        <User className="h-14 w-14 text-gray-400 sm:h-16 sm:w-16" />
                      </div>
                    )}
                    {memberDetails.isActivePlayer && (
                      <div className="absolute -bottom-1 -right-1 rounded-full border-4 border-white bg-green-500 p-2 shadow-lg">
                        <CheckCircle className="h-5 w-5 text-white" />
                      </div>
                    )}
                  </div>
                  <h1 className="mt-4 max-w-full break-words px-2 text-center text-xl font-bold text-white sm:text-2xl">
                    {memberDetails.firstName} {memberDetails.lastName}
                  </h1>
                  <div className="mt-2 flex items-center text-blue-50">
                    <Mail className="mr-1.5 h-4 w-4" />
                    <p className="max-w-full break-all text-xs sm:text-sm">{memberDetails.email}</p>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="space-y-4 px-4 py-5 sm:px-6">
                {/* Member Details */}
                <div className="space-y-3 border-b border-gray-100 pb-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center text-gray-600">
                      <Shield className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Onboarding Type</span>
                    </div>
                    <span className="text-right text-sm font-medium capitalize text-gray-900">
                      {memberDetails.onboardingType}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="mr-2 h-4 w-4 flex-shrink-0" />
                      <span className="text-sm font-medium">Joined Date</span>
                    </div>
                    <span className="text-right text-sm text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodStart)}
                    </span>
                  </div>
                </div>

                {/* Member Actions */}
                <div className="pt-2">
                  <div className="space-y-3">
                    {/* Block Facility Button */}
                    <button className="group flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-red-500 to-red-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-red-600 hover:to-red-700 hover:shadow-md">
                      <Ban className="mr-2 h-4 w-4 transition-transform group-hover:rotate-12" />
                      Block Facility Access
                    </button>

                    {/* Block Lane Booking Button */}
                    <button className="group flex w-full items-center justify-center rounded-lg bg-gradient-to-r from-orange-500 to-orange-600 px-4 py-3 text-sm font-medium text-white shadow-sm transition-all duration-200 hover:from-orange-600 hover:to-orange-700 hover:shadow-md">
                      <XCircle className="mr-2 h-4 w-4 transition-transform group-hover:scale-110" />
                      Block Lane Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Details View */}
          <div className="space-y-4 sm:space-y-6 lg:col-span-2">
            {/* Subscription Details Card */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center">
                  <CreditCard className="mr-2 h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Subscription Details</h2>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                {/* Subscription Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Subscription Code */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Subscription Code</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.subscription.subscriptionCode}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Status</p>
                    <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                      {memberDetails.isActivePlayer ? 'Active' : 'Inactive'}
                    </span>
                  </div>

                  {/* Current Period Start */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Current Period Start</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodStart)}
                    </p>
                  </div>

                  {/* Current Period End */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Current Period End</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodEnd)}
                    </p>
                  </div>

                  {/* Next Billing Date */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Next Billing Date</p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodEnd)}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Pricing</p>
                    <p className="text-base font-semibold text-green-600">$ 00.00 USD</p>
                    <p className="mt-1 text-xs text-gray-500">{memberDetails.subscription.billingCycle}</p>
                  </div>

                  {/* Billing Cycle */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Billing Cycle</p>
                    <p className="text-base font-semibold capitalize text-gray-900">
                      {memberDetails.subscription.billingCycle}
                    </p>
                  </div>

                  {/* Prepaid Status */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Prepaid Status</p>
                    <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attending Induction Card */}
            <div className="overflow-hidden rounded-xl border shadow-sm">
              <div className="border-b border-blue-200 px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center">
                  <BookOpen className="mr-2 h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Attending Induction</h2>
                </div>
              </div>

              <div className="px-4 py-4 sm:px-6 sm:py-5">
                {/* Induction Steps Accordion */}
                <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
                  <button
                    className="flex w-full items-center justify-between px-4 py-3 transition-colors hover:bg-gray-50"
                    onClick={() => toggleAccordion('inductionSteps')}
                  >
                    <div className="flex items-center">
                      <CheckCircle className="mr-2 h-5 w-5 text-blue-600" />
                      <span className="text-sm font-semibold text-gray-900">Induction Steps</span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">5 of 5 steps completed</span>
                      <ChevronDown
                        className={`h-5 w-5 text-gray-600 transition-transform duration-200 ${
                          openAccordion === 'inductionSteps' ? 'rotate-180' : ''
                        }`}
                      />
                    </div>
                  </button>

                  {/* Induction Steps List */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      openAccordion === 'inductionSteps'
                        ? 'max-h-[2000px] opacity-100'
                        : 'max-h-0 overflow-hidden opacity-0'
                    }`}
                  >
                    <div className="space-y-3 border-t border-gray-200 px-4 py-4">
                      {/* Welcome Registration */}
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">Welcome Registration</span>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* User App Training */}
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">User App Training</span>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Facility Tour */}
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">Facility Tour</span>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Lane App Training */}
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">Lane App Training</span>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Induction Completion */}
                      <div className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                        <div className="flex items-center">
                          <div className="mr-3 flex h-6 w-6 items-center justify-center rounded bg-blue-600">
                            <CheckCircle className="h-4 w-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">Induction Completion</span>
                        </div>
                        <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Overall Progress */}
                      <div className="mt-6 border-t border-gray-200 pt-4">
                        <div className="mb-2 flex items-center justify-between">
                          <span className="text-sm font-medium text-gray-700">Overall Progress</span>
                          <span className="text-sm font-semibold text-gray-900">5 / 5</span>
                        </div>
                        <div className="h-2 w-full rounded-full bg-gray-200">
                          <div
                            className="h-2 rounded-full bg-blue-600 transition-all duration-300"
                            style={{ width: '100%' }}
                          ></div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 flex items-center justify-between border-t border-gray-200 pt-4">
                        <button className="inline-flex items-center rounded-lg border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Select All
                        </button>
                        <button className="inline-flex items-center rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-blue-700">
                          <CheckCircle className="mr-2 h-4 w-4" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tour Details Card */}
            <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
              <div className="border-b border-gray-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
                <div className="flex items-center">
                  <Calendar className="mr-2 h-5 w-5 text-blue-600" />
                  <h2 className="text-lg font-semibold text-gray-900">Tour Details</h2>
                </div>
              </div>
              <div className="px-4 py-4 sm:px-6 sm:py-5">
                {/* Tour Information Grid */}
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {/* Tour Status */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Tour Status</p>
                    <span className="inline-flex items-center rounded-md bg-green-100 px-2.5 py-1 text-xs font-semibold text-green-800">
                      Completed
                    </span>
                  </div>

                  {/* Tour Date */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Tour Date</p>
                    <p className="text-base font-semibold text-gray-900">N/A</p>
                  </div>

                  {/* Tour Guide */}
                  <div className="rounded-lg border border-gray-200 bg-white p-4">
                    <p className="mb-2 text-xs font-medium uppercase text-gray-500">Tour Guide</p>
                    <p className="text-base font-semibold text-gray-900">N/A</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewMembers;
