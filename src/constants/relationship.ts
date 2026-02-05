/**
 * Emergency contact relationship enum (value -> display label).
 * Backend values: spouse_partner, parent_guardian, child, friends_relatives.
 */
export const RELATIONSHIP_LABELS: Record<string, string> = {
  spouse_partner: 'Spouse/Partner',
  parent_guardian: 'Parent/Guardian',
  child: 'Child',
  friends_relatives: 'Friends/Relatives',
} as const;

export function getRelationshipLabel(value: string | null | undefined): string {
  if (!value) return 'N/A';
  return RELATIONSHIP_LABELS[value] ?? value;
}
