import { useEffect, useState } from 'react';

import { Edit2, StickyNote, Trash2 } from 'lucide-react';
import { useDispatch, useSelector } from 'react-redux';

import { LoaderSpinner } from '../../../components/Loader';
import { getLocalUser } from '../../../constants/user';
import { isSuperAdmin } from '../../../rbac/permissions';
import { addMemberNote, deleteMemberNote, getMemberNotes, updateMemberNote } from '../../../store/members/api';
import { AppDispatch, RootState } from '../../../store/store';
import { formatDateTimeChicago } from '../../../utils/dateUtils';

const MAX_NOTE_LENGTH = 2000;

interface Props {
  userId: string;
}

/**
 * Admin Notes — free-text notes an admin can leave on a member (behavioral
 * observations, follow-ups, etc.). Kept as its own component (unlike the rest
 * of this page's read-only sections) since it needs add/edit/delete state.
 * Notes live in their own slice of Redux state (state.members.memberNotes),
 * separate from `memberDetails`, so a note action never refetches the whole
 * member object — see src/store/members/api.ts and reducers.ts.
 */
const AdminNotesSection: React.FC<Props> = ({ userId }) => {
  const dispatch = useDispatch<AppDispatch>();
  const { memberNotes, memberNotesLoading, memberNotesError } = useSelector((state: RootState) => state.members);

  const [newNote, setNewNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [savingEditId, setSavingEditId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const currentUserId = getLocalUser().userId;
  const canManageNote = (createdById: string | null) => createdById === currentUserId || isSuperAdmin();

  useEffect(() => {
    if (userId) dispatch(getMemberNotes({ userId }));
  }, [dispatch, userId]);

  const handleAdd = () => {
    const trimmed = newNote.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    dispatch(addMemberNote({ userId, noteText: trimmed }))
      .unwrap()
      .then(() => setNewNote(''))
      .catch(() => {
        /* memberNotesError already surfaces the message inline */
      })
      .finally(() => setSubmitting(false));
  };

  const startEdit = (noteId: string, currentText: string) => {
    setEditingId(noteId);
    setEditText(currentText);
  };

  const cancelEdit = () => {
    setEditingId(null);
    setEditText('');
  };

  const saveEdit = (noteId: string) => {
    const trimmed = editText.trim();
    if (!trimmed || savingEditId) return;
    setSavingEditId(noteId);
    dispatch(updateMemberNote({ userId, noteId, noteText: trimmed }))
      .unwrap()
      .then(() => {
        setEditingId(null);
        setEditText('');
      })
      .catch(() => {
        /* memberNotesError already surfaces the message inline */
      })
      .finally(() => setSavingEditId(null));
  };

  const handleDelete = (noteId: string) => {
    if (!window.confirm('Delete this note? This cannot be undone.')) return;
    setDeletingId(noteId);
    dispatch(deleteMemberNote({ userId, noteId }))
      .unwrap()
      .catch(() => {
        /* memberNotesError already surfaces the message inline */
      })
      .finally(() => setDeletingId(null));
  };

  return (
    <div className="overflow-hidden rounded-xl border border-gray-200 bg-white shadow-sm">
      <div className="border-b border-gray-200 bg-white px-4 py-2 sm:px-6 sm:py-3">
        <div className="flex items-center">
          <StickyNote className="mr-2 h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-900">Admin Notes</h2>
        </div>
      </div>

      <div className="px-4 py-3 sm:px-6 sm:py-4">
        {/* Add note */}
        <div className="mb-4">
          <textarea
            className="w-full rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700 outline-none transition focus:border-blue-500 focus:bg-white disabled:opacity-60"
            disabled={submitting}
            maxLength={MAX_NOTE_LENGTH}
            placeholder="Add a note about this member — behavioral changes, follow-ups, observations…"
            rows={2}
            value={newNote}
            onChange={e => setNewNote(e.target.value)}
          />
          <div className="mt-2 flex items-center justify-between">
            <span className="text-xs text-gray-400">
              {newNote.length}/{MAX_NOTE_LENGTH}
            </span>
            <button
              className="rounded-lg bg-[#21295A] px-4 py-1.5 text-sm font-semibold text-white transition hover:bg-[#2d3570] disabled:cursor-not-allowed disabled:opacity-50"
              disabled={submitting || !newNote.trim()}
              type="button"
              onClick={handleAdd}
            >
              {submitting ? <LoaderSpinner className="text-white" size="xs" /> : 'Add Note'}
            </button>
          </div>
        </div>

        {memberNotesError && (
          <div className="mb-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-600">
            {memberNotesError}
          </div>
        )}

        {/* Notes list */}
        {memberNotesLoading ? (
          <div className="flex justify-center py-6">
            <LoaderSpinner className="text-blue-600" size="sm" />
          </div>
        ) : memberNotes.length === 0 ? (
          <p className="py-4 text-center text-sm text-gray-400">No notes yet</p>
        ) : (
          <div className="space-y-3">
            {memberNotes.map(note => {
              const isEditing = editingId === note.id;
              const canManage = canManageNote(note.createdById);
              return (
                <div key={note.id} className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                  <div className="mb-1.5 flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2 text-xs text-gray-500">
                      <span className="font-semibold text-gray-700">{note.createdByName}</span>
                      <span>
                        {formatDateTimeChicago(note.createdAt)}
                        {note.updatedAt ? ' (edited)' : ''}
                      </span>
                    </div>
                    {canManage && !isEditing && (
                      <div className="flex items-center gap-1">
                        <button
                          aria-label="Edit note"
                          className="rounded p-1 text-gray-400 transition hover:bg-gray-200 hover:text-gray-700"
                          type="button"
                          onClick={() => startEdit(note.id, note.noteText)}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        <button
                          aria-label="Delete note"
                          className="rounded p-1 text-gray-400 transition hover:bg-red-100 hover:text-red-600 disabled:opacity-50"
                          disabled={deletingId === note.id}
                          type="button"
                          onClick={() => handleDelete(note.id)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {isEditing ? (
                    <div>
                      <textarea
                        className="w-full rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700 outline-none focus:border-blue-500"
                        disabled={savingEditId === note.id}
                        maxLength={MAX_NOTE_LENGTH}
                        rows={2}
                        value={editText}
                        onChange={e => setEditText(e.target.value)}
                      />
                      <div className="mt-2 flex justify-end gap-2">
                        <button
                          className="rounded-lg border border-gray-200 px-3 py-1 text-xs font-semibold text-gray-600 transition hover:bg-gray-100"
                          disabled={savingEditId === note.id}
                          type="button"
                          onClick={cancelEdit}
                        >
                          Cancel
                        </button>
                        <button
                          className="rounded-lg bg-[#21295A] px-3 py-1 text-xs font-semibold text-white transition hover:bg-[#2d3570] disabled:opacity-50"
                          disabled={savingEditId === note.id || !editText.trim()}
                          type="button"
                          onClick={() => saveEdit(note.id)}
                        >
                          {savingEditId === note.id ? 'Saving…' : 'Save'}
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm text-gray-800">{note.noteText}</p>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminNotesSection;
