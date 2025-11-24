import { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { getSingleMemberDetails } from "../../store/members/api";
import { useParams, useNavigate } from "react-router-dom";
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
} from "lucide-react";
import SectionTitle from "../../components/SectionTitle";

const ViewMembers = () => {
  const { memberDetails, isLoading } = useSelector(
    (state: RootState) => state.members,
  );
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { userId } = useParams();

  // Accordion state management
  const [openAccordion, setOpenAccordion] = useState<string>("inductionSteps");

  useEffect(() => {
    dispatch(getSingleMemberDetails({ userId: userId as string }));
  }, [dispatch, userId]);

  const toggleAccordion = (section: string) => {
    setOpenAccordion(openAccordion === section ? "" : section);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!memberDetails) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <p className="text-gray-500 text-lg">No member details found</p>
          <button
            onClick={() => navigate("/members")}
            className="mt-4 text-blue-600 hover:text-blue-700 font-medium"
          >
            Go back to members list
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-4 sm:py-6 lg:py-8 px-3 sm:px-4 lg:px-8">
      <div className="w-full mx-auto">
        <SectionTitle
          title="Member Details"
          inputPlaceholder=""
          search={false}
          onBackClick={() => navigate("/members")}
          value=""
          onSearch={() => {}}
          description="View member subscription details and account information"
        />

        {/* Main Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 sm:gap-6">
          {/* Left Column - Member Profile */}
          <div className="lg:col-span-1">
            {/* User Profile Card with All Details */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-blue-600 via-blue-500 to-indigo-600 px-4 sm:px-6 py-6 sm:py-8">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {memberDetails.profileImageUrl ? (
                      <img
                        src={memberDetails.profileImageUrl}
                        alt={`${memberDetails.firstName} ${memberDetails.lastName}`}
                        className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl object-cover"
                      />
                    ) : (
                      <div className="w-28 h-28 sm:w-32 sm:h-32 rounded-full border-4 border-white shadow-xl bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <User className="w-14 h-14 sm:w-16 sm:h-16 text-gray-400" />
                      </div>
                    )}
                    {memberDetails.isActivePlayer && (
                      <div className="absolute -bottom-1 -right-1 bg-green-500 rounded-full p-2 border-4 border-white shadow-lg">
                        <CheckCircle className="w-5 h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <h1 className="mt-4 text-xl sm:text-2xl font-bold text-white text-center break-words max-w-full px-2">
                    {memberDetails.firstName} {memberDetails.lastName}
                  </h1>
                  <div className="flex items-center mt-2 text-blue-50">
                    <Mail className="w-4 h-4 mr-1.5" />
                    <p className="text-xs sm:text-sm break-all max-w-full">
                      {memberDetails.email}
                    </p>
                  </div>
                </div>
              </div>

              {/* Profile Details */}
              <div className="px-4 sm:px-6 py-5 space-y-4">
                {/* Member Details */}
                <div className="space-y-3 pb-4 border-b border-gray-100">
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center text-gray-600">
                      <Shield className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="text-sm font-medium">
                        Onboarding Type
                      </span>
                    </div>
                    <span className="text-sm text-gray-900 font-medium capitalize text-right">
                      {memberDetails.onboardingType}
                    </span>
                  </div>

                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center text-gray-600">
                      <Calendar className="w-4 h-4 mr-2 flex-shrink-0" />
                      <span className="text-sm font-medium">Joined Date</span>
                    </div>
                    <span className="text-sm text-gray-900 text-right">
                      {formatDate(
                        memberDetails.subscription.currentPeriodStart,
                      )}
                    </span>
                  </div>
                </div>

                {/* Member Actions */}
                <div className="pt-2">
                  <div className="space-y-3">
                    {/* Block Facility Button */}
                    <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-red-500 to-red-600 text-white rounded-lg hover:from-red-600 hover:to-red-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm group">
                      <Ban className="w-4 h-4 mr-2 group-hover:rotate-12 transition-transform" />
                      Block Facility Access
                    </button>

                    {/* Block Lane Booking Button */}
                    <button className="w-full flex items-center justify-center px-4 py-3 bg-gradient-to-r from-orange-500 to-orange-600 text-white rounded-lg hover:from-orange-600 hover:to-orange-700 transition-all duration-200 shadow-sm hover:shadow-md font-medium text-sm group">
                      <XCircle className="w-4 h-4 mr-2 group-hover:scale-110 transition-transform" />
                      Block Lane Booking
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Details View */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Subscription Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center">
                  <CreditCard className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Subscription Details
                  </h2>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5">
                {/* Subscription Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Subscription Code */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Subscription Code
                    </p>
                    <p className="text-base font-semibold text-gray-900 capitalize">
                      {memberDetails.subscription.subscriptionCode}
                    </p>
                  </div>

                  {/* Status */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Status
                    </p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                      {memberDetails.isActivePlayer ? "Active" : "Inactive"}
                    </span>
                  </div>

                  {/* Current Period Start */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Current Period Start
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(
                        memberDetails.subscription.currentPeriodStart,
                      )}
                    </p>
                  </div>

                  {/* Current Period End */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Current Period End
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodEnd)}
                    </p>
                  </div>

                  {/* Next Billing Date */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Next Billing Date
                    </p>
                    <p className="text-base font-semibold text-gray-900">
                      {formatDate(memberDetails.subscription.currentPeriodEnd)}
                    </p>
                  </div>

                  {/* Pricing */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Pricing
                    </p>
                    <p className="text-base font-semibold text-green-600">
                      $ 00.00 USD
                    </p>
                    <p className="text-xs text-gray-500 mt-1">
                      {memberDetails.subscription.billingCycle}
                    </p>
                  </div>

                  {/* Billing Cycle */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Billing Cycle
                    </p>
                    <p className="text-base font-semibold text-gray-900 capitalize">
                      {memberDetails.subscription.billingCycle}
                    </p>
                  </div>

                  {/* Prepaid Status */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Prepaid Status
                    </p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800"></span>
                  </div>
                </div>
              </div>
            </div>

            {/* Attending Induction Card */}
            <div className="rounded-xl shadow-sm border  overflow-hidden">
              <div className="border-b border-blue-200 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center">
                  <BookOpen className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Attending Induction
                  </h2>
                </div>
              </div>

              <div className="px-4 sm:px-6 py-4 sm:py-5">
                {/* Induction Steps Accordion */}
                <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
                  <button
                    onClick={() => toggleAccordion("inductionSteps")}
                    className="w-full px-4 py-3 flex items-center justify-between hover:bg-gray-50 transition-colors"
                  >
                    <div className="flex items-center">
                      <CheckCircle className="w-5 h-5 text-blue-600 mr-2" />
                      <span className="text-sm font-semibold text-gray-900">
                        Induction Steps
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-500">
                        5 of 5 steps completed
                      </span>
                      <ChevronDown
                        className={`w-5 h-5 text-gray-600 transition-transform duration-200 ${
                          openAccordion === "inductionSteps" ? "rotate-180" : ""
                        }`}
                      />
                    </div>
                  </button>

                  {/* Induction Steps List */}
                  <div
                    className={`transition-all duration-300 ease-in-out ${
                      openAccordion === "inductionSteps"
                        ? "max-h-[2000px] opacity-100"
                        : "max-h-0 opacity-0 overflow-hidden"
                    }`}
                  >
                    <div className="border-t border-gray-200 px-4 py-4 space-y-3">
                      {/* Welcome Registration */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-3">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            Welcome Registration
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* User App Training */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-3">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            User App Training
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Facility Tour */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-3">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            Facility Tour
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Lane App Training */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-3">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            Lane App Training
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Induction Completion */}
                      <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-center">
                          <div className="w-6 h-6 bg-blue-600 rounded flex items-center justify-center mr-3">
                            <CheckCircle className="w-4 h-4 text-white" />
                          </div>
                          <span className="text-sm font-medium text-gray-900">
                            Induction Completion
                          </span>
                        </div>
                        <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                          Completed
                        </span>
                      </div>

                      {/* Overall Progress */}
                      <div className="mt-6 pt-4 border-t border-gray-200">
                        <div className="flex items-center justify-between mb-2">
                          <span className="text-sm font-medium text-gray-700">
                            Overall Progress
                          </span>
                          <span className="text-sm font-semibold text-gray-900">
                            5 / 5
                          </span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-2">
                          <div
                            className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                            style={{ width: "100%" }}
                          ></div>
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex items-center justify-between mt-4 pt-4 border-t border-gray-200">
                        <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Select All
                        </button>
                        <button className="inline-flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors">
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Save Changes
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Tour Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 bg-white px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center">
                  <Calendar className="w-5 h-5 text-blue-600 mr-2" />
                  <h2 className="text-lg font-semibold text-gray-900">
                    Tour Details
                  </h2>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5">
                {/* Tour Information Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {/* Tour Status */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Tour Status
                    </p>
                    <span className="inline-flex items-center px-2.5 py-1 rounded-md text-xs font-semibold bg-green-100 text-green-800">
                      Completed
                    </span>
                  </div>

                  {/* Tour Date */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Tour Date
                    </p>
                    <p className="text-base font-semibold text-gray-900">N/A</p>
                  </div>

                  {/* Tour Guide */}
                  <div className="bg-white border border-gray-200 rounded-lg p-4">
                    <p className="text-xs font-medium text-gray-500 uppercase mb-2">
                      Tour Guide
                    </p>
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
