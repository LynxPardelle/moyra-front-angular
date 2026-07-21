import { isVisibleToCaseClient, normalizeCaseVisibilityForApi } from './case-visibility';

describe('case visibility', () => {
  it('allows all case members for the standard case visibility', () => {
    expect(isVisibleToCaseClient({ mode: 'case_members' })).toBeTrue();
  });

  it('denies internal and unknown visibility modes by default', () => {
    expect(isVisibleToCaseClient({ mode: 'internal_only' })).toBeFalse();
    expect(isVisibleToCaseClient({ mode: 'legacy_custom_mode' })).toBeFalse();
  });

  it('normalizes missing or invalid visibility as internal only', () => {
    expect(normalizeCaseVisibilityForApi(undefined)).toEqual({ mode: 'internal_only' });
    expect(normalizeCaseVisibilityForApi({ mode: 'legacy_custom_mode' })).toEqual({
      mode: 'internal_only',
    });
  });

  it('keeps the case members visibility when it is sent as a string', () => {
    expect(normalizeCaseVisibilityForApi('case_members')).toEqual({ mode: 'case_members' });
  });

  it('requires an explicitly selected member for selected member visibility', () => {
    const visibility = { mode: 'selected_members', memberIds: ['membership-1', 'user-2'] };

    expect(isVisibleToCaseClient(visibility, { id: 'membership-1' })).toBeTrue();
    expect(isVisibleToCaseClient(visibility, { id: 'membership-9', userId: 'user-2' })).toBeTrue();
    expect(isVisibleToCaseClient(visibility, { id: 'membership-9', userId: 'user-9' })).toBeFalse();
    expect(isVisibleToCaseClient(visibility)).toBeFalse();
  });
});
