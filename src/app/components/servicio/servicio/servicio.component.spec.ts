import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';
import { ActivatedRoute, provideRouter } from '@angular/router';

import { ServicioComponent } from './servicio.component';
import { ServicioService } from '../../../services/servicio.service';
import { WebService } from '../../../services/web.service';
import { BsModalService } from 'ngx-bootstrap/modal';

describe('ServicioComponent', () => {
  let component: ServicioComponent;
  let fixture: ComponentFixture<ServicioComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ServicioComponent],
      providers: [
        ServicioService,
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
    fixture = TestBed.createComponent(ServicioComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('renders explicit labels for solution edit and delete controls', () => {
    component.canChange = true;
    component.isAdmin = true;
    component.servicio = {
      _id: 'solution-123',
      title: 'Solución de prueba',
      desc: '',
      urltitle: 'solucion-de-prueba',
    } as any;
    component.editSwitch = false;
    fixture.detectChanges();

    let labels = Array.from(
      fixture.nativeElement.querySelectorAll('.solution-admin-actions button')
    ).map((button: any) => button.textContent.trim());

    expect(labels).toEqual(['Editar', 'Eliminar']);

    component.editSwitch = true;
    fixture.detectChanges();
    labels = Array.from(
      fixture.nativeElement.querySelectorAll('.solution-admin-actions button')
    ).map((button: any) => button.textContent.trim());

    expect(labels).toEqual(['Cerrar', 'Eliminar']);
  });
});
