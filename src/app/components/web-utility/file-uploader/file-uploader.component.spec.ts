import { TemplateRef } from '@angular/core';
import { ComponentFixture, fakeAsync, TestBed, tick } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { provideHttpClientTesting } from '@angular/common/http/testing';

import { FileUploaderComponent } from './file-uploader.component';
import { BsModalService } from 'ngx-bootstrap/modal';

describe('FileUploaderComponent', () => {
  let component: FileUploaderComponent;
  let fixture: ComponentFixture<FileUploaderComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FileUploaderComponent],
      providers: [BsModalService, provideHttpClient(), provideHttpClientTesting()],
    })
      .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(FileUploaderComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });

  it('waits for the parent to create a solution before opening the uploader', fakeAsync(() => {
    const modalService = TestBed.inject(BsModalService);
    const showSpy = spyOn(modalService, 'show').and.returnValue({} as any);
    const template = {} as TemplateRef<any>;
    component.id = '';
    component.type = 'servicio';
    component.typeMeta = 'one';
    component.typeThingComRes = 'servicio';
    component.pre_loader.subscribe((request: any) => {
      setTimeout(() => {
        request.complete('solution-123');
      }, 20);
    });

    component.openModal(template);
    tick(19);

    expect(showSpy).not.toHaveBeenCalled();

    tick(1);

    expect(component.id).toBe('solution-123');
    expect(showSpy).toHaveBeenCalledOnceWith(template);
  }));
});
