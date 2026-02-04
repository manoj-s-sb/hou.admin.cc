import { LoaderSpinner } from '../../../components/Loader';

interface ConfirmationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isSaving: boolean;
  isSubscriptionActivation: boolean;
  title?: string;
  message?: string;
  confirmButtonText?: string;
  confirmButtonColor?: 'blue' | 'green';
}

const ConfirmationModal = ({
  isOpen,
  onClose,
  onConfirm,
  isSaving,
  isSubscriptionActivation,
  title = 'Confirm Changes',
  message = 'Are you sure you want to save these induction changes?',
  confirmButtonText = 'Confirm',
  confirmButtonColor = 'blue',
}: ConfirmationModalProps) => {
  if (!isOpen) return null;

  const buttonColorClasses =
    confirmButtonColor === 'green' ? 'bg-green-600 hover:bg-green-700' : 'bg-blue-600 hover:bg-blue-700';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="mx-4 w-full max-w-md rounded-lg bg-white shadow-xl">
        <div className="p-6">
          <h3 className="mb-2 text-center text-lg font-semibold text-gray-900">{title}</h3>
          <p className="mb-6 text-center text-sm text-gray-600">{message}</p>
          <div className="flex space-x-3">
            <button
              className="flex-1 rounded-lg border border-gray-300 px-4 py-2 text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
              disabled={isSaving || isSubscriptionActivation}
              onClick={onClose}
            >
              Cancel
            </button>
            <button
              className={`flex flex-1 items-center justify-center space-x-2 rounded-lg px-4 py-2 text-white transition-colors disabled:cursor-not-allowed disabled:opacity-50 ${buttonColorClasses}`}
              disabled={isSaving || isSubscriptionActivation}
              onClick={onConfirm}
            >
              {(isSaving || isSubscriptionActivation) && (
                <LoaderSpinner className="text-white" size="xs" />
              )}
              <span>
                {isSaving && isSubscriptionActivation
                  ? 'Activating...'
                  : isSaving
                    ? 'Saving...'
                    : isSubscriptionActivation
                      ? 'Activating...'
                      : confirmButtonText}
              </span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ConfirmationModal;
