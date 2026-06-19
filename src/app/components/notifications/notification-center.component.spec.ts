import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';

import { NotificationCenterComponent } from './notification-center.component';
import { CaseNotification } from '../../models/case';
import { CaseService } from '../../services/case.service';

describe('NotificationCenterComponent', () => {
  let fixture: ComponentFixture<NotificationCenterComponent>;
  let notifications: CaseNotification[];
  let markReadSpy: jasmine.Spy;
  let markAllSpy: jasmine.Spy;

  beforeEach(async () => {
    notifications = [
      notification('notification-1', 'case-1', null),
      notification('notification-2', 'case-2', '2026-06-18T20:00:00.000Z'),
    ];
    markReadSpy = jasmine.createSpy('markNotificationRead').and.returnValue(
      of({
        status: 'success',
        item: {
          ...notifications[0],
          readAt: '2026-06-18T21:00:00.000Z',
        },
      })
    );
    markAllSpy = jasmine
      .createSpy('markAllNotificationsRead')
      .and.returnValue(of({ status: 'success', updatedCount: 1 }));

    await TestBed.configureTestingModule({
      imports: [NotificationCenterComponent],
      providers: [
        provideRouter([]),
        {
          provide: CaseService,
          useValue: {
            listNotifications: () =>
              of({ status: 'success', items: notifications, nextToken: null }),
            markNotificationRead: markReadSpy,
            markAllNotificationsRead: markAllSpy,
          },
        },
      ],
    }).compileComponents();
  });

  it('renders notifications with authenticated case links', () => {
    fixture = TestBed.createComponent(NotificationCenterComponent);
    fixture.detectChanges();

    const compiled = fixture.nativeElement as HTMLElement;
    const text = compiled.textContent || '';

    expect(text).toContain('Nueva actualización');
    expect(text).toContain('Sin leer');
    expect(text).toContain('Leída');
    expect(compiled.querySelector('a[href="/casos/case-1"]')).not.toBeNull();
    expect(compiled.querySelector('a[href="/notificaciones/preferencias"]')).not.toBeNull();
    expect(compiled.querySelector('a[href*="publication"]')).toBeNull();
  });

  it('marks one notification and all notifications as read', () => {
    fixture = TestBed.createComponent(NotificationCenterComponent);
    fixture.detectChanges();

    fixture.componentInstance.markRead('notification-1');
    fixture.componentInstance.markAllRead();
    fixture.detectChanges();

    expect(markReadSpy).toHaveBeenCalledWith('notification-1');
    expect(markAllSpy).toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).not.toContain('Sin leer');
  });
});

function notification(id: string, caseId: string, readAt: string | null): CaseNotification {
  return {
    id,
    recipientUserId: 'client-1',
    caseId,
    eventType: 'case.entry.created',
    targetType: 'case-entry',
    targetId: 'entry-1',
    title: 'Nueva actualización',
    body: 'Hay una nueva actualización disponible.',
    link: { path: `/casos/${caseId}` },
    readAt: readAt || undefined,
    delivery: {
      inApp: { status: 'created' },
      email: { status: 'skipped' },
      webPush: { status: 'skipped' },
    },
  };
}
