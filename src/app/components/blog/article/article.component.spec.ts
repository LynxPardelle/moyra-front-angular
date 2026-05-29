import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { ArticleComponent } from './article.component';
import { ArticleService } from '../../../services/article.service';
import { WebService } from '../../../services/web.service';
import { BsModalService } from 'ngx-bootstrap/modal';

describe('ArticleComponent', () => {
  let component: ArticleComponent;
  let fixture: ComponentFixture<ArticleComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ArticleComponent],
      providers: [
        ArticleService,
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
    fixture = TestBed.createComponent(ArticleComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('counts visible words across rich HTML intro, sections, and outro', () => {
    component.article.intro = '<p>Intro&nbsp;del&nbsp;artículo</p>';
    component.articleSections = [
      {
        title: 'Sección',
        text: '<h3>Este&nbsp;es&nbsp;un&nbsp;título</h3><p>Esto&nbsp;no&nbsp;es&nbsp;un&nbsp;título</p>',
      } as any,
    ];
    component.article.outro = '<p>Cierre&nbsp;final</p>';

    expect(component.contentWordCount()).toBe(14);
  });
});
