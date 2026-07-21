import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of } from 'rxjs';

import { ArchivosComponent } from './archivos.component';
import { FileService } from '../services/file.service';
import { ApiRuntime } from '../services/global';

describe('ArchivosComponent', () => {
  let component: ArchivosComponent;
  let fixture: ComponentFixture<ArchivosComponent>;
  let originalApiUrl: string;

  beforeEach(async () => {
    originalApiUrl = ApiRuntime.url;
    ApiRuntime.url = 'https://api.test.moyra.org/api/v2';

    await TestBed.configureTestingModule({
      imports: [ArchivosComponent],
      providers: [
        {
          provide: FileService,
          useValue: {
            getFiles: () => of({ files: [] }),
          },
        },
      ],
    }).compileComponents();

    fixture = TestBed.createComponent(ArchivosComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  afterEach(() => {
    ApiRuntime.url = originalApiUrl;
  });

  it('opens API-relative inventory links on the configured API host', () => {
    expect(component.fileUrl({ url: '/api/v2/files/servicio/imagen.jpg' })).toBe(
      'https://api.test.moyra.org/api/v2/files/servicio/imagen.jpg'
    );
  });

  it('preserves absolute external file URLs', () => {
    expect(component.fileUrl({ url: 'https://cdn.example.com/imagen.jpg' })).toBe(
      'https://cdn.example.com/imagen.jpg'
    );
  });
});
