import { useState, useEffect } from 'react';

import { toast } from 'react-hot-toast';

import { getInductionStepsDetails } from '../../../store/induction/api';
import { SubStep } from '../../../store/induction/types';
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
  dispatch: any;
  onSaveInduction: (userId: string, steps: SubStep[]) => void;
  onActivateSubscription: (userId: string) => void;
  isSaving: boolean;
  isSubscriptionActivation: boolean;
  isActivatingSubscription: boolean;
  data: any;
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
  dispatch,
  onSaveInduction,
  onActivateSubscription,
  isSaving,
  isSubscriptionActivation,
  isActivatingSubscription,
  data,
  buttonLoader,
}: AccordionItemProps) => {
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

  // Re-fetch steps when save completes (isSaving changes from true to false)
  useEffect(() => {
    if (prevIsSaving && !isSaving && isOpen && userId) {
      // Save just completed, refresh the steps
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

          {/* Action Buttons */}

          <div className="mt-4 flex flex-col gap-3 sm:mt-6 sm:flex-row sm:justify-end">
            {/* Save Induction Button */}
            {isPrimary && data.subscriptionStatus !== 'active' && (
              <button
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:px-6 ${
                  isInductionCompleted || isSaving
                    ? 'cursor-not-allowed bg-blue-400'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
                disabled={isInductionCompleted || isSaving}
                onClick={handleSaveClick}
              >
                {isSaving && <ButtonLoader />}
                <span>{isSaving ? 'Saving...' : 'Save Induction'}</span>
              </button>
            )}
            {isInductionCompleted === false && !isPrimary && (
              <button
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 sm:w-auto sm:px-6 ${
                  isInductionCompleted || isSaving
                    ? 'cursor-not-allowed bg-blue-400'
                    : 'bg-blue-600 hover:bg-blue-700 hover:shadow-lg'
                }`}
                disabled={isInductionCompleted || isSaving}
                onClick={handleSaveClick}
              >
                {isSaving && <ButtonLoader />}
                <span>{isSaving ? 'Saving...' : 'Save Induction'}</span>
              </button>
            )}
            {/* Activate Subscription Button - Hide when status is completed and subscriptionStatus is active */}
            {isPrimary && data.subscriptionStatus !== 'active' && (
              <button
                className={`flex w-full items-center justify-center space-x-2 rounded-lg px-4 py-2.5 text-sm font-semibold text-white shadow-md transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 sm:w-auto sm:px-6 ${
                  data?.status !== 'completed' || isActivatingSubscription || isSaving || buttonLoader
                    ? 'cursor-not-allowed bg-green-400'
                    : 'bg-green-600 hover:bg-green-700 hover:shadow-lg'
                }`}
                disabled={data?.status !== 'completed' || isActivatingSubscription || isSaving || buttonLoader}
                title={data?.status !== 'completed' ? 'Complete all the induction steps to activate subscription' : ''}
                onClick={handleActivateClick}
              >
                {isActivatingSubscription && <ButtonLoader />}
                <span>{isActivatingSubscription ? 'Activating...' : 'Activate Subscription'}</span>
              </button>
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
