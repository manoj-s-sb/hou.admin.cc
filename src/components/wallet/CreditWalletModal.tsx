import { useEffect, useRef, useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import endpoints from '../../constants/endpoints';
import api from '../../services';
import { AppDispatch } from '../../store/store';
import { creditWallet } from '../../store/wallet/api';
import { LoaderSpinner } from '../Loader';

const MAX_CREDIT_AMOUNT = 2500;

export interface WalletMemberOption {
  userId: string;
  name: string;
  email: string;
}

interface CreditWalletModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Called after a successful credit, e.g. to refresh a transaction list. */
  onCredited?: () => void;
  /** Skip the member-picker step entirely — used from a member's own page,
   * where the member is already known from the page's own context. */
  presetMember?: WalletMemberOption;
  /** Scopes the member-picker's search to this centre. Only needed when
   * `presetMember` is omitted. */
  facilityCode?: string;
}

const CreditWalletModal = ({ isOpen, onClose, onCredited, presetMember, facilityCode }: CreditWalletModalProps) => {
  const dispatch = useDispatch<AppDispatch>();

  // Multiple members can be selected (when there's no presetMember) so the
  // SAME amount + reason can be credited to all of them in one action —
  // there's no batch endpoint server-side, so this fires one creditWallet
  // call per member and reports an aggregate result.
  const [selectedMembers, setSelectedMembers] = useState<WalletMemberOption[]>(presetMember ? [presetMember] : []);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<WalletMemberOption[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [amount, setAmount] = useState('');
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  // Belt-and-suspenders against a double-submit: this endpoint has no
  // idempotency key server-side (unlike the booking flows), so a double-click
  // before `isSubmitting` re-renders could fire two real credits.
  const submitGuardRef = useRef(false);

  useEffect(() => {
    if (isOpen) {
      setSelectedMembers(presetMember ? [presetMember] : []);
      setQuery('');
      setResults([]);
      setAmount('');
      setReason('');
      setIsSubmitting(false);
      submitGuardRef.current = false;
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  useEffect(() => {
    if (presetMember || !query.trim() || query.trim().length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setIsSearching(true);
    const t = setTimeout(() => {
      api
        .post(endpoints.members.list, { skip: 0, limit: 8, facilityCode, search: query.trim() })
        .then(res => {
          if (cancelled) return;
          const members = res.data?.data?.members || [];
          setResults(
            members.map((m: { userId: string; firstName: string; lastName: string; email: string }) => ({
              userId: m.userId,
              name: `${m.firstName} ${m.lastName}`.trim(),
              email: m.email,
            }))
          );
        })
        .catch(() => {
          if (!cancelled) setResults([]);
        })
        .finally(() => {
          if (!cancelled) setIsSearching(false);
        });
    }, 350);
    return () => {
      cancelled = true;
      clearTimeout(t);
    };
  }, [query, facilityCode, presetMember]);

  if (!isOpen) return null;

  const parsedAmount = Number(amount);
  const canSubmit =
    selectedMembers.length > 0 &&
    amount.trim().length > 0 &&
    !Number.isNaN(parsedAmount) &&
    parsedAmount > 0 &&
    parsedAmount <= MAX_CREDIT_AMOUNT &&
    reason.trim().length >= 3 &&
    reason.trim().length <= 500;

  const handleSubmit = async () => {
    if (!canSubmit || submitGuardRef.current) return;
    submitGuardRef.current = true;
    setIsSubmitting(true);

    // No batch endpoint exists server-side — one call per selected member,
    // same amount + reason each, sequentially (not parallel) so a failure on
    // one member is easy to attribute rather than racing several writes at once.
    const results: { member: WalletMemberOption; ok: boolean }[] = [];
    for (const member of selectedMembers) {
      try {
        await dispatch(creditWallet({ userId: member.userId, amount: parsedAmount, reason: reason.trim() })).unwrap();
        results.push({ member, ok: true });
      } catch {
        results.push({ member, ok: false });
      }
    }

    const succeeded = results.filter(r => r.ok);
    const failed = results.filter(r => !r.ok);

    if (failed.length === 0) {
      toast.success(
        selectedMembers.length === 1
          ? `$${parsedAmount.toFixed(2)} credited to ${selectedMembers[0].name || selectedMembers[0].email}.`
          : `$${parsedAmount.toFixed(2)} credited to ${succeeded.length} members.`,
        { duration: 5000 }
      );
    } else {
      const failedNames = failed.map(f => f.member.name || f.member.email).join(', ');
      toast.error(`Credited ${succeeded.length} of ${selectedMembers.length}. Failed: ${failedNames}`, {
        duration: 8000,
      });
    }

    onCredited?.();
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 p-4"
      role="button"
      tabIndex={0}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl" role="dialog">
        <div className="flex items-center justify-between border-b border-[#B3DADA] bg-gradient-to-r from-[#F8FAFA] to-[#EDF5F5] px-6 py-5">
          <h2 className="text-[18px] font-semibold text-[#21295A]">Credit Wallet</h2>
          <button
            className="rounded-full p-1 text-[#21295A] transition-all hover:bg-white hover:shadow-md"
            onClick={onClose}
          >
            <svg className="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="px-6 py-6">
          {!presetMember && (
            <div className="mb-4">
              <label className="mb-1 block text-[13px] font-medium text-gray-600" htmlFor="wallet-member-search">
                Members{' '}
                <span className="font-normal text-gray-400">
                  (select one or more — the same amount is credited to each)
                </span>
              </label>

              {selectedMembers.length > 0 && (
                <div className="mb-2 space-y-1.5">
                  {selectedMembers.map(member => (
                    <div
                      key={member.userId}
                      className="flex items-center justify-between rounded-xl border border-[#B3DADA] bg-[#21295A]/5 px-4 py-2.5"
                    >
                      <div>
                        <p className="text-[13px] font-medium text-[#21295A]">{member.name}</p>
                        <p className="text-[12px] text-gray-500">{member.email}</p>
                      </div>
                      <button
                        className="text-[12px] font-medium text-gray-500 hover:text-gray-700"
                        type="button"
                        onClick={() => setSelectedMembers(prev => prev.filter(m => m.userId !== member.userId))}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              )}

              <input
                className="w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-3 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                id="wallet-member-search"
                placeholder="Search by name or email…"
                type="text"
                value={query}
                onChange={e => setQuery(e.target.value)}
              />
              {isSearching && <p className="mt-2 text-[12px] text-gray-400">Searching…</p>}
              {!isSearching && results.length > 0 && (
                <div className="mt-2 max-h-48 space-y-1 overflow-y-auto rounded-xl border border-[#B3DADA] bg-white p-1.5">
                  {results
                    .filter(member => !selectedMembers.some(m => m.userId === member.userId))
                    .map(member => (
                      <button
                        key={member.userId}
                        className="w-full rounded-lg px-3 py-2 text-left transition-all hover:bg-[#21295A]/5"
                        type="button"
                        onClick={() => {
                          setSelectedMembers(prev => [...prev, member]);
                          setQuery('');
                          setResults([]);
                        }}
                      >
                        <p className="text-[13px] font-medium text-[#21295A]">{member.name}</p>
                        <p className="text-[12px] text-gray-500">{member.email}</p>
                      </button>
                    ))}
                </div>
              )}
              {!isSearching && query.trim().length >= 2 && results.length === 0 && (
                <p className="mt-2 text-[12px] text-gray-400">No members found.</p>
              )}
            </div>
          )}

          <div className="mb-4">
            <label className="mb-1 block text-[13px] font-medium text-gray-600" htmlFor="wallet-credit-amount">
              Amount (USD) *
            </label>
            <div className="relative">
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-[14px] text-gray-400">$</span>
              <input
                className="w-full rounded-xl border border-[#B3DADA] bg-white py-3 pl-8 pr-4 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
                id="wallet-credit-amount"
                max={MAX_CREDIT_AMOUNT}
                min={0.01}
                step="0.01"
                type="number"
                value={amount}
                onChange={e => setAmount(e.target.value)}
              />
            </div>
            {parsedAmount > MAX_CREDIT_AMOUNT && (
              <p className="mt-1 text-[12px] text-red-500">
                Capped at ${MAX_CREDIT_AMOUNT.toLocaleString()} per credit.
              </p>
            )}
          </div>

          <div className="mb-1">
            <label className="mb-1 block text-[13px] font-medium text-gray-600" htmlFor="wallet-credit-reason">
              Reason *
            </label>
            <textarea
              className="w-full rounded-xl border border-[#B3DADA] bg-white px-4 py-3 text-[14px] text-[#21295A] outline-none transition-all focus:border-[#21295A] focus:ring-2 focus:ring-[#21295A]/10"
              id="wallet-credit-reason"
              maxLength={500}
              placeholder="e.g. Goodwill credit for the lane outage on 20 Sep — the member will see this text"
              rows={3}
              value={reason}
              onChange={e => setReason(e.target.value)}
            />
            <div className="mt-1 flex justify-between text-[12px]">
              <span className={reason.trim().length > 0 && reason.trim().length < 3 ? 'text-red-500' : 'text-gray-400'}>
                {reason.trim().length < 3 ? 'At least 3 characters' : ' '}
              </span>
              <span className={reason.length >= 500 ? 'text-red-500' : 'text-gray-400'}>{reason.length}/500</span>
            </div>
          </div>
        </div>

        <div className="flex justify-center gap-3 border-t border-[#E5F0F0] px-6 py-5">
          <button
            className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-[#21295A] px-4 py-3 text-[14px] font-medium text-white shadow-lg shadow-[#21295A]/20 transition-all hover:scale-[1.02] hover:bg-[#2d3570] hover:shadow-xl hover:shadow-[#21295A]/30 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            disabled={!canSubmit || isSubmitting}
            onClick={handleSubmit}
          >
            {isSubmitting ? (
              <>
                <LoaderSpinner className="text-white" size="sm" />
                Crediting...
              </>
            ) : (
              'Credit Wallet'
            )}
          </button>
          <button
            className="rounded-xl border-2 border-[#B3DADA] px-4 py-3 text-[14px] font-medium text-[#21295A] transition-all hover:scale-[1.02] hover:border-[#21295A] hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:scale-100"
            disabled={isSubmitting}
            onClick={onClose}
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default CreditWalletModal;
