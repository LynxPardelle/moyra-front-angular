import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { Subject, of } from 'rxjs';
import { SwPush } from '@angular/service-worker';

import {
  CASE_BROWSER_USER_AGENT,
  CASE_WEB_PUSH_PUBLIC_KEY,
  CaseWebPushService,
} from './case-web-push.service';
import { CaseService } from '../../services/case.service';

describe('CaseWebPushService', () => {
  let clicks$: Subject<any>;
  let requestSubscriptionSpy: jasmine.Spy;
  let unsubscribeSpy: jasmine.Spy;
  let registerPushSpy: jasmine.Spy;
  let deletePushSpy: jasmine.Spy;
  let navigateByUrlSpy: jasmine.Spy;
  let swPushEnabled: boolean;
  let userAgent: string;

  beforeEach(() => {
    clicks$ = new Subject<any>();
    swPushEnabled = true;
    userAgent = 'Chrome Headless';
    requestSubscriptionSpy = jasmine.createSpy('requestSubscription').and.resolveTo({
      toJSON: () => ({
        endpoint: 'https://push.example.test/endpoint',
        keys: {
          p256dh: 'p256dh-key',
          auth: 'auth-key',
        },
      }),
    });
    unsubscribeSpy = jasmine.createSpy('unsubscribe').and.resolveTo();
    registerPushSpy = jasmine.createSpy('registerPushSubscription').and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'push-1',
          userId: 'client-1',
          endpointHash: 'hash',
          status: 'active',
        },
      })
    );
    deletePushSpy = jasmine.createSpy('deletePushSubscription').and.returnValue(
      of({
        status: 'success',
        item: {
          id: 'push-1',
          userId: 'client-1',
          endpointHash: 'hash',
          status: 'disabled',
        },
      })
    );
    navigateByUrlSpy = jasmine.createSpy('navigateByUrl');

    TestBed.configureTestingModule({
      providers: [
        CaseWebPushService,
        { provide: CASE_WEB_PUSH_PUBLIC_KEY, useValue: 'public-vapid-key' },
        {
          provide: SwPush,
          useValue: {
            get isEnabled() {
              return swPushEnabled;
            },
            requestSubscription: requestSubscriptionSpy,
            unsubscribe: unsubscribeSpy,
            notificationClicks: clicks$.asObservable(),
          },
        },
        {
          provide: CaseService,
          useValue: {
            registerPushSubscription: registerPushSpy,
            listPushSubscriptions: () =>
              of({
                status: 'success',
                items: [
                  {
                    id: 'push-1',
                    userId: 'client-1',
                    endpointHash: 'hash',
                    status: 'active',
                  },
                ],
              }),
            deletePushSubscription: deletePushSpy,
          },
        },
        {
          provide: Router,
          useValue: {
            navigateByUrl: navigateByUrlSpy,
          },
        },
        {
          provide: CASE_BROWSER_USER_AGENT,
          useValue: userAgent,
        },
      ],
    });
  });

  it('does not request browser permission until explicit enable is called', () => {
    TestBed.inject(CaseWebPushService);

    expect(requestSubscriptionSpy).not.toHaveBeenCalled();
  });

  it('requests a subscription on explicit action and stores only through the API', async () => {
    const service = TestBed.inject(CaseWebPushService);

    await service.enableBrowserPush();

    expect(requestSubscriptionSpy).toHaveBeenCalledWith({ serverPublicKey: 'public-vapid-key' });
    expect(registerPushSpy).toHaveBeenCalledWith({
      endpoint: 'https://push.example.test/endpoint',
      keys: {
        p256dh: 'p256dh-key',
        auth: 'auth-key',
      },
      userAgent,
    });
  });

  it('reports unavailable when service worker or VAPID public key is missing', () => {
    swPushEnabled = false;
    const service = TestBed.inject(CaseWebPushService);

    expect(service.isBrowserPushSupported()).toBeFalse();
  });

  it('disables active push subscriptions and unsubscribes the browser', async () => {
    const service = TestBed.inject(CaseWebPushService);

    await service.disableBrowserPush();

    expect(deletePushSpy).toHaveBeenCalledWith('push-1');
    expect(unsubscribeSpy).toHaveBeenCalled();
  });

  it('routes notification clicks only to authenticated case paths', () => {
    const service = TestBed.inject(CaseWebPushService);
    service.startNotificationClickRouting();

    clicks$.next({ notification: { data: { path: '/casos/case-1' } } });
    clicks$.next({ notification: { data: { path: 'https://evil.example.test' } } });

    expect(navigateByUrlSpy).toHaveBeenCalledOnceWith('/casos/case-1');
  });
});
