// This file can be replaced during build by using the `fileReplacements` array.
// `ng build` replaces `environment.ts` with `environment.prod.ts`.
// The list of file replacements can be found in `angular.json`.

export const environment = {
  production: false,
  apiBaseUrl: '/api/v2',
  cognitoRegion: 'us-east-1',
  cognitoUserPoolClientId: '4enfk4kbskekcodme7n80d10ju',
  casesFeatureEnabled: false,
  caseServiceWorkerEnabled: false,
  caseWebPushPublicKey: '',
};

/*
 * For easier debugging in development mode, you can import the following file
 * to ignore zone related error stack frames such as `zone.run`, `zoneDelegate.invokeTask`.
 *
 * This import should be commented out in production mode because it will have a negative impact
 * on performance if an error is thrown.
 */
// import 'zone.js/plugins/zone-error';  // Included with Angular CLI.
