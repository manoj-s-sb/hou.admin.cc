import { useState } from 'react';

import { toast } from 'react-hot-toast';

import { AdminNote } from '../../../store/centres/types';
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

interface MemberDetailDrawerProps {
  title: string;
  name: string;
  email?: string;
  fields: DetailField[];
  notes: AdminNote[];
  onAddNote: (text: string) => Promise<void>;
  onClose: () => void;
}

const MemberDetailDrawer: React.FC<MemberDetailDrawerProps> = ({
  title,
  name,
  email,
  fields,
  notes,
  onAddNote,
  onClose,
}) => {
  const [note, setNote] = useState('');
  const [saving, setSaving] = useState(false);

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
          <button
            aria-label="Close"
            className="flex h-8 w-8 items-center justify-center rounded-lg border border-gray-200 text-gray-500 hover:bg-gray-50"
            type="button"
            onClick={onClose}
          >
            ×
          </button>
        </div>

        <div className="max-h-[80vh] overflow-y-auto px-6 py-5">
          <div className="mb-5 flex items-center gap-3">
            <span
              className="flex h-14 w-14 flex-shrink-0 items-center justify-center rounded-full text-[16px] font-bold text-white"
              style={{ background: avatarColor(name) }}
            >
              {initials(name)}
            </span>
            <div>
              <p className="text-[16px] font-bold text-[#21295A]">{name}</p>
              {email && <p className="text-[13px] text-gray-400">{email}</p>}
            </div>
          </div>

          <div className="mb-5 grid grid-cols-2 gap-3">
            {fields.map(f => (
              <div key={f.label} className="rounded-xl border border-gray-100 bg-gray-50 px-4 py-3">
                <p className="text-[12px] text-gray-400">{f.label}</p>
                <p className="mt-0.5 text-[14px] font-bold text-[#21295A]">{f.value || '—'}</p>
              </div>
            ))}
          </div>

          <div className="mb-4 border-t border-gray-100 pt-4">
            <p className="mb-2 text-[11px] font-bold uppercase tracking-wider text-gray-400">Admin Notes</p>
            {notes.length === 0 ? (
              <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50/50 px-4 py-6 text-center">
                <p className="text-[13px] text-gray-400">No notes yet</p>
              </div>
            ) : (
              <div className="flex max-h-48 flex-col gap-2 overflow-y-auto pr-1">
                {notes.map(n => (
                  <div key={n.id} className="rounded-xl border border-gray-100 bg-gray-50 px-3.5 py-2.5">
                    <p className="whitespace-pre-wrap text-[13px] text-gray-700">{n.text}</p>
                    <p className="mt-1 text-[11px] text-gray-400">
                      {n.createdByName || 'Admin'} · {noteTimestamp(n.createdAt)}
                    </p>
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
