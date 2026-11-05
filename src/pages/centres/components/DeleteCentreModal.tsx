import { useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { deleteCentre } from '../../../store/centres/api';
import { AppDispatch } from '../../../store/store';

import type { FacilitySummary } from '../../../store/centres/types';

interface Props {
  centre: FacilitySummary;
  onClose: () => void;
  /** Called after a successful delete so the list can refresh and drop the card. */
  onDeleted: () => void;
}

/**
 * Type-to-confirm delete — the admin must type the centre's own short code
 * exactly before the Delete button enables. Deleting is a soft delete on the
 * backend (status="deleted", fully recoverable from the database), but there
 * is no "undo" from this UI, so the stronger confirmation (not just a plain
 * Yes/No) is intentional: it's the same bar other tools set for anything that
 * disappears from view with no in-app way back.
 */
const DeleteCentreModal: React.FC<Props> = ({ centre, onClose, onDeleted }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [typed, setTyped] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const confirmed = typed.trim().toUpperCase() === centre.code.toUpperCase();

  const handleDelete = async () => {
    if (!confirmed || isDeleting) return;
    setIsDeleting(true);
    try {
      await dispatch(deleteCentre(centre.code)).unwrap();
      toast.success(`${centre.name} deleted.`);
      onDeleted();
      onClose();
    } catch (error) {
      toast.error((error as string) || 'Could not delete the centre. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="button"
      tabIndex={0}
      onClick={e => {
        if (e.target === e.currentTarget) onClose();
      }}
      onKeyDown={e => {
        if (e.key === 'Escape') onClose();
      }}
    >
      <div
        role="dialog"
        style={{
          background: '#fff',
          borderRadius: 12,
          width: '100%',
          maxWidth: 440,
          boxShadow: '0 6px 20px rgba(16,24,40,.12)',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>Delete centre</div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ fontSize: 13, color: 'var(--navy)' }}>
            Delete <strong>{centre.name}</strong> ({centre.code})? It will be removed from the admin portal everywhere.
            This can&apos;t be undone from here.
          </div>
          <div
            style={{
              fontSize: 12.5,
              color: '#92400e',
              background: '#fffbeb',
              border: '1px solid #fde68a',
              borderRadius: 8,
              padding: '8px 12px',
            }}
          >
            Only Draft centres can be deleted this way — nothing real (members, bookings) can be attached to one yet.
          </div>
          <label className="flex flex-col gap-1">
            <span className="cmx-field-label">
              Type <strong>{centre.code}</strong> to confirm
            </span>
            <input
              autoComplete="off"
              className="cmx-field"
              placeholder={centre.code}
              style={{ textTransform: 'uppercase' }}
              type="text"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter' && confirmed) handleDelete();
              }}
            />
          </label>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: 8,
            borderTop: '1px solid var(--border)',
            padding: '14px 20px',
          }}
        >
          <button className="cmx-btn cmx-btn-outline" disabled={isDeleting} type="button" onClick={onClose}>
            Cancel
          </button>
          <button
            className="cmx-btn"
            disabled={!confirmed || isDeleting}
            style={{
              background: confirmed ? '#dc2626' : '#fca5a5',
              color: '#fff',
              cursor: confirmed && !isDeleting ? 'pointer' : 'not-allowed',
            }}
            type="button"
            onClick={handleDelete}
          >
            {isDeleting ? 'Deleting…' : 'Delete Centre'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default DeleteCentreModal;
