import React, { useRef } from 'react';

interface ProfilePhotoUploaderProps {
  imageDataUrl: string;
  existingUrl: string;
  onSelect: (file: File | null) => void;
  onRemove: () => void;
}

const ProfilePhotoUploader: React.FC<ProfilePhotoUploaderProps> = ({
  imageDataUrl,
  existingUrl,
  onSelect,
  onRemove,
}) => {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const hasImage = Boolean(imageDataUrl || existingUrl);

  return (
    <div className="rounded-xl border border-gray-100 bg-gray-50 p-4">
      <div className="flex items-center gap-4">
        <div className="flex h-16 w-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-white text-gray-400 shadow-sm">
          {hasImage ? (
            <img alt="Profile preview" className="h-full w-full object-cover" src={imageDataUrl || existingUrl} />
          ) : (
            <svg className="h-8 w-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
              />
            </svg>
          )}
        </div>
        <div className="flex-1">
          <p className="text-[13px] font-semibold text-[#21295A]">Profile Photo</p>
          <p className="text-[11px] text-gray-500">
            JPG or PNG, max 2MB. Displayed on staff profiles and member-facing interfaces.
          </p>
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
