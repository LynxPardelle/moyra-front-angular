import { ApiRuntime, CognitoRuntime, Global, apiUrl } from './global';

describe('API runtime configuration', () => {
  it('routes local development API calls through the Angular proxy', () => {
    expect(ApiRuntime.url).toBe('/api/v2');
    expect(Global.url).toBe('/api/v2');
    expect(ApiRuntime.isV2).toBeTrue();
    expect(apiUrl('/auth/login')).toBe('/api/v2/auth/login');
    expect(CognitoRuntime.endpoint).toBe('https://cognito-idp.us-east-1.amazonaws.com/');
    expect(CognitoRuntime.userPoolClientId).toBe('4enfk4kbskekcodme7n80d10ju');
  });
});
