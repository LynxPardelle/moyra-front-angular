import { CaseMembership, CaseVisibility, CaseVisibilityObject } from '../models/case';

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
      : 'internal_only';
    return {
      mode,
      ...(Array.isArray(visibility.memberIds) ? { memberIds: visibility.memberIds } : {}),
      ...(Array.isArray(visibility.partyIds) ? { partyIds: visibility.partyIds } : {}),
    };
  }

  const mode = String(visibility || 'internal_only');
  if (mode === 'case_members') {
    return { mode: 'case_members' };
  }
  if (mode === 'internal_only') {
    return { mode: 'internal_only' };
  }
  if (mode === 'selected_members' || mode === 'selected_parties') {
    return { mode };
  }

  return { mode: 'internal_only' };
}

export function caseVisibilityMode(visibility: CaseVisibility | null | undefined): string {
  if (visibility && typeof visibility === 'object') {
    return String(visibility.mode || 'internal_only');
  }
  return String(visibility || 'internal_only');
}

export function isVisibleToCaseClient(
  visibility: CaseVisibility | null | undefined,
  membership?: Pick<CaseMembership, 'id' | 'userId'> | null
): boolean {
  const mode = caseVisibilityMode(visibility);
  if (mode === 'internal_only') {
    return false;
  }
  if (mode === 'case_members') {
    return true;
  }
  if (mode === 'selected_members') {
    if (!membership || !visibility || typeof visibility !== 'object') {
      return false;
    }
    const allowed = new Set((visibility.memberIds || []).map((id) => String(id)));
    return [membership.id, membership.userId].some((id) => id && allowed.has(String(id)));
  }
  if (mode === 'selected_parties') {
    return false;
  }
  return false;
}
