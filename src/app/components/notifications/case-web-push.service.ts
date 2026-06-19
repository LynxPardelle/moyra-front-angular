import { Inject, Injectable, InjectionToken, Optional } from '@angular/core';
import { Router } from '@angular/router';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom } from 'rxjs';

import { environment } from '../../../environments/environment';
import { CaseService } from '../../services/case.service';

export const CASE_WEB_PUSH_PUBLIC_KEY = new InjectionToken<string>(
  'CASE_WEB_PUSH_PUBLIC_KEY',
  {
    providedIn: 'root',
    factory: () => environment.caseWebPushPublicKey || '',
  }
);

export const CASE_BROWSER_USER_AGENT = new InjectionToken<string>(
  'CASE_BROWSER_USER_AGENT',
  {
    providedIn: 'root',
    factory: () => (typeof navigator === 'undefined' ? '' : navigator.userAgent),
  }
);

@Injectable({ providedIn: 'root' })
export class CaseWebPushService {
  private clickRoutingStarted = false;

  constructor(
    @Optional() private _swPush: SwPush | null,
    private _caseService: CaseService,
    private _router: Router,
    @Inject(CASE_WEB_PUSH_PUBLIC_KEY) private _publicKey: string,
    @Inject(CASE_BROWSER_USER_AGENT) private _userAgent: string
  ) {}

  isBrowserPushSupported(): boolean {
    return Boolean(this._swPush?.isEnabled && this._publicKey);
  }

  async enableBrowserPush(): Promise<void> {
    if (!this.isBrowserPushSupported() || !this._swPush) {
      throw new Error('Browser push is unavailable.');
    }

    const subscription = await this._swPush.requestSubscription({
      serverPublicKey: this._publicKey,
    });
    const payload = this.serializeSubscription(subscription);
    await firstValueFrom(
      this._caseService.registerPushSubscription({
        ...payload,
        userAgent: this._userAgent,
      })
    );
  }

  async disableBrowserPush(): Promise<void> {
    const subscriptions = await firstValueFrom(this._caseService.listPushSubscriptions());
    await Promise.all(
      (subscriptions.items || []).map((subscription) =>
        firstValueFrom(this._caseService.deletePushSubscription(subscription.id))
      )
    );

    if (this._swPush?.isEnabled) {
      try {
        await this._swPush.unsubscribe();
      } catch {
        // The backend opt-out is authoritative; browser unsubscribe can fail if no local subscription exists.
      }
    }
  }

  startNotificationClickRouting(): void {
    if (!this._swPush?.notificationClicks || this.clickRoutingStarted) {
      return;
    }

    this.clickRoutingStarted = true;
    this._swPush.notificationClicks.subscribe((event) => {
      const path = this.safeNotificationPath(event?.notification?.data);
      if (path) {
        this._router.navigateByUrl(path);
      }
    });
  }

  private serializeSubscription(subscription: PushSubscription): {
    endpoint: string;
    keys: { p256dh: string; auth: string };
  } {
    const json = subscription.toJSON() as {
      endpoint?: string;
      keys?: { p256dh?: string; auth?: string };
    };
    const endpoint = json.endpoint || subscription.endpoint;
    const keys = json.keys || {};
    if (!endpoint || !keys.p256dh || !keys.auth) {
      throw new Error('Incomplete push subscription.');
    }
    return {
      endpoint,
      keys: {
        p256dh: keys.p256dh,
        auth: keys.auth,
      },
    };
  }

  private safeNotificationPath(data: unknown): string {
    const value = data && typeof data === 'object' ? data as { path?: unknown; url?: unknown } : {};
    const path = String(value.path || value.url || '');
    return path.startsWith('/casos/') ? path : '';
  }
}
