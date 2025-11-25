import { useState, useEffect } from 'react';

import { toast } from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate } from 'react-router-dom';

import SectionTitle from '../../components/SectionTitle';
import { getInductionStepsDetails, updateInductionSteps } from '../../store/induction/api';
import { SubStep } from '../../store/induction/types';
import { activateUserSubscription } from '../../store/members/api';
import { RootState, AppDispatch } from '../../store/store';
import { formatDateChicago, formatDateTimeChicago, formatTimeRangeChicago } from '../../utils/dateUtils';

// Helper function to convert camelCase to readable title
const formatStepTitle = (id: string): string => {
  // Convert camelCase to Title Case with spaces
  return id
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <h3 className="mb-2 text-center text-lg font-semibold text-gray-900">Confirm Changes</h3>
          <p className="mb-6 text-center text-sm text-gray-600">
            Are you sure you want to save these induction changes?
          </p>
          <div className="flex space-x-3">
            <button
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving || isSubscriptionActivation}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className="flex flex-1 items-center justify-center space-x-2 rounded-lg bg-blue-600 px-4 py-2 text-white transition-colors hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving || isSubscriptionActivation}
              onClick={onConfirm}
            >
              {isSaving && (
                <svg
                  className="h-4 w-4 animate-spin text-white"
                  fill="none"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    fill="currentColor"
                  ></path>
                </svg>
              )}
              <span>{isSaving && isSubscriptionActivation ? 'Activating...' : isSaving ? 'Saving...' : 'Confirm'}</span>
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
  //isInductionCompleted,
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
          console.error(`Error fetching induction steps for user ${userId}:`, error);
        })
        .finally(() => {
          setIsLoadingSteps(false);
        });
    }
  }, [isOpen, userId, dispatch]);

  const toggleStep = (stepId: string) => {
    setSteps(prevSteps =>
      prevSteps.map(step =>
        step.id === stepId
          ? {
              ...step,
              status: step.status === 'completed' ? 'pending' : 'completed',
              completedAt: step.status === 'completed' ? null : new Date().toISOString(),
              completedBy: step.status === 'completed' ? null : userId,
            }
          : step
      )
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
  const completedCount = steps?.filter(s => s.status === 'completed').length;
  const totalSteps = steps?.length || 0;
  const isInductionCompletedFromAPI = totalSteps > 0 && completedCount === totalSteps;

  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-gray-200">
      {/* Accordion Header */}
      <button
        className="flex w-full items-start justify-between bg-white px-3 py-3 transition-colors hover:bg-gray-50 sm:items-center sm:px-6 sm:py-4"
        onClick={onToggle}
      >
        <div className="flex min-w-0 flex-1 items-start space-x-2 sm:items-center sm:space-x-4">
          {/* User Avatar */}
          <div
            className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full font-semibold text-white sm:h-12 sm:w-12 ${
              isPrimary ? 'bg-blue-600' : 'bg-green-600'
            }`}
          >
            {firstName.charAt(0).toUpperCase()}
          </div>

          {/* User Info */}
          <div className="min-w-0 flex-1 text-left">
            <div className="flex flex-wrap items-center space-x-2">
              <h3 className="truncate text-sm font-semibold text-gray-900 sm:text-base">{fullName || 'N/A'}</h3>
              {isPrimary && (
                <span className="whitespace-nowrap rounded bg-blue-100 px-2 py-0.5 text-xs font-medium text-blue-700 sm:py-1">
                  Primary
                </span>
              )}
            </div>
            <p className="truncate text-xs text-gray-600 sm:text-sm">{email}</p>

            {/* Mobile Progress - shown on small screens */}
            <div className="mt-1 sm:hidden">
              <p className="text-xs font-medium text-gray-700">
                {completedCount} / {totalSteps} Steps
              </p>
              <p className={`text-xs ${isInductionCompletedFromAPI ? 'text-green-600' : 'text-orange-600'}`}>
                {isInductionCompletedFromAPI ? 'Completed' : 'In Progress'}
              </p>
            </div>
          </div>

          {/* Progress Badge - hidden on mobile */}
          <div className="hidden items-center space-x-3 sm:flex">
            <div className="text-right">
              <p className="text-sm font-medium text-gray-700">
                {completedCount} / {totalSteps} Steps
              </p>
              <p className={`text-xs ${isInductionCompletedFromAPI ? 'text-green-600' : 'text-orange-600'}`}>
                {isInductionCompletedFromAPI ? 'Completed' : 'In Progress'}
              </p>
            </div>

            {/* Chevron Icon */}
            <svg
              className={`h-5 w-5 text-gray-500 transition-transform ${isOpen ? 'rotate-180 transform' : ''}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </div>
        </div>

        {/* Chevron Icon - mobile only */}
        <svg
          className={`mt-1 h-5 w-5 flex-shrink-0 text-gray-500 transition-transform sm:hidden ${isOpen ? 'rotate-180 transform' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path d="M19 9l-7 7-7-7" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
        </svg>
      </button>

      {/* Accordion Content */}
      {isOpen && (
        <div className="border-t border-gray-200 bg-gray-50 px-3 py-3 sm:px-6 sm:py-4">
          {/* Induction Steps */}
          <div className="space-y-2">
            <div className="mb-3 flex items-center justify-between">
              <h4 className="text-xs font-semibold text-gray-700 sm:text-sm">
                Induction Steps ({totalSteps} {totalSteps === 1 ? 'Step' : 'Steps'})
              </h4>
            </div>

            {isLoadingSteps ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <div className="flex items-center justify-center space-x-2">
                  <svg
                    className="h-5 w-5 animate-spin text-blue-600"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    ></path>
                  </svg>
                  <span className="text-sm text-gray-600">Loading induction steps...</span>
                </div>
              </div>
            ) : totalSteps === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white p-4">
                <p className="text-center text-sm text-gray-600">No induction steps found</p>
              </div>
            ) : (
              steps.map((step, index) => {
                const isCompleted = step.status === 'completed';
                // Check if the step was originally completed in the API response
                const originalStep = originalSteps.find(s => s.id === step.id);
                const isOriginallyCompleted = originalStep?.status === 'completed';
                return (
                  <div
                    key={step.id}
                    className={`rounded-lg border-2 p-3 transition-all sm:p-4 ${
                      isCompleted ? 'border-green-300 bg-green-50' : 'border-gray-200 bg-white'
                    }`}
                  >
                    <div className="flex items-start space-x-2 sm:space-x-3">
                      {/* Checkbox */}
                      <div className="flex-shrink-0 pt-1">
                        <input
                          checked={isCompleted}
                          className={`h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 sm:h-5 sm:w-5 ${
                            isOriginallyCompleted ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                          }`}
                          disabled={isOriginallyCompleted}
                          id={`step-${userId}-${step.id}`}
                          type="checkbox"
                          onChange={() => toggleStep(step.id)}
                        />
                      </div>

                      {/* Step Content */}
                      <div className="min-w-0 flex-1">
                        <div className={isCompleted ? '' : 'cursor-pointer'}>
                          <div className="mb-1 flex flex-wrap items-center space-x-2">
                            <span
                              className={`whitespace-nowrap rounded px-2 py-0.5 text-xs font-semibold ${
                                isCompleted ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'
                              }`}
                            >
                              Step {index + 1}
                            </span>
                            <h5
                              className={`text-sm font-semibold sm:text-base ${
                                isCompleted ? 'text-green-900' : 'text-gray-900'
                              }`}
                            >
                              {formatStepTitle(step.id)}
                            </h5>
                          </div>
                          {step.completedAt && (
                            <p className="mt-1 text-xs text-gray-500">
                              Completed: {formatDateTimeChicago(step.completedAt)}
                            </p>
                          )}
                        </div>
                      </div>

                      {/* Completion Icon */}
                      {isCompleted && (
                        <svg
                          className="h-5 w-5 flex-shrink-0 text-green-600 sm:h-6 sm:w-6"
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path
                            clipRule="evenodd"
                            d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                            fillRule="evenodd"
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
          {data?.status !== 'completed' && (
            <div className="mt-4 flex justify-stretch sm:mt-6 sm:justify-end">
              <button
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:px-6 ${
                  isSaving || isSubscriptionActivation
                    ? 'cursor-not-allowed bg-blue-400'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
                disabled={isSaving || isSubscriptionActivation}
                onClick={handleSaveClick}
              >
                {isSaving && (
                  <svg
                    className="h-4 w-4 animate-spin text-white"
                    fill="none"
                    viewBox="0 0 24 24"
                    xmlns="http://www.w3.org/2000/svg"
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
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                      fill="currentColor"
                    ></path>
                  </svg>
                )}
                <span>
                  {isSubscriptionActivation ? 'Activating Subscription...' : isSaving ? 'Saving...' : 'Save Induction'}
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        isSaving={isSaving}
        isSubscriptionActivation={isSubscriptionActivation}
        onClose={handleCancelSave}
        onConfirm={handleConfirmSave}
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
  const [openAccordions, setOpenAccordions] = useState<string[]>([selectedInduction?.userId || '']);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const data = selectedInduction;
  const navigate = useNavigate();

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  const toggleAccordion = (userId: string) => {
    setOpenAccordions(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]));
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
      .then(response => {
        toast.success('Induction steps saved successfully!');
        // Check if all 5 steps are completed
        const completedSteps = response?.data?.subSteps?.filter((s: any) => s.status === 'completed').length;
        const totalSteps = response?.data?.subSteps?.length;

        if (response?.status === 'success' && completedSteps === 5 && completedSteps === totalSteps) {
          dispatch(
            activateUserSubscription({
              userId,
              adminId: user?.userId || '',
              adminName: `${user?.firstName} ${user?.lastName}`,
            })
          )
            .then(response => {
              if (response?.payload?.status === 'error') {
                toast.error(response?.payload?.message, { duration: 5000 });
              } else {
                toast.success('Subscription activated successfully!');
              }
            })
            .catch(error => {
              console.log(error);
              toast.error(`Failed to activate subscription: ${error}`);
            });
        }
      })
      .catch(error => {
        toast.error(`Failed to save induction steps: ${error}`);
      })
      .finally(() => {
        dispatch(getInductionStepsDetails({ userId }));
        // Clear loading state
        setSavingUserId(null);
      });
  };

  const formatOnboardingType = (type: string) => {
    if (type === 'someoneelse') return 'Someone Else';
    if (type === 'individual') return 'Individual';
    if (type === 'family') return 'Family';
    return type;
  };

  return (
    <div className="mx-auto w-full p-3 sm:p-4 md:p-6">
      {/* Header Section */}
      <SectionTitle
        description="Manage and track induction progress for all participants"
        inputPlaceholder=""
        search={false}
        title="View Induction"
        value=""
        onBackClick={() => navigate('/induction')}
        onSearch={() => {
          console.log('search clicked');
        }}
      />

      {/* Booking Information Card */}
      <div className="mb-4 rounded-lg bg-white p-4 shadow-md sm:mb-6 sm:p-6">
        <div className="mb-3 flex items-center justify-between sm:mb-4">
          <h2 className="mb-3 text-lg font-semibold text-gray-900 sm:mb-4 sm:text-xl">Booking Information</h2>
        </div>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
          <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
            <p className="mb-1 text-xs text-gray-600 sm:text-sm">Booking Code</p>
            <p className="break-all text-sm font-semibold text-gray-900 sm:text-base">{data?.bookingCode || 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
            <p className="mb-1 text-xs text-gray-600 sm:text-sm">Onboarding Type</p>
            <p className="text-sm font-semibold text-gray-900 sm:text-base">
              {formatOnboardingType(data?.onboardingType || '')}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
            <p className="mb-1 text-xs text-gray-600 sm:text-sm">Facility Code</p>
            <p className="break-all text-sm font-semibold text-gray-900 sm:text-base">{data?.facilityCode || 'N/A'}</p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
            <p className="mb-1 text-xs text-gray-600 sm:text-sm">Status</p>
            <span
              className={`inline-block rounded-full px-2.5 py-0.5 text-xs font-medium sm:px-3 sm:py-1 sm:text-sm ${
                data?.status === 'confirmed' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
              }`}
            >
              {data?.status?.charAt(0).toUpperCase() + (data?.status?.slice(1) || '')}
            </span>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
            <p className="mb-1 text-xs text-gray-600 sm:text-sm">Time Slot</p>
            <p className="text-xs font-semibold text-gray-900 sm:text-sm">
              {formatTimeRangeChicago(data?.timeSlot?.startTime, data?.timeSlot?.endTime)}
            </p>
          </div>
          <div className="rounded-lg bg-gray-50 p-3 sm:p-4">
            <p className="mb-1 text-xs text-gray-600 sm:text-sm">Date</p>
            <p className="text-xs font-semibold text-gray-900 sm:text-sm">
              {formatDateChicago(data?.timeSlot?.startTime)}
            </p>
          </div>
        </div>
      </div>

      {/* Participants Section */}
      <div className="rounded-lg bg-white p-4 shadow-md sm:p-6">
        <div className="mb-3 sm:mb-4">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">Participants</h2>
          <p className="mt-1 text-xs text-gray-600 sm:text-sm">
            Total: {1 + (data?.members?.length || 0)} participant(s)
          </p>
        </div>

        {/* Primary User Accordion */}
        <div className="mb-4">
          <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-700 sm:text-sm">Primary User</h3>
          <AccordionItem
            data={data}
            dispatch={dispatch}
            email={data?.email || ''}
            firstName={data?.firstName || ''}
            isInductionCompleted={data?.isInductionCompleted || false}
            isOpen={openAccordions.includes(data?.userId || '')}
            isPrimary={true}
            isSaving={savingUserId === data?.userId}
            isSubscriptionActivation={members?.isSubscriptionActivation}
            lastName={data?.lastName || ''}
            userId={data?.userId || ''}
            onSaveInduction={handleSaveInduction}
            onToggle={() => toggleAccordion(data?.userId || '')}
          />
        </div>

        {/* Secondary Users (Members) */}
        {data?.members && data?.members?.length > 0 && (
          <div>
            <h3 className="mb-2 text-xs font-medium uppercase tracking-wide text-gray-700 sm:text-sm">
              Additional Members ({data?.members?.length || 0})
            </h3>
            {data.members.map(member => (
              <AccordionItem
                key={member.userId}
                data={data}
                dispatch={dispatch}
                email={member.email}
                firstName={member.firstName}
                isInductionCompleted={member.isInductionCompleted}
                isOpen={openAccordions.includes(member.userId)}
                isPrimary={false}
                isSaving={savingUserId === member.userId}
                isSubscriptionActivation={members?.isSubscriptionActivation}
                lastName={member.lastName}
                userId={member.userId}
                onSaveInduction={handleSaveInduction}
                onToggle={() => toggleAccordion(member.userId)}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default ViewInduction;
