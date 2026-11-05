import React, { useState } from 'react';

import { User } from 'lucide-react';

interface ProfileAvatarProps {
  photoUrl?: string | null;
  alt?: string;
  /** Avatar box size in px (both width and height). Defaults to 36 (h-9/w-9),
   * matching the Members list row avatar. */
  size?: number;
  /** Fallback icon size in px. Defaults to ~55% of `size`, matching the
   * Figma spec's 20px icon inside a 40px box. */
  iconSize?: number;
  className?: string;
}

/**
 * The single profile-avatar style used across the app (per Figma node
 * 562:855, "Member avatar"): a rounded-xl box with a light `#e0e0e0` border
 * and white background, showing the photo when there is one, or a plain
 * `User` icon (lucide-react) in the brand blue when there isn't -- never
 * initials, never a circle, never a hand-drawn placeholder SVG. Falls back
 * to the icon automatically if the photo URL 404s/expires (e.g. a stale
 * SAS URL), not just when it's missing outright.
 */
const ProfileAvatar: React.FC<ProfileAvatarProps> = ({
  photoUrl,
  alt = 'Profile',
  size = 36,
  iconSize,
  className = '',
}) => {
  const [broken, setBroken] = useState(false);
  const showPhoto = Boolean(photoUrl) && !broken;
  const resolvedIconSize = iconSize ?? Math.round(size * 0.55);

  return (
    <div
      className={`flex shrink-0 items-center justify-center overflow-hidden rounded-xl border border-[#e0e0e0] bg-white ${className}`}
      style={{ width: size, height: size }}
    >
      {showPhoto ? (
        <img
          alt={alt}
          className="h-full w-full object-cover"
          src={photoUrl ?? undefined}
          onError={() => setBroken(true)}
        />
      ) : (
        <User className="text-[#336DC2]" style={{ width: resolvedIconSize, height: resolvedIconSize }} />
      )}
    </div>
  );
};

export default ProfileAvatar;
