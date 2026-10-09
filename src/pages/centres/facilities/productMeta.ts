/** Icon + display label + icon tint, matched against a product's `code` (mirrors the
 * New Centre wizard's AdditionalFacilitiesStep panel icons, so the Facilities page's
 * cards and its add/edit modal visually match the wizard's own facility panels). */
const FEATURE_META: { match: (code: string) => boolean; icon: string; label: string; bg: string }[] = [
  { match: c => c.includes('gym'), icon: '🏋️', label: 'Gym / Fitness Area', bg: '#fef9c3' },
  { match: c => c.includes('podcast'), icon: '🎙', label: 'Podcast Room', bg: '#ecedf4' },
  { match: c => c.includes('meeting'), icon: '🗂', label: 'Meeting Room', bg: '#d0f0f0' },
  { match: c => c.includes('gaming') || c.includes('game'), icon: '🎮', label: 'Gaming Zone', bg: '#eeedfe' },
];

export const featureMetaFor = (code: string): { icon: string; label: string; bg: string } =>
  FEATURE_META.find(m => m.match(code.toLowerCase())) ?? { icon: '📦', label: code, bg: '#f3f4f6' };
