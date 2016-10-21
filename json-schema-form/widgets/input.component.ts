import { Component, Input, OnInit } from '@angular/core';
import { FormGroup } from '@angular/forms';

import { JsonPointer } from '../utilities/jsonpointer';

@Component({
  selector: 'input-widget',
  template: `
    <div [formGroup]="formControlGroup">
      <input
        [formControlName]="layoutNode?.name"
        [id]="layoutNode?.name"
        [class]="layoutNode?.fieldHtmlClass"
        [type]="layoutNode?.type"
        [name]="layoutNode?.name"
        [attr.minlength]="layoutNode?.minLength || layoutNode?.minlength"
        [attr.maxlength]="layoutNode?.maxLength || layoutNode?.maxlength"
        [attr.pattern]="layoutNode?.pattern"
        [attr.placeholder]="layoutNode?.placeholder"
        [attr.readonly]="layoutNode?.readonly ? 'readonly' : null"
        [attr.required]="layoutNode?.required">
    </div>`,
})
export class InputComponent implements OnInit {
  private formControlGroup: any;
  @Input() formGroup: FormGroup;
  @Input() layoutNode: any;
  @Input() formOptions: any;

  ngOnInit() {
    this.formControlGroup = JsonPointer.getFormControl(this.formGroup, this.layoutNode.pointer, true);
  }
}
