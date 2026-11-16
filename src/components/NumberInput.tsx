import React, { useEffect, useRef, useState } from 'react';

/**
 * Controlled number input that fixes the classic "stuck leading 0 / can't
 * backspace" bug. It keeps a local string draft so the field can be cleared
 * and edited freely (including removing a leading 0), while still emitting a
 * clamped numeric value to the parent. When left blank it shows empty during
 * editing and normalises to `emptyValue` (default = min ?? 0) on blur.
 */
interface Props extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'value' | 'onChange' | 'type'> {
  /** `null` means "not yet entered" — shown blank, same as an empty draft. */
  value: number | null;
  onValueChange: (n: number) => void;
  min?: number;
  max?: number;
  /** Value emitted/shown when the field is left blank. Defaults to min ?? 0. */
  emptyValue?: number;
}

const NumberInput: React.FC<Props> = ({ value, onValueChange, min, max, emptyValue, onBlur, ...rest }) => {
  const fallback = emptyValue ?? min ?? 0;
  const [draft, setDraft] = useState<string>(Number.isFinite(value) ? String(value) : '');
  // What WE last told the parent via onValueChange — lets the sync effect
  // below tell "the parent just echoed back our own edit" (ignore it, so
  // clearing the field doesn't get immediately overwritten by the fallback
  // value we ourselves emitted) apart from "the parent changed `value` on its
  // own" (e.g. a parent effect prefilling real saved data onto a field that
  // already mounted blank before that data was ready) — which must always
  // resync the draft, even while draft is currently empty. Previously this
  // only checked `draft === ''`, which blocked that second case forever.
  const lastEmitted = useRef<number | null>(Number.isFinite(value) ? (value as number) : null);

  useEffect(() => {
    if (value === lastEmitted.current) return;
    lastEmitted.current = value;
    setDraft(Number.isFinite(value) ? String(value) : '');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value]);

  const clamp = (n: number): number => {
    let r = n;
    if (min !== undefined) r = Math.max(min, r);
    if (max !== undefined) r = Math.min(max, r);
    return r;
  };

  return (
    <input
      {...rest}
      max={max}
      min={min}
      type="number"
      value={draft}
      onBlur={e => {
        if (draft === '') {
          setDraft(String(fallback));
          lastEmitted.current = fallback;
          onValueChange(fallback);
        } else {
          const n = clamp(Number(draft));
          setDraft(String(n));
          lastEmitted.current = n;
          onValueChange(n);
        }
        onBlur?.(e);
      }}
      onChange={e => {
        const next = e.target.value;
        setDraft(next);
        if (next === '') {
          lastEmitted.current = fallback;
          onValueChange(fallback); // keep the model valid; field still shows empty
        } else {
          const n = Number(next);
          if (!Number.isNaN(n)) {
            lastEmitted.current = n;
            onValueChange(n); // don't clamp mid-type (allows typing "1" before "10")
          }
        }
      }}
    />
  );
};

export default NumberInput;
