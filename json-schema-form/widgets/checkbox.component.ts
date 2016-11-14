import { Component, Input, OnInit } from '@angular/core';
import { AbstractControl } from '@angular/forms';

import { JsonSchemaFormService } from '../json-schema-form.service';

@Component({
  selector: 'checkbox-widget',
  template: `
    <label
      [attr.for]="layoutNode?.dataPointer"
      [class]="options?.itemLabelHtmlClass">
      <input
        [attr.aria-describedby]="layoutNode?.dataPointer + 'Status'"
        [checked]="isChecked ? 'checked' : null"
        [class]="options?.fieldHtmlClass + (isChecked ?
          (' ' + options?.activeClass + ' ' + options?.style?.selected) :
          (' ' + options?.style?.unselected))"
        [disabled]="controlDisabled"
        [id]="layoutNode?.dataPointer"
        [name]="controlName"
        [readonly]="options?.readonly ? 'readonly' : null"
        [value]="controlValue"
        type="checkbox">
      <span *ngIf="options?.title"
        [class.sr-only]="options?.notitle"
        [innerHTML]="options?.title"></span>
    </label>`,
})
export class CheckboxComponent implements OnInit {
  private formControl: AbstractControl;
  private controlName: string;
  private controlValue: any;
  private controlDisabled: boolean = false;
  private boundControl: boolean = false;
  private options: any;
  @Input() layoutNode: any;
  @Input() layoutIndex: number[];
  @Input() dataIndex: number[];

  constructor(
    private jsf: JsonSchemaFormService
  ) { }

  ngOnInit() {
    this.options = this.layoutNode.options;
    this.jsf.initializeControl(this);
    if (this.controlValue === null || this.controlValue === undefined) {
      this.controlValue = this.options.title;
    }
  }

  private updateValue(event) {
    event.preventDefault;
    this.jsf.updateValue(this, event);
  }

  private get isChecked() {
    return this.jsf.getControlValue(this);
  }
}
