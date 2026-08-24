import { useState } from 'react';

import { LoaderSpinner } from '../../../components/Loader';
import { AdminNote } from '../../../store/waitlist/types';
import { formatDateTimeChicago } from '../../../utils/dateUtils';

export interface DetailField {
  label: string;
  value: string;
}

interface MemberDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  name: string;
  email: string;
  fields: DetailField[];
  notes: AdminNote[];
  noteSaving: boolean;
  onAddNote: (text: string) => void;
}

const getInitials = (name: string) => {
  const trimmed = name.trim();
  if (!trimmed) return '?';
  const parts = trimmed.split(/\s+/);
  return parts
    .slice(0, 2)
    .map(part => part.charAt(0).toUpperCase())
    .join('');
};

const MemberDetailDrawer = ({
  isOpen,
  onClose,
  title,
  name,
  email,
  fields,
  notes,
  noteSaving,
  onAddNote,
}: MemberDetailDrawerProps) => {
  const [noteText, setNoteText] = useState('');

  if (!isOpen) return null;

  const handleAddNote = () => {
    const trimmed = noteText.trim();
    if (!trimmed) return;
    onAddNote(trimmed);
    setNoteText('');
  };

  return (
    <div className="fixed inset-0 z-[600] flex items-center justify-center bg-black bg-opacity-50 p-4">
      <div className="flex max-h-[85vh] w-full max-w-lg flex-col rounded-2xl bg-white shadow-xl">
        <div className="flex items-center justify-between border-b border-gray-100 p-6 pb-4">
          <h3 className="text-lg font-semibold text-gray-900">{title}</h3>
          <button
            aria-label="Close"
            className="rounded-full p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600"
            onClick={onClose}
          >
            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path d="M6 18L18 6M6 6l12 12" strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} />
            </svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6">
          <div className="flex items-center gap-3 border-b border-gray-100 pb-4">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#21295A]/10 text-sm font-semibold text-[#21295A]">
              {getInitials(name || email || '?')}
            </div>
            <div className="min-w-0">
              <p className="truncate font-semibold text-gray-900">{name || 'Unnamed'}</p>
              <p className="truncate text-sm text-gray-500">{email || '—'}</p>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 py-4">
            {fields.map(field => (
              <div key={field.label}>
                <p className="text-xs font-medium uppercase tracking-wide text-gray-400">{field.label}</p>
                <p className="mt-1 text-sm font-medium text-gray-800">{field.value || '—'}</p>
              </div>
            ))}
          </div>

          <div className="border-t border-gray-100 py-4">
            <h4 className="mb-3 text-sm font-semibold text-gray-900">Admin Notes</h4>
            <div className="mb-3 max-h-48 space-y-3 overflow-y-auto">
              {notes.length === 0 ? (
                <p className="text-sm text-gray-400">No notes yet.</p>
              ) : (
                notes.map(note => (
                  <div key={note.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="text-sm text-gray-700">{note.text}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {note.createdByName} · {formatDateTimeChicago(note.createdAt)}
                    </p>
                  </div>
                ))
              )}
            </div>
            <textarea
              className="w-full resize-none rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 shadow-inner focus:border-indigo-500 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-200"
              placeholder="Add a note..."
              rows={2}
              value={noteText}
              onChange={e => setNoteText(e.target.value)}
            />
            <div className="mt-2 flex justify-end">
              <button
                className="flex items-center gap-2 rounded-lg bg-indigo-600 px-4 py-1.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-700 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={noteSaving || !noteText.trim()}
                onClick={handleAddNote}
              >
                {noteSaving && <LoaderSpinner className="text-white" size="xs" />}
                Add Note
              </button>
            </div>
          </div>
        </div>

        <div className="flex justify-end border-t border-gray-100 p-6 pt-4">
          <button
            className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-50"
            onClick={onClose}
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};

export default MemberDetailDrawer;
