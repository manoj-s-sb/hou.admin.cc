import { useState, useEffect } from 'react';

import { toast } from 'react-hot-toast';
import { useSelector, useDispatch } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';

import SectionTitle from '../../components/SectionTitle';
import { getInductionStepsDetails, updateInductionSteps, userInductionDetails } from '../../store/induction/api';
import { SubStep } from '../../store/induction/types';
import { activateUserSubscription } from '../../store/members/api';
import { RootState, AppDispatch } from '../../store/store';
import { formatDateChicago, formatTimeRangeChicago } from '../../utils/dateUtils';

import InductionAccordionItem from './components/InductionAccordionItem';

const ViewInduction = () => {
  const { members, induction } = useSelector((state: RootState) => {
    return {
      members: state.members,
      induction: state.induction,
    };
  });

  const dispatch = useDispatch<AppDispatch>();
  const navigate = useNavigate();
  const { userId } = useParams<{ userId: string | any }>();

  const [data, setData] = useState<any>(induction?.userInductionDetails);

  useEffect(() => {
    setData(induction?.userInductionDetails);
  }, [induction?.userInductionDetails]);

  const [isLoadingInduction, setIsLoadingInduction] = useState(true);
  const [openAccordions, setOpenAccordions] = useState<string[]>([]);
  const [savingUserId, setSavingUserId] = useState<string | null>(null);
  const [activatingUserId, setActivatingUserId] = useState<string | null>(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');

  // Fetch user induction details when component mounts
  useEffect(() => {
    if (userId) {
      setIsLoadingInduction(true);
      dispatch(userInductionDetails({ userId }))
        .unwrap()
        .then((response: any) => {
          if (response?.data) {
            setOpenAccordions([response.data?.userId || '']);
          }
        })
        .catch((error: any) => {
          console.error('Error fetching user induction details:', error);
          toast.error('Failed to load induction details');
        })
        .finally(() => {
          setIsLoadingInduction(false);
        });
    }
  }, [userId, dispatch]);

  const toggleAccordion = (userId: string) => {
    setOpenAccordions(prev => (prev.includes(userId) ? prev.filter(id => id !== userId) : [...prev, userId]));
  };

  const handleSaveInduction = (userIds: string, steps: SubStep[]) => {
    // Set loading state for this specific user

    console.log('userId', userId);
    setSavingUserId(userIds);

    // Filter steps to send only id and status fields
    const filteredSteps = steps.map(({ id, status }) => ({
      id,
      status,
    }));

    // Dispatch the API call with userId and filtered substeps
    dispatch(updateInductionSteps({ userId: userIds, subSteps: filteredSteps }))
      .unwrap()
      .then(() => {
        dispatch(userInductionDetails({ userId }));
        toast.success('Induction steps saved successfully!');
      })
      .catch(error => {
        // Display the error message from the API
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to save induction steps';
        toast.error(errorMessage);
      })
      .finally(() => {
        dispatch(getInductionStepsDetails({ userId: userIds }));
        // Clear loading state
        setSavingUserId(null);
      });
  };

  const handleActivateSubscription = (userId: string) => {
    // Set loading state for this specific user
    setActivatingUserId(userId);

    dispatch(
      activateUserSubscription({
        userId,
        adminId: user?.userId || '',
        adminName: `${user?.firstName} ${user?.lastName}`,
      })
    )
      .unwrap()
      .then(() => {
        toast.success('Subscription activated successfully!');
        // Refresh induction details to get updated subscription status
        dispatch(userInductionDetails({ userId }));
      })
      .catch(error => {
        // Display the error message from the API
        const errorMessage = typeof error === 'string' ? error : error?.message || 'Failed to activate subscription';
        toast.error(errorMessage);
      })
      .finally(() => {
        // Clear loading state
        setActivatingUserId(null);
      });
  };

  const formatOnboardingType = (type: string) => {
    if (type === 'someoneelse') return 'Someone Else';
    if (type === 'individual') return 'Individual';
    if (type === 'family') return 'Family';
    return type;
  };

  // Show loading state while fetching induction details
  if (isLoadingInduction) {
    return (
      <div className="mx-auto w-full p-3 sm:p-4 md:p-6">
        <SectionTitle
          description="Manage and track induction progress for all participants"
          inputPlaceholder=""
          search={false}
          title="View Induction"
          value=""
          onBackClick={() => navigate('/induction')}
          onSearch={() => undefined}
        />
        <div className="flex items-center justify-center rounded-lg bg-white p-12 shadow-md">
          <div className="flex flex-col items-center space-y-4">
            <svg
              className="h-12 w-12 animate-spin text-blue-600"
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
            <p className="text-gray-600">Loading induction details...</p>
          </div>
        </div>
      </div>
    );
  }

  // Show error state if no data is available
  if (!data) {
    return (
      <div className="mx-auto w-full p-3 sm:p-4 md:p-6">
        <SectionTitle
          description="Manage and track induction progress for all participants"
          inputPlaceholder=""
          search={false}
          title="View Induction"
          value=""
          onBackClick={() => navigate('/induction')}
          onSearch={() => undefined}
        />
        <div className="rounded-lg bg-white p-12 shadow-md">
          <div className="text-center">
            <p className="text-lg text-gray-600">No induction details found</p>
            <button
              className="mt-4 rounded-lg bg-blue-600 px-6 py-2 text-white hover:bg-blue-700"
              onClick={() => navigate('/induction')}
            >
              Back to Inductions
            </button>
          </div>
        </div>
      </div>
    );
  }

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
        onSearch={() => undefined}
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
                data?.status === 'confirmed' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'
              }`}
            >
              {data?.status === 'confirmed'
                ? 'Pending'
                : data?.status?.charAt(0).toUpperCase() + (data?.status?.slice(1) || '')}
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
          <InductionAccordionItem
            buttonLoader={induction?.isLoading}
            data={data}
            dispatch={dispatch}
            email={data?.email || ''}
            firstName={data?.firstName || ''}
            isActivatingSubscription={activatingUserId === data?.userId}
            isInductionCompleted={data?.isInductionCompleted || false}
            isOpen={openAccordions.includes(data?.userId || '')}
            isPrimary={true}
            isSaving={savingUserId === data?.userId}
            isSubscriptionActivation={members?.isSubscriptionActivation}
            lastName={data?.lastName || ''}
            userId={data?.userId || ''}
            onActivateSubscription={handleActivateSubscription}
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
            {data.members.map((member: any) => (
              <InductionAccordionItem
                key={member.userId}
                buttonLoader={induction?.isLoading}
                data={data}
                dispatch={dispatch}
                email={member.email}
                firstName={member.firstName}
                isActivatingSubscription={activatingUserId === member.userId}
                isInductionCompleted={member.isInductionCompleted}
                isOpen={openAccordions.includes(member.userId)}
                isPrimary={false}
                isSaving={savingUserId === member.userId}
                isSubscriptionActivation={members?.isSubscriptionActivation}
                lastName={member.lastName}
                userId={member.userId}
                onActivateSubscription={handleActivateSubscription}
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
