import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { NotificationPreferencesComponent } from './notification-preferences.component';
import { CaseService } from '../../services/case.service';
import { CaseWebPushService } from './case-web-push.service';

describe('NotificationPreferencesComponent', () => {
  let fixture: ComponentFixture<NotificationPreferencesComponent>;
  let updatePreferencesSpy: jasmine.Spy;
  let enableBrowserPushSpy: jasmine.Spy;
  let disableBrowserPushSpy: jasmine.Spy;
  let saveFails: boolean;
  let pushSupported: boolean;

  beforeEach(async () => {
    saveFails = false;
    pushSupported = true;
    updatePreferencesSpy = jasmine.createSpy('updateNotificationPreferences').and.callFake((body) =>
      saveFails
        ? throwError(() => new Error('falló'))
        : of({
            status: 'success',
            item: {
              id: 'client-1',
              ...body,
            },
          })
    );
    enableBrowserPushSpy = jasmine.createSpy('enableBrowserPush').and.resolveTo();
    disableBrowserPushSpy = jasmine.createSpy('disableBrowserPush').and.resolveTo();

    await TestBed.configureTestingModule({
      imports: [NotificationPreferencesComponent],
      providers: [
        provideRouter([]),
        {
          provide: CaseService,
          useValue: {
            getNotificationPreferences: () =>
              of({
                status: 'success',
                item: {
                  id: 'client-1',
                  email: {
                    available: true,
                    enabled: true,
                    entryCreated: true,
                    commentCreated: true,
                    fileVisibilityApproved: false,
                    statusChanged: true,
                  },
                  webPush: {
                    available: true,
                    enabled: false,
                  },
                },
              }),
            updateNotificationPreferences: updatePreferencesSpy,
          },
        },
        {
          provide: CaseWebPushService,
          useValue: {
            isBrowserPushSupported: () => pushSupported,
            enableBrowserPush: enableBrowserPushSpy,
            disableBrowserPush: disableBrowserPushSpy,
          },
        },
      ],
    }).compileComponents();
  });

  function render(): void {
    fixture = TestBed.createComponent(NotificationPreferencesComponent);
    fixture.detectChanges();
  }

  it('renders email preferences and saves server-side changes', () => {
    render();

    expect(fixture.nativeElement.textContent).toContain('Correo electrónico');
    expect(fixture.nativeElement.textContent).toContain('Comentarios nuevos');

    fixture.componentInstance.preferences!.email.commentCreated = false;
    fixture.componentInstance.savePreferences();

    expect(updatePreferencesSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        email: jasmine.objectContaining({
          commentCreated: false,
        }),
      })
    );
  });

  it('shows unavailable channel explanations without prompting for push', () => {
    pushSupported = false;

    render();

    expect(fixture.nativeElement.textContent).toContain('Push del navegador no está disponible');
    expect(enableBrowserPushSpy).not.toHaveBeenCalled();
  });

  it('enables browser push only from an explicit user action and saves preference', async () => {
    render();

    await fixture.componentInstance.enablePush();

    expect(enableBrowserPushSpy).toHaveBeenCalled();
    expect(updatePreferencesSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        webPush: jasmine.objectContaining({ enabled: true }),
      })
    );
  });

  it('disables browser push and persists the opt-out', async () => {
    render();
    fixture.componentInstance.preferences!.webPush.enabled = true;

    await fixture.componentInstance.disablePush();

    expect(disableBrowserPushSpy).toHaveBeenCalled();
    expect(updatePreferencesSpy).toHaveBeenCalledWith(
      jasmine.objectContaining({
        webPush: jasmine.objectContaining({ enabled: false }),
      })
    );
  });

  it('shows an error when saving preferences fails', () => {
    saveFails = true;
    render();

    fixture.componentInstance.savePreferences();
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('No se pudieron guardar');
  });
});
