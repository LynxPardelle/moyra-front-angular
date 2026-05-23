import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { WeComponent } from './we.component';
import { MainService } from '../../../services/main.service';
import { WebService } from '../../../services/web.service';
import { BsModalService } from 'ngx-bootstrap/modal';

describe('WeComponent', () => {
  let component: WeComponent;
  let fixture: ComponentFixture<WeComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [WeComponent],
      providers: [
        MainService,
        WebService,
        BsModalService,
        provideHttpClient(),
        provideHttpClientTesting(),
        provideRouter([]),
        { provide: ActivatedRoute, useValue: { snapshot: { params: {} } } },
      ],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(WeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
