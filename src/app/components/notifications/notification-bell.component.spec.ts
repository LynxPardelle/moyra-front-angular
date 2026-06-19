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
    expect(link?.textContent).toContain('Notificaciones');
    expect(link?.textContent).toContain('3');
  });

  it('fails closed without rendering a stale count', () => {
    unreadCountFails = true;

    fixture = TestBed.createComponent(NotificationBellComponent);
    fixture.detectChanges();

    expect(fixture.nativeElement.textContent).toContain('Notificaciones');
    expect(fixture.nativeElement.textContent).not.toContain('3');
  });
});
