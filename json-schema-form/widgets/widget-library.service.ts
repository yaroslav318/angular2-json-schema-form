import { Injectable } from '@angular/core';

import { ArrayComponent } from './array.component';
import { ButtonComponent } from './button.component';
import { CheckboxComponent } from './checkbox.component';
import { CheckboxesComponent } from './checkboxes.component';
import { FieldsetComponent } from './fieldset.component';
import { FileComponent } from './file.component';
import { HiddenComponent } from './hidden.component';
import { InputComponent } from './input.component';
import { NoneComponent } from './none.component';
import { NumberComponent } from './number.component';
import { MessageComponent } from './message.component';
import { RadiosComponent } from './radios.component';
import { RadiosInlineComponent } from './radios-inline.component';
import { RootComponent } from './root.component';
import { SectionComponent } from './section.component';
import { SelectComponent } from './select.component';
import { SubmitComponent } from './submit.component';
import { TabComponent } from './tab.component';
import { TabarrayComponent } from './tabarray.component';
import { TemplateComponent } from './template.component';
import { TextareaComponent } from './textarea.component';

@Injectable()
export class WidgetLibraryService {

  private defaultWidget: string = 'null';
  private widgets: { [type: string]: any } = {

  // Angular 2 JSON Schema Form administrative widgets
    'root': RootComponent, // form root, accepts a 'layout' input
    'none': NoneComponent, // placeholder, dispalys nothing

  // Free-form text HTML 'input' form control widgets
    'email': InputComponent,
    'integer': NumberComponent, // Note: integer is not a recognized HTML input type
    'number': NumberComponent,
    'password': InputComponent,
    'search': InputComponent,
    'tel': InputComponent,
    'text': InputComponent,
    'url': InputComponent,

  // Controlled text HTML 'input' form control widgets
    'color': InputComponent,
    'date': InputComponent,
    'datetime': InputComponent,
    'datetime-local': InputComponent,
    'month': InputComponent,
    'range': NumberComponent,
    'time': InputComponent,
    'week': InputComponent,

  // Non-text HTML 'input' form control widgets
    // 'button': <input type="button"> not used, replaced with <button>
    'checkbox': CheckboxComponent, // set ternaryAllowed = true for 3-state ??
    'file': FileComponent,
    'hidden': InputComponent,
    // 'image': InputComponent, // ??
    // 'radio': InputComponent, // ??
    'reset': SubmitComponent,
    'submit': SubmitComponent,

  // Other (non-'input') HTML form control widgets
    'button': ButtonComponent,
    'select': SelectComponent,
    // 'optgroup': automatically generated by select widgets
    // 'option': automatically generated by select widgets
    'textarea': TextareaComponent,

  // HTML form control widget sets
    'checkboxes': CheckboxesComponent, // grouped list of checkboxes
    'checkboxes-inline': CheckboxesComponent, // checkboxes in one line
    'radios': RadiosComponent, // grouped list of radio buttons
    'radios-inline': RadiosInlineComponent, // radio buttons in one line
    'radiobuttons': RadiosInlineComponent, // radio buttons with bootstrap buttons

  // HTML Layout widgets
    // 'label': automatically generated by frameworks for form control widgets
    'fieldset': FieldsetComponent, // a fieldset, with an optional legend
    // 'legend': automatically generated by frameworks for fieldsets

  // Non-HTML layout widgets
    'array': ArrayComponent, // a list you can add, remove and reorder
    'tabarray': TabarrayComponent, // a tabbed version of array
    'tab': TabComponent, // 'tabarray' item, similar to a fieldset or section
    'help': MessageComponent, // insert arbitrary html
    'message': MessageComponent, // insert arbitrary html
    'msg': MessageComponent, // insert arbitrary html
    'template': TemplateComponent, // 'template' input accepts any Angular 2 component

  // Widgets included for backward-compatibility with JSON Form API
    'advancedfieldset': SectionComponent, // Adds 'Advanced settings' title
    'authfieldset': SectionComponent, // Adds 'Authentication settings' title
    'selectfieldset': SectionComponent, // Select control, displays 1 array sub-item
    'optionfieldset': SectionComponent, // Option control, displays 1 array sub-item

  // Widgets included for backward-compatibility with React JSON Schema Form API
    'updown': NumberComponent,
    'date-time': InputComponent,
    'alt-datetime': InputComponent,
    'alt-date': InputComponent,

  // Widgets included for backward-compatibility with Angular Schema Form API
    'actions': NoneComponent,
      // horizontal button list, can only submit, uses buttons as items
    'section': SectionComponent, // just a div
    'conditional': SectionComponent, // identical to 'section' (depeciated)

  // Recommended 3rd-party add-on widgets
    // 'pikaday': Pikaday date picker - https://github.com/dbushell/Pikaday
    // 'spectrum': Spectrum color picker - http://bgrins.github.io/spectrum
    // 'ace': ACE code editor - https://ace.c9.io
    // 'ckeditor': CKEditor HTML / rich text editor - http://ckeditor.com
    // 'tinymce': TinyMCE HTML / rich text editor - https://www.tinymce.com
    // 'imageselect': Bootstrap drop-down image selector -
    //   http://silviomoreto.github.io/bootstrap-select
    // 'wysihtml5': HTML editor - http://jhollingworth.github.io/bootstrap-wysihtml5
    // 'quill': Quill HTML / rich text editor (?) - https://quilljs.com
  };

  public setDefaultWidget(type: string) {
    if (!this.hasWidget(type)) return false;
    this.defaultWidget = type;
    return true;
  }

  public hasWidget(type: string) {
    if (!type || typeof type !== 'string') return false;
    return this.widgets.hasOwnProperty(type);
  }

  public registerWidget(type: string, widget: any) {
    if (!type || !widget || typeof type !== 'string') return false;
    this.widgets[type] = widget;
    return true;
  }

  public getWidget(type?: string): any {
    if (this.hasWidget(type)) return this.widgets[type];
    if (type === 'all') return this.widgets;
    return this.widgets[this.defaultWidget];
  }
}
