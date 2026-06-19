import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { QuillEditorComponent } from 'ngx-quill';

@Component({
  selector: 'app-rich-text-editor',
  imports: [FormsModule, QuillEditorComponent],
  templateUrl: './rich-text-editor.component.html',
  styleUrls: ['./rich-text-editor.component.scss'],
})
export class RichTextEditorComponent {
  @Input() value = '';
  @Input() label = '';
  @Input() help = '';
  @Input() placeholder = 'Escribe el contenido...';
  @Input() minHeight = '260px';
  @Output() valueChange = new EventEmitter<string>();

  public readonly editorModules = {
    toolbar: [
      [{ header: [2, 3, 4, false] }],
      ['bold', 'italic', 'underline', 'strike'],
      [{ list: 'ordered' }, { list: 'bullet' }],
      ['blockquote'],
      ['link'],
      ['clean'],
    ],
  };

  updateValue(value: string): void {
    this.value = value || '';
    this.valueChange.emit(this.value);
  }
}
