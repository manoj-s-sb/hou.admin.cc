import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { AdminNote, ContactStatus, StatusHistoryEntry } from '../../../store/centres/types';
import { formatDate } from '../../../utils/dateUtils';

const AVATAR_COLORS = ['#21295A', '#008482', '#d97706', '#7c3aed', '#0891b2', '#d42b2b'];

const initials = (text: string): string =>
  text
    .split(/[\s@._-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map(p => Array.from(p)[0]?.toUpperCase() ?? '')
    .join('') || '—';

const avatarColor = (seed: string): string => {
  let hash = 0;
  for (let i = 0; i < seed.length; i += 1) hash = (hash + seed.charCodeAt(i)) % AVATAR_COLORS.length;
  return AVATAR_COLORS[hash];
};

const noteTimestamp = (value: string): string =>
  formatDate(value, { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' }, 'en-GB');

export interface DetailField {
  label: string;
  value: string;
}

export const STATUS_META: Record<ContactStatus, { label: string; className: string }> = {
  not_contacted: { label: 'Not Contacted', className: 'border-gray-200 bg-gray-50 text-gray-500' },
  contacted: { label: 'Contacted', className: 'border-blue-200 bg-blue-50 text-blue-700' },
  no_response: { label: 'No Response', className: 'border-amber-200 bg-amber-50 text-amber-700' },
  converted: { label: 'Converted', className: 'border-green-200 bg-green-50 text-green-700' },
  not_interested: { label: 'Not Interested', className: 'border-red-200 bg-red-50 text-red-700' },
};

const STATUS_ORDER: ContactStatus[] = ['not_contacted', 'contacted', 'no_response', 'converted', 'not_interested'];

interface MemberDetailDrawerProps {
  title: string;
  name: string;
  email?: string;
  fields: DetailField[];
  notes: AdminNote[];
  status?: ContactStatus;
  statusHistory?: StatusHistoryEntry[];
  onStatusChange?: (status: ContactStatus) => Promise<void>;
  onAddNote: (text: string) => Promise<void>;
  onDeleteNote?: (noteId: string) => Promise<void>;
  /** When set, shows a delete icon for the whole entry (only offered where that's
   * actually supported, e.g. a manually-added lead — not a funnel-derived one). */
  onDeleteEntry?: () => Promise<void>;
  onClose: () => void;
}

const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({
  title,
  name,
  email,
  fields,
  notes,
  status,
  statusHistory,
  onStatusChange,
  onAddNote,
  onDeleteNote,
  onDeleteEntry,
  onClose,
}) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);
  const [statusSaving, setStatusSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [deletingNoteId, setDeletingNoteId] = useState<string | null>(null);
  const [deletingEntry, setDeletingEntry] = useState(false);

  const handleAddNote = async () => {
    const text = note.trim();
    if (!text) return;
    setSaving(true);
    try {
      await onAddNote(text);
      setNote('');
    } catch (error) {
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
      toast.error(message || 'Failed to add note');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteNote = async (noteId: string) => {
    if (!onDeleteNote || deletingNoteId) return;
    if (!window.confirm('Delete this note?')) return;
    setDeletingNoteId(noteId);
    try {
      await onDeleteNote(noteId);
    } catch (error) {
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
      toast.error(message || 'Failed to delete note');
    } finally {
      setDeletingNoteId(null);
    }
  };

  const handleDeleteEntry = async () => {
    if (!onDeleteEntry || deletingEntry) return;
    if (!window.confirm(`Delete ${name}? This can't be undone.`)) return;
    setDeletingEntry(true);
    try {
      await onDeleteEntry();
    } catch (error) {
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
      toast.error(message || 'Failed to delete');
      setDeletingEntry(false);
    }
  };

  const handleStatusClick = async (next: ContactStatus) => {
    if (!onStatusChange || next === status || statusSaving) return;
    setStatusSaving(true);
    try {
      await onStatusChange(next);
    } catch (error) {
      const message = error instanceof Error ? error.message : typeof error === 'string' ? error : undefined;
      toast.error(message || 'Failed to update status');
    } finally {
      setStatusSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[600] flex items-center justify-center bg-black/40 p-4"
      role="presentation"
      onClick={onClose}
      onKeyDown={onClose}
    >
      <div
        className="w-full max-w-[480px] overflow-hidden rounded-2xl bg-white shadow-2xl"
        role="presentation"
        onClick={e => e.stopPropagation()}
        onKeyDown={e => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-6 py-4">
          <h2 className="text-[17px] font-bold text-[#21295A]">{title}</h2>
          <div className="flex items-center gap-2">
            {onDeleteEntry && (
              <button
                aria-label="Delete"
                className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-red-500 transition hover:bg-red-50 disabled:opacity-50"
                disabled={deletingEntry}
                title="Delete this entry"
                type="button"
                onClick={handleDeleteEntry}
              >
                <svg fill="none" height={15} stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24" width={15}>
                  <polyline points="3 6 5 6 21 6" />
                  <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                </svg>
              </button>
            )}
            <button
              aria-label="Close"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
              type="button"
              onClick={onClose}
            >
              ×
            </button>
          </div>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-center gap-3">
            <span
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white"
              style={{ background: avatarColor(name) }}
            >
              {initials(name)}
            </span>
            <div className="min-w-0">
              <p className="break-words text-[16px] font-bold text-[#21295A]">{name}</p>
              {email && <p className="break-words text-[13px] text-gray-400">{email}</p>}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[12px] text-gray-400">{f.label}</p>
                <p className="mt-0.5 break-words text-[14px] font-bold text-[#21295A]">{f.value || '—'}</p>
              </div>
            ))}
          </div>

          {status && onStatusChange && (
            <div className="mb-5">
              <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Contact Status</p>
              <div className="flex flex-wrap gap-2">
                {STATUS_ORDER.map(s => {
                  const meta = STATUS_META[s];
                  const active = s === status;
                  return (
                    <button
                      key={s}
                      className={`rounded-full border px-3 py-1 text-[12px] font-semibold transition disabled:opacity-50 ${
                        active ? meta.className : 'border-gray-200 bg-white text-gray-400 hover:bg-gray-50'
                      }`}
                      disabled={statusSaving}
                      type="button"
                      onClick={() => handleStatusClick(s)}
                    >
                      {meta.label}
                    </button>
                  );
                })}
              </div>

              {statusHistory && statusHistory.length > 0 && (
                <div className="mt-3">
                  <button
                    className="flex w-full items-center justify-between rounded-lg py-1 text-left"
                    type="button"
                    onClick={() => setShowHistory(v => !v)}
                  >
                    <span className="text-[12px] font-semibold text-gray-500">History ({statusHistory.length})</span>
                    <svg
                      className={`h-3.5 w-3.5 text-gray-400 transition-transform ${showHistory ? 'rotate-180' : ''}`}
                      fill="none"
                      stroke="currentColor"
                      strokeWidth={2}
                      viewBox="0 0 24 24"
                    >
                      <polyline points="6 9 12 15 18 9" />
                    </svg>
                  </button>
                  {showHistory && (
                    <div className="mt-2 flex max-h-40 flex-col gap-2 overflow-y-auto pr-1">
                      {[...statusHistory].reverse().map(h => (
                        <div key={h.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                          <p className="text-[13px] text-gray-700">
                            Marked <span className="font-semibold">{STATUS_META[h.status].label}</span>
                          </p>
                          <p className="mt-1 text-[11px] text-gray-400">
                            {h.changedByName || 'Admin'} · {noteTimestamp(h.changedAt)}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          <div className="mb-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Admin Notes</p>
            {notes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center">
                <p className="text-[13px] text-gray-400">No notes yet</p>
              </div>
            ) : (
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                {notes.map(n => (
                  <div
                    key={n.id}
                    className="flex items-start justify-between gap-2 rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="whitespace-pre-wrap text-[13px] text-gray-700">{n.text}</p>
                      <p className="mt-1 text-[11px] text-gray-400">
                        {n.createdByName || 'Admin'} · {noteTimestamp(n.createdAt)}
                      </p>
                    </div>
                    {onDeleteNote && (
                      <button
                        aria-label="Delete note"
                        className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-md text-gray-400 transition hover:bg-red-50 hover:text-red-500 disabled:opacity-50"
                        disabled={deletingNoteId === n.id}
                        title="Delete note"
                        type="button"
                        onClick={() => handleDeleteNote(n.id)}
                      >
                        <svg
                          fill="none"
                          height={13}
                          stroke="currentColor"
                          strokeWidth={2}
                          viewBox="0 0 24 24"
                          width={13}
                        >
                          <polyline points="3 6 5 6 21 6" />
                          <path d="M19 6l-1 14a2 2 0 01-2 2H8a2 2 0 01-2-2L5 6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" />
                        </svg>
                      </button>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>

          <div className="overflow-hidden rounded-xl border border-gray-200">
            <textarea
              className="w-full resize-none px-4 py-3 text-[13px] outline-none placeholder:text-gray-400"
              placeholder="Add a note about this member..."
              rows={3}
              value={note}
              onChange={e => setNote(e.target.value)}
            />
            <div className="flex justify-end border-t border-gray-100 bg-gray-50 px-4 py-2.5">
              <button
                className="rounded-lg bg-[#21295A] px-4 py-1.5 text-[12px] font-semibold text-white transition hover:bg-[#2d3570] disabled:opacity-50"
                disabled={saving || !note.trim()}
                type="button"
                onClick={handleAddNote}
              >
                {saving ? 'Adding…' : 'Add Note'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailDrawer;
