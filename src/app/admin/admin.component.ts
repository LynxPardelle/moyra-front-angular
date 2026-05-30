import { Component, Inject, OnInit, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthFacade } from '../store/auth/auth.facade';

@Component({
  selector: 'app-admin',
  imports: [CommonModule, RouterLink, RouterOutlet],
  templateUrl: './admin.component.html',
  styleUrls: ['./admin.component.scss']
})
export class AdminComponent implements OnInit {
  public showAside: boolean = true;

  constructor(
    private _authFacade: AuthFacade,
    private _router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    effect(() => {
      if (
        isPlatformBrowser(this.platformId) &&
        this._authFacade.hydrated() &&
        !this._authFacade.isAdmin()
      ) {
        void this._router.navigate(['/login']);
      }
    });
  }

  ngOnInit(): void {
  }

  showAsideChanger(){
    this.showAside = !this.showAside;
  }

  logout(): void {
    this._authFacade.logout();
  }
}
