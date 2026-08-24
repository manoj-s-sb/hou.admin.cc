import { useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';

export interface AddLeadFormValues {
  name: string;
  email: string;
  phone: string;
  planInterest: string;
}

interface AddLeadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSubmit: (values: AddLeadFormValues) => void;
  isSubmitting: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLAN_OPTIONS = [
  { value: '', label: 'No preference' },
  { value: 'standard', label: 'Standard' },
  { value: 'premium', label: 'Premium' },
  { value: 'family', label: 'Family' },
  { value: 'offpeak', label: 'Offpeak' },
];

const AddLeadModal = ({ isOpen, onClose, onSubmit, isSubmitting }: AddLeadModalProps) => {
  const [values, setValues] = useState<AddLeadFormValues>({ name: '', email: '', phone: '', planInterest: '' });
  const [errors, setErrors] = useState<{ name?: string; email?: string }>({});

  if (!isOpen) return null;

  const handleChange = (key: keyof AddLeadFormValues, value: string) => {
    setValues(prev => ({ ...prev, [key]: value }));
  };

  const handleSubmit = () => {
    const nextErrors: { name?: string; email?: string } = {};
    if (!values.name.trim()) nextErrors.name = 'Name is required';
    if (!values.email.trim()) {
      nextErrors.email = 'Email is required';
    } else if (!EMAIL_REGEX.test(values.email.trim())) {
      nextErrors.email = 'Enter a valid email address';
    }

    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    onSubmit({
      name: values.name.trim(),
      email: values.email.trim(),
      phone: values.phone.trim(),
      planInterest: values.planInterest,
    });
  };

  const handleClose = () => {
    setValues({ name: '', email: '', phone: '', planInterest: '' });
    setErrors({});
    onClose();
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900">Add Lead</h3>
          <button
            aria-label="Close"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={handleClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="space-y-4 p-6">
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600" htmlFor="lead-name">
              Name*
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="lead-name"
              type="text"
              value={values.name}
              onChange={e => handleChange('name', e.target.value)}
            />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600" htmlFor="lead-email">
              Email*
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="lead-email"
              type="email"
              value={values.email}
              onChange={e => handleChange('email', e.target.value)}
            />
            {errors.email && <p className="mt-1 text-xs text-red-600">{errors.email}</p>}
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600" htmlFor="lead-phone">
              Phone
            </label>
            <input
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="lead-phone"
              type="tel"
              value={values.phone}
              onChange={e => handleChange('phone', e.target.value)}
            />
          </div>

          <div>
            <label className="mb-1 block text-sm font-medium text-gray-600" htmlFor="lead-plan">
              Plan interest
            </label>
            <select
              className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              id="lead-plan"
              value={values.planInterest}
              onChange={e => handleChange('planInterest', e.target.value)}
            >
              {PLAN_OPTIONS.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="flex justify-end gap-3 border-t border-gray-100 p-6 pt-4">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleClose}
          >
            Cancel
          </button>
          <button
            className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting && <LoaderSpinner className="text-white" size="xs" />}
            Add Lead
          </button>
        </div>
      </div>
    </div>
  );
};

export default AddLeadModal;
