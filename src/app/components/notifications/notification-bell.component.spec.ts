import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';

import { NotificationBellComponent } from './notification-bell.component';
import { CaseService } from '../../services/case.service';

describe('NotificationBellComponent', () => {
  let fixture: ComponentFixture<NotificationBellComponent>;
  let unreadCountFails: boolean;

  beforeEach(async () => {
    unreadCountFails = false;

    await TestBed.configureTestingModule({
      imports: [NotificationBellComponent],
      providers: [
        provideRouter([]),
        {
          provide: CaseService,
          useValue: {
            getUnreadNotificationCount: () =>
              unreadCountFails
                ? throwError(() => new Error('falló'))
                : of({ status: 'success', count: 3 }),
          },
        },
      ],
    }).compileComponents();
  });

  it('shows unread count as an authenticated private notifications link', () => {
    fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/notificaciones"]');
    const badge = fixture.nativeElement.querySelector('.notification-bell__badge');
    expect(link?.textContent).toContain('Notificaciones');
    expect(badge?.textContent).toContain('3');
  });

  it('can close the menu offcanvas after navigating from the menu', () => {
    fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.componentInstance.dismissOffcanvas = true;
    fixture.detectChanges();

    const link = fixture.nativeElement.querySelector('a[href="/notificaciones"]');
    expect(link?.getAttribute('data-bs-dismiss')).toBe('offcanvas');
  });

  it('fails closed without rendering a stale count', () => {
    unreadCountFails = true;

    fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Notificaciones');
    expect(fixture.nativeElement.textContent).not.toContain('3');
  });
});
