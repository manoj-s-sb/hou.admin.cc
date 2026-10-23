import { useState } from 'react';

import { toast } from 'react-hot-toast';
import { useDispatch } from 'react-redux';

import { updateCentreFacilities } from '../../../store/centres/api';
import { AppDispatch } from '../../../store/store';
import { DEFAULT_AMENITIES } from '../constants';

interface Props {
  centreCode: string;
  current: string[];
  onClose: () => void;
  onSaved: () => void;
}

const AmenitiesEditModal: React.FC<Props> = ({ centreCode, current, onClose, onSaved }) => {
  const dispatch = useDispatch<AppDispatch>();
  const [selected, setSelected] = useState<string[]>(current);
  const [isSaving, setIsSaving] = useState(false);
  const [newAmenity, setNewAmenity] = useState('');

  // The checklist shows the fixed defaults plus any custom amenity already
  // stored on this centre (previously silently carried through unchecked —
  // now rendered as a real, toggleable row) plus whatever's added below in
  // this session. A plain Set dedupes case-sensitively, matching how
  // `selected`/`current` already compare values elsewhere in this file.
  const [customAmenities, setCustomAmenities] = useState<string[]>(current.filter(a => !DEFAULT_AMENITIES.includes(a)));
  const allAmenities = [...DEFAULT_AMENITIES, ...customAmenities];

  const toggle = (a: string) => setSelected(prev => (prev.includes(a) ? prev.filter(x => x !== a) : [...prev, a]));

  const addAmenity = () => {
    const trimmed = newAmenity.trim();
    if (!trimmed) return;
    if (allAmenities.some(a => a.toLowerCase() === trimmed.toLowerCase())) {
      toast.error('That amenity is already in the list.');
      return;
    }
    setCustomAmenities(prev => [...prev, trimmed]);
    setSelected(prev => [...prev, trimmed]);
    setNewAmenity('');
  };

  const handleSubmit = async () => {
    if (isSaving) return;
    setIsSaving(true);
    try {
      await dispatch(updateCentreFacilities({ centreId: centreCode, facility: { amenities: selected } })).unwrap();
      toast.success('Amenities updated.');
      onSaved();
      onClose();
    } catch (error) {
      toast.error((error as string) || 'Could not save. Please try again.');
    } finally {
      setIsSaving(false);
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
          maxWidth: 420,
          boxShadow: '0 6px 20px rgba(16,24,40,.12)',
        }}
      >
        <div style={{ borderBottom: '1px solid var(--border)', padding: '16px 20px' }}>
          <div style={{ fontSize: 15, fontWeight: 700, color: 'var(--navy)' }}>Edit General Amenities</div>
        </div>

        <div style={{ padding: 20, display: 'flex', flexDirection: 'column', gap: 10 }}>
          {allAmenities.map(a => (
            <label
              key={a}
              style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 13, color: 'var(--navy)' }}
            >
              <input checked={selected.includes(a)} type="checkbox" onChange={() => toggle(a)} />
              {a}
            </label>
          ))}

          <div style={{ display: 'flex', gap: 8, marginTop: 4 }}>
            <input
              placeholder="Add a new amenity…"
              style={{
                flex: 1,
                border: '1px solid var(--border)',
                borderRadius: 6,
                padding: '6px 10px',
                fontSize: 13,
                color: 'var(--navy)',
              }}
              type="text"
              value={newAmenity}
              onChange={e => setNewAmenity(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  addAmenity();
                }
              }}
            />
            <button className="cmx-btn cmx-btn-outline" type="button" onClick={addAmenity}>
              + Add
            </button>
          </div>
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
          <button className="cmx-btn cmx-btn-outline" disabled={isSaving} type="button" onClick={onClose}>
            Cancel
          </button>
          <button className="cmx-btn cmx-btn-navy" disabled={isSaving} type="button" onClick={handleSubmit}>
            {isSaving ? 'Saving…' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default AmenitiesEditModal;
