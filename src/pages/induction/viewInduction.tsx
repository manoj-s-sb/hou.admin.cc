import { useState, useEffect } from "react";
import {
  formatDateChicago,
  formatDateTimeChicago,
  formatTimeRangeChicago,
} from "../../utils/dateUtils";
import SectionTitle from "../../components/SectionTitle";
import { useNavigate } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { RootState, AppDispatch } from "../../store/store";
import {
  getInductionStepsDetails,
  updateInductionSteps,
} from "../../store/induction/api";
import { SubStep } from "../../store/induction/types";
import { toast } from "react-hot-toast";
import { activateUserSubscription } from "../../store/members/api";

// Helper function to convert camelCase to readable title
const formatStepTitle = (id: string): string => {
  // Convert camelCase to Title Case with spaces
  return id
    .replace(/([A-Z])/g, " $1")
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
};

interface AccordionItemProps {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isInductionCompleted: boolean;
  isPrimary: boolean;
  isOpen: boolean;
  onToggle: () => void;
  dispatch: any;
  onSaveInduction: (userId: string, steps: SubStep[]) => void;
  isSaving: boolean;
  isSubscriptionActivation: boolean;
  data: any;
}

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  isSubscriptionActivation: boolean;
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  isSubscriptionActivation,
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
        <div className="p-6">
          <h3 className="text-lg font-semibold text-gray-900 text-center mb-2">
            Confirm Changes
          </h3>
          <p className="text-sm text-gray-600 text-center mb-6">
            Are you sure you want to save these induction changes?
          </p>
          <div className="flex space-x-3">
            <button
              onClick={onClose}
              disabled={isSaving || isSubscriptionActivation}
              className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
            <button
              onClick={onConfirm}
              disabled={isSaving || isSubscriptionActivation}
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isSaving && (
                <svg
                  className="animate-spin h-4 w-4 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  ></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
              )}
              <span>
                {isSaving && isSubscriptionActivation
                  ? "Activating..."
                  : isSaving
                    ? "Saving..."
                    : "Confirm"}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

const AccordionItem = ({
  userId,
  email,
  firstName,
  lastName,
  isInductionCompleted,
  isPrimary,
  isOpen,
  onToggle,
  dispatch,
  onSaveInduction,
  isSaving,
  isSubscriptionActivation,
  data,
}: AccordionItemProps) => {
  const [steps, setSteps] = useState<SubStep[]>([]);
  const [originalSteps, setOriginalSteps] = useState<SubStep[]>([]); // Track original API data
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);

  // Fetch induction steps details when accordion is opened
  useEffect(() => {
    if (isOpen && userId) {
      setIsLoadingSteps(true);
      dispatch(getInductionStepsDetails({ userId }))
        .unwrap()
        .then((data: any) => {
          if (data) {
            setSteps(data?.data?.subSteps);
            setOriginalSteps(data?.data?.subSteps); // Store original API data
          }
        })
        .catch((error: any) => {
          console.error(
            `Error fetching induction steps for user ${userId}:`,
            error,
          );
        })
        .finally(() => {
          setIsLoadingSteps(false);
        });
    }
  }, [isOpen, userId, dispatch]);

  const toggleStep = (stepId: string) => {
    setSteps((prevSteps) =>
      prevSteps.map((step) =>
        step.id === stepId
          ? {
              ...step,
              status: step.status === "completed" ? "pending" : "completed",
              completedAt:
                step.status === "completed" ? null : new Date().toISOString(),
              completedBy: step.status === "completed" ? null : userId,
            }
          : step,
      ),
    );
  };

  const handleSaveClick = () => {
    setShowConfirmModal(true);
  };

  const handleConfirmSave = () => {
    onSaveInduction(userId, steps);
    setShowConfirmModal(false);
  };

  const handleCancelSave = () => {
    setShowConfirmModal(false);
  };

  const fullName = `${firstName} ${lastName}`.trim();

  // Calculate completion status based on actual API data
  const completedCount = steps?.filter((s) => s.status === "completed").length;
  const totalSteps = steps?.length || 0;
  const isInductionCompletedFromAPI =
    totalSteps > 0 && completedCount === totalSteps;

  return (
    <div className="border border-gray-200 rounded-lg overflow-hidden mb-3">
      {/* Accordion Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 sm:px-6 py-3 sm:py-4 bg-white hover:bg-gray-50 transition-colors flex items-start sm:items-center justify-between"
      >
        <div className="flex items-start sm:items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
          {/* User Avatar */}
          <div
            className={`w-10 h-10 sm:w-12 sm:h-12 rounded-full flex items-center justify-center text-white font-semibold flex-shrink-0 ${
              isPrimary ? "bg-blue-600" : "bg-green-600"
            }`}
          >
            {firstName.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="text-left flex-1 min-w-0">
            <div className="flex items-center space-x-2 flex-wrap">
              <h3 className="font-semibold text-gray-900 text-sm sm:text-base truncate">
                {fullName || "N/A"}
              </h3>
              {isPrimary && (
                <span className="px-2 py-0.5 sm:py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded whitespace-nowrap">
                  Primary
                </span>
              )}
            </div>
            <p className="text-xs sm:text-sm text-gray-600 truncate">{email}</p>

            {/* Mobile Progress - shown on small screens */}
            <div className="mt-1 sm:hidden">
              <p className="text-xs font-medium text-gray-700">
                {completedCount} / {totalSteps} Steps
              </p>
              <p
                className={`text-xs ${isInductionCompletedFromAPI ? "text-green-600" : "text-orange-600"}`}
              >
                {isInductionCompletedFromAPI ? "Completed" : "In Progress"}
              </p>
            </div>
          </div>

          {/* Progress Badge - hidden on mobile */}
          <div className="hidden sm:flex items-center space-x-3">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {completedCount} / {totalSteps} Steps
              </p>
              <p
                className={`text-xs ${isInductionCompletedFromAPI ? "text-green-600" : "text-orange-600"}`}
              >
                {isInductionCompletedFromAPI ? "Completed" : "In Progress"}
              </p>
            </div>

            {/* Chevron Icon */}
            <svg
              className={`w-5 h-5 text-gray-500 transition-transform ${isOpen ? "transform rotate-180" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Chevron Icon - mobile only */}
        <svg
          className={`sm:hidden w-5 h-5 text-gray-500 transition-transform flex-shrink-0 mt-1 ${isOpen ? "transform rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="px-3 sm:px-6 py-3 sm:py-4 bg-gray-50 border-t border-gray-200">
          {/* Induction Steps */}
          <div className="space-y-2">
            <div className="flex justify-between items-center mb-3">
              <h4 className="text-xs sm:text-sm font-semibold text-gray-700">
                Induction Steps ({totalSteps}{" "}
                {totalSteps === 1 ? "Step" : "Steps"})
              </h4>
            </div>

            {isLoadingSteps ? (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="animate-spin h-5 w-5 text-blue-600"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                  <span className="text-sm text-gray-600">
                    Loading induction steps...
                  </span>
                </div>
              </div>
            ) : totalSteps === 0 ? (
              <div className="p-4 bg-white rounded-lg border border-gray-200">
                <p className="text-sm text-gray-600 text-center">
                  No induction steps found
                </p>
              </div>
            ) : (
              steps.map((step, index) => {
                const isCompleted = step.status === "completed";
                // Check if the step was originally completed in the API response
                const originalStep = originalSteps.find(
                  (s) => s.id === step.id,
                );
                const isOriginallyCompleted =
                  originalStep?.status === "completed";
                return (
                  <div
                    key={step.id}
                    className={`p-3 sm:p-4 rounded-lg border-2 transition-all ${
                      isCompleted
                        ? "bg-green-50 border-green-300"
                        : "bg-white border-gray-200"
                    }`}
                  >
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 pt-1">
                        <input
                          type="checkbox"
                          id={`step-${userId}-${step.id}`}
                          checked={isCompleted}
                          disabled={isOriginallyCompleted}
                          onChange={() => toggleStep(step.id)}
                          className={`w-4 h-4 sm:w-5 sm:h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 ${
                            isOriginallyCompleted
                              ? "cursor-not-allowed opacity-60"
                              : "cursor-pointer"
                          }`}
                        />
                      </div>

                      {/* Step Content */}
                      <div className="flex-1 min-w-0">
                        <div className={isCompleted ? "" : "cursor-pointer"}>
                          <div className="flex items-center space-x-2 mb-1 flex-wrap">
                            <span
                              className={`text-xs font-semibold px-2 py-0.5 rounded whitespace-nowrap ${
                                isCompleted
                                  ? "bg-green-200 text-green-800"
                                  : "bg-gray-200 text-gray-700"
                              }`}
                            >
                              Step {index + 1}
                            </span>
                            <h5
                              className={`text-sm sm:text-base font-semibold ${
                                isCompleted ? "text-green-900" : "text-gray-900"
                              }`}
                            >
                              {formatStepTitle(step.id)}
                            </h5>
                          </div>
                          {step.completedAt && (
                            <p className="text-xs text-gray-500 mt-1">
                              Completed:{" "}
                              {formatDateTimeChicago(step.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Completion Icon */}
                      {isCompleted && (
                        <svg
                          className="w-5 h-5 sm:w-6 sm:h-6 text-green-600 flex-shrink-0"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            fillRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            clipRule="evenodd"
                          />
                        </svg>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* Save Induction Button */}
          {data?.status !== "completed" && (
            <div className="mt-4 sm:mt-6 flex justify-stretch sm:justify-end">
              <button
                onClick={handleSaveClick}
                disabled={isSaving || isSubscriptionActivation}
                className={`w-full sm:w-auto px-4 sm:px-6 py-2.5 text-white text-sm font-semibold rounded-lg transition-colors shadow-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center justify-center space-x-2 ${
                  isSaving || isSubscriptionActivation
                    ? "bg-blue-400 cursor-not-allowed"
                    : "bg-blue-600 hover:bg-blue-700 hover:shadow-lg"
                }`}
              >
                {isSaving && (
                  <svg
                    className="animate-spin h-4 w-4 text-white"
                    xmlns="http://www.w3.org/2000/svg"
                    fill="none"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      className="opacity-25"
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                    ></circle>
                    <path
                      className="opacity-75"
                      fill="currentColor"
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
                <span>
                  {isSubscriptionActivation
                    ? "Activating Subscription..."
                    : isSaving
                      ? "Saving..."
                      : "Save Induction"}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={handleCancelSave}
        onConfirm={handleConfirmSave}
        isSaving={isSaving}
        isSubscriptionActivation={isSubscriptionActivation}
      />
    </div>
  );
};

const ViewInduction = () => {
  const { selectedInduction, members } = useSelector((state: RootState) => {
    return {
      selectedInduction: state.induction?.selectedInduction,
      members: state.members,
    };
  });

  const dispatch = useDispatch<AppDispatch>();
  const [openAccordions, setOpenAccordions] = useState<string[]>([
    selectedInduction?.userId || "",
  ]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const data = selectedInduction;
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem("user") || "{}");

  const toggleAccordion = (userId: string) => {
    setOpenAccordions((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId],
    );
  };

  const handleSaveInduction = (userId: string, steps: SubStep[]) => {
    // Set loading state for this specific user
    setSavingUserId(userId);

    // Filter steps to send only id and status fields
    const filteredSteps = steps.map(({ id, status }) => ({
      id,
      status,
    }));

    // Dispatch the API call with userId and filtered substeps
    dispatch(updateInductionSteps({ userId, subSteps: filteredSteps }))
      .unwrap()
      .then((response) => {
        toast.success("Induction steps saved successfully!");
        // Check if all 5 steps are completed
        const completedSteps = response?.data?.subSteps?.filter(
          (s: any) => s.status === "completed",
        ).length;
        const totalSteps = response?.data?.subSteps?.length;

        if (
          response?.status === "success" &&
          completedSteps === 5 &&
          completedSteps === totalSteps
        ) {
          dispatch(
            activateUserSubscription({
              userId,
              adminId: user?.userId || "",
              adminName: `${user?.firstName} ${user?.lastName}`,
            }),
          )
            .then((response) => {
              if (response?.payload?.status === "error") {
                toast.error(response?.payload?.message, { duration: 5000 });
              } else {
                toast.success("Subscription activated successfully!");
              }
            })
            .catch((error) => {
              console.log(error);
              toast.error(`Failed to activate subscription: ${error}`);
            });
        }
      })
      .catch((error) => {
        toast.error(`Failed to save induction steps: ${error}`);
      })
      .finally(() => {
        dispatch(getInductionStepsDetails({ userId }));
        // Clear loading state
        setSavingUserId(null);
      });
  };

  const formatOnboardingType = (type: string) => {
    if (type === "someoneelse") return "Someone Else";
    if (type === "individual") return "Individual";
    if (type === "family") return "Family";
    return type;
  };

  return (
    <div className="w-full mx-auto p-3 sm:p-4 md:p-6">
      {/* Header Section */}
      <SectionTitle
        title="View Induction"
        inputPlaceholder=""
        search={false}
        onBackClick={() => navigate("/induction")}
        value=""
        onSearch={() => {}}
        description="Manage and track induction progress for all participants"
      />

      {/* Booking Information Card */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6 mb-4 sm:mb-6">
        <div className="flex justify-between items-center mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900 mb-3 sm:mb-4">
            Booking Information
          </h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4">
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              Booking Code
            </p>
            <p className="font-semibold text-gray-900 text-sm sm:text-base break-all">
              {data?.bookingCode || "N/A"}
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              Onboarding Type
            </p>
            <p className="font-semibold text-gray-900 text-sm sm:text-base">
              {formatOnboardingType(data?.onboardingType || "")}
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">
              Facility Code
            </p>
            <p className="font-semibold text-gray-900 text-sm sm:text-base break-all">
              {data?.facilityCode || "N/A"}
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Status</p>
            <span
              className={`inline-block px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-full text-xs sm:text-sm font-medium ${
                data?.status === "confirmed"
                  ? "bg-green-100 text-green-800"
                  : "bg-yellow-100 text-yellow-800"
              }`}
            >
              {data?.status?.charAt(0).toUpperCase() +
                (data?.status?.slice(1) || "")}
            </span>
          </div>
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Time Slot</p>
            <p className="font-semibold text-gray-900 text-xs sm:text-sm">
              {formatTimeRangeChicago(
                data?.timeSlot?.startTime,
                data?.timeSlot?.endTime,
              )}
            </p>
          </div>
          <div className="p-3 sm:p-4 bg-gray-50 rounded-lg">
            <p className="text-xs sm:text-sm text-gray-600 mb-1">Date</p>
            <p className="font-semibold text-gray-900 text-xs sm:text-sm">
              {formatDateChicago(data?.timeSlot?.startTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className="bg-white rounded-lg shadow-md p-4 sm:p-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg sm:text-xl font-semibold text-gray-900">
            Participants
          </h2>
          <p className="text-xs sm:text-sm text-gray-600 mt-1">
            Total: {1 + (data?.members?.length || 0)} participant(s)
          </p>
        </div>

        {/* Primary User Accordion */}
        <div className="mb-4">
          <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
            Primary User
          </h3>
          <AccordionItem
            userId={data?.userId || ""}
            email={data?.email || ""}
            firstName={data?.firstName || ""}
            lastName={data?.lastName || ""}
            isInductionCompleted={data?.isInductionCompleted || false}
            isPrimary={true}
            isOpen={openAccordions.includes(data?.userId || "")}
            onToggle={() => toggleAccordion(data?.userId || "")}
            dispatch={dispatch}
            onSaveInduction={handleSaveInduction}
            isSaving={savingUserId === data?.userId}
            isSubscriptionActivation={members?.isSubscriptionActivation}
            data={data}
          />
        </div>

        {/* Secondary Users (Members) */}
        {data?.members && data?.members?.length > 0 && (
          <div>
            <h3 className="text-xs sm:text-sm font-medium text-gray-700 mb-2 uppercase tracking-wide">
              Additional Members ({data?.members?.length || 0})
            </h3>
            {data.members.map((member) => (
              <AccordionItem
                key={member.userId}
                userId={member.userId}
                email={member.email}
                firstName={member.firstName}
                lastName={member.lastName}
                isInductionCompleted={member.isInductionCompleted}
                isPrimary={false}
                isOpen={openAccordions.includes(member.userId)}
                onToggle={() => toggleAccordion(member.userId)}
                dispatch={dispatch}
                onSaveInduction={handleSaveInduction}
                isSaving={savingUserId === member.userId}
                isSubscriptionActivation={members?.isSubscriptionActivation}
                data={data}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewInduction;
