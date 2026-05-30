import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { PublicationComponent } from './publication.component';
import { PublicationService } from '../../../services/publication.service';
import { WebService } from '../../../services/web.service';
import { BsModalService } from 'ngx-bootstrap/modal';

describe('PublicationComponent', () => {
  let component: PublicationComponent;
  let fixture: ComponentFixture<PublicationComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PublicationComponent],
      providers: [
        PublicationService,
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
    fixture = TestBed.createComponent(PublicationComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('counts visible words in rich HTML content with non-breaking spaces', () => {
    component.publication.text =
      '<h2>Este&nbsp;es&nbsp;un&nbsp;título</h2><p>Esto&nbsp;no&nbsp;es&nbsp;un&nbsp;título</p>';

    expect(component.contentWordCount()).toBe(9);
  });
});
