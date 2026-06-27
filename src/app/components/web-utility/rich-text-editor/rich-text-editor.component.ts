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
  @Input() disabled = false;
  @Output() valueChange = new EventEmitter<string>();
  private editor: any;

  public readonly editorModules = {
    toolbar: {
      container: [
        [{ header: [2, 3, 4, false] }],
        ['bold', 'italic', 'underline', 'strike'],
        [{ list: 'ordered' }, { list: 'bullet' }],
        ['blockquote'],
        ['link'],
        ['clean'],
      ],
      handlers: {
        clean: () => this.clearFormatting(),
      },
    },
  };

  onEditorCreated(editor: any): void {
    this.editor = editor;
  }

  updateValue(value: string): void {
    this.value = value || '';
    this.valueChange.emit(this.value);
  }

  clearFormatting(): void {
    if (!this.editor || this.disabled) {
      return;
    }

    const selection = this.editor.getSelection?.();
    const index = selection?.index ?? 0;
    const length = selection?.length || Math.max((this.editor.getLength?.() || 1) - 1, 0);
    if (length > 0) {
      this.editor.removeFormat(index, length, 'user');
    }
    this.updateValue(this.editor.root?.innerHTML || '');
  }
}
