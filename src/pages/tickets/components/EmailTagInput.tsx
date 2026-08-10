import React, { useState } from 'react';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const defaultFieldClass =
  'w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-[13px] text-gray-700 outline-none transition focus:border-[#21295A] focus:bg-white focus:ring-2 focus:ring-[#21295A]/10';
const defaultLabelClass = 'mb-1 block text-[11px] font-semibold uppercase tracking-wider text-gray-400';

interface Props {
  emails: string[];
  onChange: (emails: string[]) => void;
  label?: string;
  placeholder?: string;
  fieldClass?: string;
  labelClass?: string;
}

/** Type an email, press Enter (or click Add), get a removable chip below. No new
 *  dependency — built from the same input/chip primitives the tickets forms already use. */
const EmailTagInput: React.FC<Props> = ({
  emails,
  onChange,
  label = 'Notify additional recipients (optional)',
  placeholder = 'Enter an email and press Enter…',
  fieldClass = defaultFieldClass,
  labelClass = defaultLabelClass,
}) => {
  const [value, setValue] = useState('');
  const [error, setError] = useState('');

  const addEmail = () => {
    const trimmed = value.trim();
    if (!trimmed) return;
    if (!EMAIL_RE.test(trimmed)) {
      setError('Enter a valid email address');
      return;
    }
    if (emails.some(e => e.toLowerCase() === trimmed.toLowerCase())) {
      setError('That email is already added');
      return;
    }
    onChange([...emails, trimmed]);
    setValue('');
    setError('');
  };

  const removeEmail = (email: string) => onChange(emails.filter(e => e !== email));

  return (
    <div>
      <span className={labelClass}>{label}</span>
      <div className="flex gap-2">
        <input
          className={fieldClass}
          placeholder={placeholder}
          type="text"
          value={value}
          onChange={e => {
            setValue(e.target.value);
            if (error) setError('');
          }}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              addEmail();
            }
          }}
        />
        <button
          className="shrink-0 rounded-lg border border-gray-200 bg-white px-3 py-2 text-[12px] font-semibold text-gray-600 transition hover:bg-gray-50"
          type="button"
          onClick={addEmail}
        >
          Add
        </button>
      </div>
      {error && <p className="mt-1 text-[11px] text-red-500">{error}</p>}
      {emails.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1.5">
          {emails.map(email => (
            <span
              key={email}
              className="inline-flex items-center gap-1.5 rounded-full border border-[#9096be] bg-[#ecedf4] py-1 pl-2.5 pr-1.5 text-xs font-medium text-[#21295a]"
            >
              {email}
              <button
                aria-label={`Remove ${email}`}
                className="flex h-3.5 w-3.5 items-center justify-center rounded-full text-[#21295a]/70 hover:text-[#21295a]"
                type="button"
                onClick={() => removeEmail(email)}
              >
                ×
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  );
};

export default EmailTagInput;
