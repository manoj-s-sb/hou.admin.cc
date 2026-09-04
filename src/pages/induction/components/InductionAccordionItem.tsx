import { useState, useEffect } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { LoaderSpinner } from '../../../components/Loader';
import { getInductionStepsDetails } from '../../../store/induction/api';
import { Induction, SubStep } from '../../../store/induction/types';
import { AppDispatch } from '../../../store/store';
import { formatDateTimeChicago } from '../../../utils/dateUtils';

import ButtonLoader from './ButtonLoader';
import ConfirmationModal from './ConfirmationModal';

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
  onSaveInduction: (userId: string, steps: SubStep[]) => void;
  onActivateSubscription: (userId: string) => void;
  isSaving: boolean;
  isSubscriptionActivation: boolean;
  isActivatingSubscription: boolean;
  data: Induction | null;
  buttonLoader: boolean;
}

const InductionAccordionItem = ({
  userId,
  email,
  firstName,
  lastName,
  isInductionCompleted,
  isPrimary,
  isOpen,
  onToggle,
  onSaveInduction,
  onActivateSubscription,
  isSaving,
  isSubscriptionActivation,
  isActivatingSubscription,
  data,
  buttonLoader,
}: AccordionItemProps) => {
  const dispatch = useDispatch<AppDispatch>();
  const [steps, setSteps] = useState<SubStep[]>([]);
  const [originalSteps, setOriginalSteps] = useState<SubStep[]>([]); // Track original API data
  const [isLoadingSteps, setIsLoadingSteps] = useState(false);
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [showActivateConfirmModal, setShowActivateConfirmModal] = useState(false);
  const [prevIsSaving, setPrevIsSaving] = useState(isSaving);

  // Fetch induction steps details when accordion is opened
  useEffect(() => {
    if (isOpen && userId) {
      setIsLoadingSteps(true);
      dispatch(getInductionStepsDetails({ userId }))
        .unwrap()
        .then(data => {
          if (data) {
            setSteps(data?.data?.subSteps);
            setOriginalSteps(data?.data?.subSteps); // Store original API data
          }
        })
        .catch(error => {
          console.error(`Error fetching induction steps for user ${userId}:`, error);
        })
        .finally(() => {
          setIsLoadingSteps(false);
        });
    }
  }, [isOpen, userId, dispatch]);

  // Re-fetch steps when save completes (isSaving changes from true to false)
  useEffect(() => {
    if (prevIsSaving && !isSaving && isOpen && userId) {
      // Save just completed, refresh the steps
      setIsLoadingSteps(true);
      dispatch(getInductionStepsDetails({ userId }))
        .unwrap()
        .then(data => {
          if (data) {
            setSteps(data?.data?.subSteps);
            setOriginalSteps(data?.data?.subSteps); // Store original API data
          }
        })
        .catch(error => {
          console.error(`Error fetching induction steps for user ${userId}:`, error);
        })
        .finally(() => {
          setIsLoadingSteps(false);
        });
    }
    setPrevIsSaving(isSaving);
  }, [isSaving, isOpen, userId, dispatch, prevIsSaving]);

  const toggleStep = (stepId: string) => {
    setSteps(prevSteps => {
      // Find the index of the step being toggled
      const stepIndex = prevSteps.findIndex(step => step.id === stepId);

      // Check if this is the 5th step (index 4) and user is primary
      if (stepIndex === 4 && isPrimary) {
        // Check if trying to mark as completed
        const currentStep = prevSteps.find(step => step.id === stepId);
        if (currentStep?.status !== 'completed') {
          // Verify that steps 1-4 (indices 0-3) are all completed
          const firstFourSteps = prevSteps.slice(0, 4);
          const allFirstFourCompleted = firstFourSteps.every(step => step.status === 'completed');

          if (!allFirstFourCompleted) {
            toast.error('Please complete all previous steps before completing this step');
            return prevSteps; // Return unchanged steps
          }
        }
      }

      // Proceed with the toggle
      return prevSteps.map(step =>
        step.id === stepId
          ? {
              ...step,
              status: step.status === 'completed' ? 'pending' : 'completed',
              completedAt: step.status === 'completed' ? null : new Date().toISOString(),
              completedBy: step.status === 'completed' ? null : userId,
            }
          : step
      );
    });
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

  const handleActivateClick = () => {
    setShowActivateConfirmModal(true);
  };

  const handleConfirmActivate = () => {
    onActivateSubscription(userId);
    setShowActivateConfirmModal(false);
  };

  const handleCancelActivate = () => {
    setShowActivateConfirmModal(false);
  };

  const fullName = `${firstName} ${lastName}`.trim();

  // Calculate completion status based on actual API data
  const completedCount = steps?.filter(s => s.status === 'completed').length;
  const totalSteps = steps?.length || 0;
  const isInductionCompletedFromAPI = totalSteps > 0 && completedCount === totalSteps;

  // Check if steps have been modified (local changes to save)
  const hasLocalChanges =
    steps.length === originalSteps.length &&
    steps.some(step => {
      const orig = originalSteps.find(s => s.id === step.id);
      return orig ? orig.status !== step.status : true;
    });

  // Save button: disabled when no check selected, no local changes, or while saving
  const isSaveDisabled = isSaving || completedCount === 0 || !hasLocalChanges;

  // The primary member's "Save Induction"/"Activate Subscription" actions only make
  // sense while their membership is still awaiting activation — i.e. subscriptionStatus
  // is 'pendingactivation' (payment confirmed, induction not yet done) or 'inactive',
  // or the field is missing/null entirely. Once it's active, cancelled, paused, or
  // past_due there's nothing left to activate, so the buttons must stay hidden —
  // checking only `!== 'active'` let 'paused'/'canceled'/'past_due' through too.
  const PENDING_MEMBERSHIP_STATUSES = new Set(['pendingactivation', 'inactive']);
  const showPrimaryActions =
    isPrimary && (!data?.subscriptionStatus || PENDING_MEMBERSHIP_STATUSES.has(data.subscriptionStatus));
  // Whether the primary member's subscription has actually been activated (as opposed to
  // just having all induction steps checked off — those are two separate things).
  const isSubscriptionActivated =
    Boolean(data?.subscriptionStatus) && !PENDING_MEMBERSHIP_STATUSES.has(data?.subscriptionStatus ?? '');

  // Three-tier progress, not just done/not-done: steps can be fully checked off ("Save
  // Induction" done) while the primary member's subscription is still awaiting activation —
  // that's "Partial Completed", distinct from "Completed" (subscription actually active).
  // Non-primary members have no activation step, so steps-done is simply "Completed" for them.
  const progressStatus: 'in_progress' | 'partial_completed' | 'completed' = !isInductionCompletedFromAPI
    ? 'in_progress'
    : isPrimary && !isSubscriptionActivated
      ? 'partial_completed'
      : 'completed';
  const PROGRESS_STATUS_META: Record<typeof progressStatus, { label: string; cls: string }> = {
    in_progress: { label: 'In Progress', cls: 'text-orange-600' },
    partial_completed: { label: 'Partial Completed', cls: 'text-amber-600' },
    completed: { label: 'Completed', cls: 'text-green-600' },
  };

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

            {/* Mobile Progress - shown on small screens, only for primary members or when accordion is open */}
            {(isPrimary || isOpen) && (
              <div className="mt-1 sm:hidden">
                <p className="text-xs font-medium text-gray-700">
                  {completedCount} / {totalSteps} Steps
                </p>
                <p className={`text-xs ${PROGRESS_STATUS_META[progressStatus].cls}`}>
                  {PROGRESS_STATUS_META[progressStatus].label}
                </p>
              </div>
            )}
          </div>

          {/* Progress Badge - hidden on mobile, only for primary members or when accordion is open */}
          <div className="hidden items-center space-x-3 sm:flex">
            {(isPrimary || isOpen) && (
              <div className="text-right">
                <p className="text-sm font-medium text-gray-700">
                  {completedCount} / {totalSteps} Steps
                </p>
                <p className={`text-xs ${PROGRESS_STATUS_META[progressStatus].cls}`}>
                  {PROGRESS_STATUS_META[progressStatus].label}
                </p>
              </div>
            )}

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
                  <LoaderSpinner className="text-blue-600" size="sm" />
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

          {/* Action Buttons */}

          <div className="mt-4 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:justify-end">
            {/* Save Induction Button */}
            {showPrimaryActions && (
              <button
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:px-6 ${
                  isSaveDisabled ? 'cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
                disabled={isSaveDisabled}
                onClick={handleSaveClick}
              >
                {isSaving && <ButtonLoader />}
                <span>{isSaving ? 'Saving...' : 'Save Induction'}</span>
              </button>
            )}
            {isInductionCompleted === false && !isPrimary && (
              <button
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:px-6 ${
                  isSaveDisabled ? 'cursor-not-allowed bg-blue-400' : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
                disabled={isSaveDisabled}
                onClick={handleSaveClick}
              >
                {isSaving && <ButtonLoader />}
                <span>{isSaving ? 'Saving...' : 'Save Induction'}</span>
              </button>
            )}
            {/* Activate Subscription Button - only while membership is still pending activation.
                Light green at rest, brightening to a stronger green on hover — a muted gray
                while disabled (steps not done yet) keeps that state visually distinct from
                "ready to activate". */}
            {showPrimaryActions && (
              <button
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto sm:px-6 ${
                  data?.status !== 'completed' || isActivatingSubscription || isSaving || buttonLoader
                    ? 'cursor-not-allowed bg-gray-300 text-gray-500'
                    : 'bg-green-400 hover:bg-green-600 hover:shadow-lg'
                }`}
                disabled={data?.status !== 'completed' || isActivatingSubscription || isSaving || buttonLoader}
                title={data?.status !== 'completed' ? 'Complete all the induction steps to activate subscription' : ''}
                onClick={handleActivateClick}
              >
                {isActivatingSubscription && <ButtonLoader />}
                <span>{isActivatingSubscription ? 'Activating...' : 'Activate Subscription'}</span>
              </button>
            )}
            {/* Once activated, replace the action row with a green confirmation instead of
                just leaving the space empty. */}
            {isPrimary && isSubscriptionActivated && (
              <span className="inline-flex w-full items-center justify-center gap-1.5 rounded-lg bg-green-50 px-4 py-2.5 text-sm font-semibold text-green-700 sm:w-auto sm:px-6">
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    clipRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                    fillRule="evenodd"
                  />
                </svg>
                Activated
              </span>
            )}
          </div>
        </div>
      )}

      {/* Confirmation Modal for Save Induction */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        isSaving={isSaving}
        isSubscriptionActivation={isSubscriptionActivation}
        onClose={handleCancelSave}
        onConfirm={handleConfirmSave}
      />

      {/* Confirmation Modal for Activate Subscription */}
      <ConfirmationModal
        confirmButtonColor="green"
        confirmButtonText="Activate"
        isOpen={showActivateConfirmModal}
        isSaving={isSaving}
        isSubscriptionActivation={isActivatingSubscription}
        message="Are you sure you want to activate this subscription?"
        title="Confirm Activation"
        onClose={handleCancelActivate}
        onConfirm={handleConfirmActivate}
      />
    </div>
  );
};

export default InductionAccordionItem;
