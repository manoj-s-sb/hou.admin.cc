import React, { useState } from 'react';

import { INPUT_CLASS, LABEL_CLASS } from '../utils';

interface PasswordFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
}

const EyeOpenIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M1 12s4-7 11-7 11 7 11 7-4 7-11 7S1 12 1 12z"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    />
    <circle cx={12} cy={12} r={3} strokeWidth={1.8} />
  </svg>
);

const EyeClosedIcon = () => (
  <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path
      d="M3 3l18 18M10.5 10.5a3 3 0 004.243 4.243M9.88 4.62A10.6 10.6 0 0112 4.5c5 0 9.27 3.11 11 7.5a11.6 11.6 0 01-4.06 5.06M6.1 6.1A11.6 11.6 0 001 12c1.73 4.39 6 7.5 11 7.5 1.45 0 2.84-.26 4.12-.74"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth={1.8}
    />
  </svg>
);

const PasswordField: React.FC<PasswordFieldProps> = ({ id, label, value, onChange }) => {
  const [visible, setVisible] = useState(false);

  return (
    <div>
      <label className={LABEL_CLASS} htmlFor={id}>
        {label}
      </label>
      <div className="relative">
        <input
          className={`${INPUT_CLASS} pr-10`}
          id={id}
          type={visible ? 'text' : 'password'}
          value={value}
          onChange={e => onChange(e.target.value)}
        />
        <button
          aria-label={visible ? 'Hide password' : 'Show password'}
          className="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-gray-400 transition hover:text-gray-700"
          type="button"
          onClick={() => setVisible(s => !s)}
        >
          {visible ? <EyeClosedIcon /> : <EyeOpenIcon />}
        </button>
      </div>
    </div>
  );
};

export default PasswordField;
