import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { AppDispatch, RootState } from "../../store/store";
import { getSingleMemberDetails } from "../../store/members/api";
import { useParams, useNavigate } from "react-router-dom";
import {
  Calendar,
  CreditCard,
  User,
  Users,
  CheckCircle,
  XCircle,
} from "lucide-react";
import SectionTitle from "../../components/SectionTitle";

const ViewMembers = () => {
  const { memberDetails, isLoading } = useSelector(
    (state: RootState) => state.members,
  );
  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();

  const { userId } = useParams();

  useEffect(() => {
    dispatch(getSingleMemberDetails({ userId: userId as string }));
  }, [dispatch, userId]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  };

  const getSubscriptionBadgeColor = (subscriptionCode: string) => {
    const colors: { [key: string]: string } = {
      family: "bg-purple-100 text-purple-800 border-purple-200",
      individual: "bg-blue-100 text-blue-800 border-blue-200",
      premium: "bg-yellow-100 text-yellow-800 border-yellow-200",
      basic: "bg-gray-100 text-gray-800 border-gray-200",
    };
    return (
      colors[subscriptionCode] || "bg-gray-100 text-gray-800 border-gray-200"
    );
  };

  const getBillingCycleBadge = (cycle: string) => {
    return cycle === "annual"
      ? "bg-green-100 text-green-800 border-green-200"
      : "bg-blue-100 text-blue-800 border-blue-200";
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
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              {/* Profile Header */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 px-4 sm:px-6 py-6 sm:py-8">
                <div className="flex flex-col items-center">
                  <div className="relative">
                    {memberDetails.profileImageUrl ? (
                      <img
                        src={memberDetails.profileImageUrl}
                        alt={`${memberDetails.firstName} ${memberDetails.lastName}`}
                        className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg object-cover"
                      />
                    ) : (
                      <div className="w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full border-4 border-white shadow-lg bg-gray-200 flex items-center justify-center">
                        <User className="w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16 text-gray-400" />
                      </div>
                    )}
                    {memberDetails.isActivePlayer && (
                      <div className="absolute -bottom-2 -right-2 bg-green-500 rounded-full p-1.5 sm:p-2 border-4 border-white">
                        <CheckCircle className="w-4 h-4 sm:w-5 sm:h-5 text-white" />
                      </div>
                    )}
                  </div>
                  <h1 className="mt-3 sm:mt-4 text-xl sm:text-2xl font-bold text-white text-center break-words max-w-full px-2">
                    {memberDetails.firstName} {memberDetails.lastName}
                  </h1>
                  <p className="text-blue-100 text-xs sm:text-sm mt-1 break-all max-w-full px-2">
                    {memberDetails.email}
                  </p>
                </div>
              </div>

              {/* Profile Details */}
              <div className="px-4 sm:px-6 py-4 sm:py-5 space-y-3 sm:space-y-4">
                <div className="flex items-center justify-between"></div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-500">
                    Onboarding Type
                  </span>
                  <span className="text-xs sm:text-sm text-gray-900 capitalize text-right">
                    {memberDetails.onboardingType}
                  </span>
                </div>
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs sm:text-sm font-medium text-gray-500">
                    Account Status
                  </span>
                  <span
                    className={`flex items-center text-xs sm:text-sm font-medium ${memberDetails.isActivePlayer ? "text-green-600" : "text-red-600"}`}
                  >
                    {memberDetails.isActivePlayer ? (
                      <>
                        <CheckCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Active
                      </>
                    ) : (
                      <>
                        <XCircle className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                        Inactive
                      </>
                    )}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Subscription & Members */}
          <div className="lg:col-span-2 space-y-4 sm:space-y-6">
            {/* Subscription Details Card */}
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
              <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4">
                <div className="flex items-center">
                  <CreditCard className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 mr-2" />
                  <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                    Subscription Details
                  </h2>
                </div>
              </div>
              <div className="px-4 sm:px-6 py-4 sm:py-5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">
                      Subscription Plan
                    </p>
                    <span
                      className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold border ${getSubscriptionBadgeColor(memberDetails.subscription.subscriptionCode)}`}
                    >
                      {memberDetails.subscription.subscriptionCode
                        .charAt(0)
                        .toUpperCase() +
                        memberDetails.subscription.subscriptionCode.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-2">
                      Billing Cycle
                    </p>
                    <span
                      className={`inline-flex items-center px-2.5 sm:px-3 py-1 sm:py-1.5 rounded-full text-xs sm:text-sm font-semibold border ${getBillingCycleBadge(memberDetails.subscription.billingCycle)}`}
                    >
                      {memberDetails.subscription.billingCycle
                        .charAt(0)
                        .toUpperCase() +
                        memberDetails.subscription.billingCycle.slice(1)}
                    </span>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1 flex items-center">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Current Period Start
                    </p>
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {formatDate(
                        memberDetails.subscription.currentPeriodStart,
                      )}
                    </p>
                  </div>
                  <div>
                    <p className="text-xs sm:text-sm font-medium text-gray-500 mb-1 flex items-center">
                      <Calendar className="w-3 h-3 sm:w-4 sm:h-4 mr-1" />
                      Current Period End
                    </p>
                    <p className="text-sm sm:text-base text-gray-900 font-medium">
                      {formatDate(memberDetails.subscription.currentPeriodEnd)}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Members Card */}
            {memberDetails.members && memberDetails.members.length > 0 && (
              <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="border-b border-gray-200 bg-gray-50 px-4 sm:px-6 py-3 sm:py-4">
                  <div className="flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center">
                      <Users className="w-4 h-4 sm:w-5 sm:h-5 text-gray-700 mr-2" />
                      <h2 className="text-base sm:text-lg font-semibold text-gray-900">
                        Additional Members
                      </h2>
                    </div>
                    <span className="bg-blue-100 text-blue-800 text-xs font-semibold px-2 sm:px-2.5 py-1 rounded-full">
                      {memberDetails.members.length}{" "}
                      {memberDetails.members.length === 1
                        ? "Member"
                        : "Members"}
                    </span>
                  </div>
                </div>
                <div className="px-4 sm:px-6 py-4 sm:py-5">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                    {memberDetails.members.map((member, index) => (
                      <div
                        key={member.userId}
                        className="relative bg-gray-50 rounded-lg p-3 sm:p-4 border border-gray-200 hover:border-blue-300 hover:shadow-md transition-all duration-200"
                      >
                        <div className="flex items-start space-x-3 sm:space-x-4">
                          {/* Profile Picture */}
                          <div className="flex-shrink-0">
                            {member.profileImageUrl ? (
                              <img
                                src={member.profileImageUrl}
                                alt={`${member.firstName} ${member.lastName}`}
                                className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-gray-300 object-cover"
                              />
                            ) : (
                              <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-full border-2 border-gray-300 bg-gray-200 flex items-center justify-center">
                                <User className="w-6 h-6 sm:w-8 sm:h-8 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Member Info */}
                          <div className="flex-1 min-w-0">
                            <h3 className="text-sm sm:text-base font-semibold text-gray-900 truncate">
                              {member.firstName} {member.lastName}
                            </h3>
                            <p className="text-xs sm:text-sm text-gray-600 truncate mt-0.5 break-all">
                              {member.email}
                            </p>
                            <div className="mt-1.5 sm:mt-2 space-y-1">
                              <p className="text-xs text-gray-500">
                                <span className="font-medium">
                                  Date of Birth:
                                </span>{" "}
                                {formatDate(member.dateOfBirth)}
                              </p>
                              <div className="flex items-center">
                                <span
                                  className={`inline-flex items-center text-xs font-medium ${member.isActivePlayer ? "text-green-600" : "text-red-600"}`}
                                >
                                  {member.isActivePlayer ? (
                                    <>
                                      <CheckCircle className="w-3 h-3 mr-1" />
                                      Active Player
                                    </>
                                  ) : (
                                    <>
                                      <XCircle className="w-3 h-3 mr-1" />
                                      Inactive
                                    </>
                                  )}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewMembers;
