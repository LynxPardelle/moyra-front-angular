import { Component, Inject, OnInit, PLATFORM_ID, effect } from '@angular/core';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { Router, RouterLink, RouterOutlet } from '@angular/router';
import { AuthFacade } from '../store/auth/auth.facade';
import { CasesFeatureService } from '../components/cases/cases-feature.service';

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
    private _casesFeature: CasesFeatureService,
    private _router: Router,
    @Inject(PLATFORM_ID) private platformId: object
  ) {
    effect(() => {
      if (
        isPlatformBrowser(this.platformId) &&
        this._authFacade.hydrated() &&
        !this._authFacade.isAdmin() &&
        !this._authFacade.isLegalStaff()
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

  casesFeatureEnabled(): boolean {
    return this._casesFeature.isEnabled();
  }

  isAdminUser(): boolean {
    return this._authFacade.isAdmin();
  }

  showAdminMenu(): boolean {
    return !this._authFacade.hydrated() || this._authFacade.isAdmin();
  }

  panelTitle(): string {
    return this.showAdminMenu() ? 'Panel de administración' : 'Panel de casos';
  }
}
