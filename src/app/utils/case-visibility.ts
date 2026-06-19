import { CaseVisibility, CaseVisibilityObject } from '../models/case';

const VALID_VISIBILITY_MODES = new Set([
  'case_members',
  'internal_only',
  'selected_members',
  'selected_parties',
]);

export function normalizeCaseVisibilityForApi(
  visibility: CaseVisibility | null | undefined
): CaseVisibilityObject {
  if (visibility && typeof visibility === 'object') {
    const mode = VALID_VISIBILITY_MODES.has(String(visibility.mode))
      ? String(visibility.mode)
      : 'case_members';
    return {
      mode,
      ...(Array.isArray(visibility.memberIds) ? { memberIds: visibility.memberIds } : {}),
      ...(Array.isArray(visibility.partyIds) ? { partyIds: visibility.partyIds } : {}),
    };
  }

  const mode = String(visibility || 'case_members');
  if (mode === 'internal_only') {
    return { mode: 'internal_only' };
  }
  if (mode === 'selected_members' || mode === 'selected_parties') {
    return { mode };
  }

  return { mode: 'case_members' };
}

export function caseVisibilityMode(visibility: CaseVisibility | null | undefined): string {
  if (visibility && typeof visibility === 'object') {
    return String(visibility.mode || 'case_members');
  }
  return String(visibility || 'case_members');
}

export function isVisibleToCaseClient(visibility: CaseVisibility | null | undefined): boolean {
  return caseVisibilityMode(visibility) !== 'internal_only';
}
