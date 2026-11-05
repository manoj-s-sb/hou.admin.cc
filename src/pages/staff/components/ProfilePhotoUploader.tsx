import React, { useRef } from 'react';

import ProfileAvatar from '../../../components/ProfileAvatar';

interface ProfilePhotoUploaderProps {
  imageDataUrl: string;
  existingUrl: string;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
  label?: string;
  helpText?: string;
}

const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  imageDataUrl,
  existingUrl,
  onSelect,
  onRemove,
  label = 'Profile Photo',
  helpText = 'JPG or PNG, max 2MB. Displayed on staff profiles and member-facing interfaces.',
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasImage = Boolean(imageDataUrl || existingUrl);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-4">
        <ProfileAvatar alt="Profile preview" photoUrl={imageDataUrl || existingUrl} size={64} />
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-[#21295A]">{label}</p>
          <p className="text-[11px] text-gray-500">{helpText}</p>
          <input
            ref={inputRef}
            accept="image/png,image/jpeg"
            className="hidden"
            type="file"
            onChange={e => onSelect(e.target.files?.[0] ?? null)}
          />
          <div className="mt-2 flex items-center gap-2">
            <button
              className="rounded-md border border-gray-200 bg-white px-3 py-1.5 text-[11px] font-semibold text-gray-700 transition hover:border-[#21295A]/30 hover:text-[#21295A]"
              type="button"
              onClick={() => inputRef.current?.click()}
            >
              {hasImage ? 'Replace Photo' : 'Upload Photo'}
            </button>
            {imageDataUrl && (
              <button
                className="rounded-md border border-transparent px-2 py-1.5 text-[11px] font-semibold text-red-500 transition hover:text-red-700"
                type="button"
                onClick={() => {
                  onRemove();
                  if (inputRef.current) inputRef.current.value = '';
                }}
              >
                Remove
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfilePhotoUploader;
