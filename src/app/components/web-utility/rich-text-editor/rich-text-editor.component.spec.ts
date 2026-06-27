import { RichTextEditorComponent } from './rich-text-editor.component';

describe('RichTextEditorComponent', () => {
  it('clears formatting for the active selection', () => {
    const component = new RichTextEditorComponent();
    const editor = {
      root: { innerHTML: '<p>Texto limpio</p>' },
      getSelection: () => ({ index: 2, length: 5 }),
      getLength: () => 12,
      removeFormat: jasmine.createSpy('removeFormat'),
    };
    spyOn(component.valueChange, 'emit');

    component.onEditorCreated(editor);
    component.clearFormatting();

    expect(editor.removeFormat).toHaveBeenCalledWith(2, 5, 'user');
    expect(component.valueChange.emit).toHaveBeenCalledWith('<p>Texto limpio</p>');
  });
});
