import {
  AfterContentChecked, Component, ComponentFactoryResolver, ComponentRef,
  Input, OnChanges, OnInit, ViewChild, ViewContainerRef
} from '@angular/core';
import { FormGroup } from '@angular/forms';

import {
  addClasses, getControl, inArray, isNumber, JsonPointer, toIndexedPointer
} from '../utilities/index';

@Component({
  moduleId: module.id,
  selector: 'bootstrap3-framework',
  templateUrl: 'bootstrap3.component.html',
  styles: [`
    .list-group-item .form-control-feedback { top: 40; }
    .checkbox { margin-top: 0 }
  `],
})
export class Bootstrap3Component implements OnInit, OnChanges, AfterContentChecked {
  private controlInitialized: boolean = false;
  private displayWidget: boolean = true;
  private options: any;
  private arrayIndex: number;
  private layoutPointer: string;
  private formControl: any = null;
  private debugOutput: any = '';
  @Input() layoutNode: any;
  @Input() formSettings: any;
  @Input() index: number[];
  @Input() debug: boolean;
  @ViewChild('widgetContainer', { read: ViewContainerRef })
    private widgetContainer: ViewContainerRef;

  constructor(
    private componentFactory: ComponentFactoryResolver,
  ) { }

  ngOnInit() {
    this.arrayIndex = this.index[this.index.length - 1];
    if (this.layoutNode) {
      this.options = Object.assign({}, this.layoutNode.options);
      this.layoutPointer =
        toIndexedPointer(this.layoutNode.layoutPointer, this.index);
      this.updateArrayItems();

      if (this.layoutNode.hasOwnProperty('dataPointer')) {
        let thisControl = getControl(this.formSettings.formGroup,
          this.layoutNode.dataPointer);
        if (thisControl) this.formControl = thisControl;
      }

      this.options.isInputWidget = inArray(this.layoutNode.type, [
        'button', 'checkbox', 'checkboxes-inline', 'checkboxes', 'color',
        'date', 'datetime-local', 'datetime', 'email', 'file', 'hidden',
        'image', 'integer', 'month', 'number', 'password', 'radio',
        'radiobuttons', 'radios-inline', 'radios', 'range', 'reset', 'search',
        'select', 'submit', 'tel', 'text', 'textarea', 'time', 'url', 'week'
      ]);

      this.options.title = this.setTitle(this.layoutNode.type);

      this.options.htmlClass = this.options.htmlClass || '';
      this.options.htmlClass = addClasses(this.options.htmlClass,
        'schema-form-' + this.layoutNode.type);
      if (this.layoutNode.type === 'array') {
        this.options.htmlClass = addClasses(this.options.htmlClass,
          'list-group');
      } else if (this.options.isArrayItem && this.layoutNode.type !== '$ref') {
        this.options.htmlClass = addClasses(this.options.htmlClass,
          'list-group-item');
      } else {
        this.options.htmlClass = addClasses(this.options.htmlClass,
          'form-group');
      }
      this.options.htmlClass = addClasses(this.options.htmlClass,
        this.formSettings.globalOptions.formDefaults.htmlClass);
      this.layoutNode.options.htmlClass = '';

      this.options.labelHtmlClass = this.options.labelHtmlClass || '';
      this.options.labelHtmlClass = addClasses(this.options.labelHtmlClass,
        'control-label');
      this.options.labelHtmlClass = addClasses(this.options.labelHtmlClass,
        this.formSettings.globalOptions.formDefaults.labelHtmlClass);

      this.layoutNode.options.fieldHtmlClass =
        this.layoutNode.options.fieldHtmlClass || '';
      this.layoutNode.options.fieldHtmlClass = addClasses(
        this.layoutNode.options.fieldHtmlClass,
        this.formSettings.globalOptions.formDefaults.fieldHtmlClass
      );

      this.options.fieldAddonLeft =
        this.options.fieldAddonLeft || this.options.prepend;

      this.options.fieldAddonRight =
        this.options.fieldAddonRight || this.options.append;

      // Set miscelaneous styles and settings for each control type
      switch (this.layoutNode.type) {
        case 'checkbox':
          this.options.htmlClass = addClasses(this.options.htmlClass, 'checkbox');
        break;
        case 'checkboxes':
          this.options.htmlClass =
            addClasses(this.options.htmlClass, 'checkbox');
        break;
        case 'checkboxes-inline':
          this.options.htmlClass = addClasses(this.options.htmlClass,
            'checkbox-inline');
        break;
        case 'button': case 'submit':
          this.layoutNode.options.fieldHtmlClass =
            addClasses(this.layoutNode.options.fieldHtmlClass, 'btn');
          this.layoutNode.options.fieldHtmlClass = addClasses(
            this.layoutNode.options.fieldHtmlClass,
            this.options.style || 'btn-info'
          );
        break;
        case '$ref':
          this.layoutNode.options.fieldHtmlClass =
            addClasses(this.layoutNode.options.fieldHtmlClass, 'btn pull-right');
          this.layoutNode.options.fieldHtmlClass = addClasses(
            this.layoutNode.options.fieldHtmlClass,
            this.options.style || 'btn-default'
          );
          this.options.icon = 'glyphicon glyphicon-plus';
        break;
        case 'array': case 'fieldset': case 'section': case 'conditional':
          this.options.isRemovable = false;
          this.options.messageLocation = 'top';
          if (this.options.title && this.options.required &&
            this.options.title.indexOf('*') === -1
          ) {
            this.options.title += ' <strong class="text-danger">*</strong>';
          }
        break;
        case 'help': case 'msg': case 'message':
          this.displayWidget = false;
        break;
        case 'radiobuttons':
          this.options.htmlClass = addClasses(this.options.htmlClass, 'btn-group');
          this.options.labelHtmlClass =
            addClasses(this.options.labelHtmlClass, 'btn btn-default');
          this.layoutNode.options.fieldHtmlClass =
            addClasses(this.layoutNode.options.fieldHtmlClass, 'sr-only');
        break;
        case 'radio': case 'radios':
          this.options.htmlClass =
            addClasses(this.options.htmlClass, 'radio');
        break;
        case 'radios-inline':
          this.options.labelHtmlClass =
            addClasses(this.options.labelHtmlClass, 'radio-inline');
        break;
        default:
          this.layoutNode.options.fieldHtmlClass =
            addClasses(this.layoutNode.options.fieldHtmlClass, 'form-control');
      }

      if (
        !this.controlInitialized && this.displayWidget &&
        this.widgetContainer && !this.widgetContainer.length &&
        this.layoutNode && this.layoutNode.widget
      ) {
        let addedNode: ComponentRef<any> = this.widgetContainer.createComponent(
          this.componentFactory.resolveComponentFactory(this.layoutNode.widget)
        );
        for (let input of ['layoutNode', 'formSettings', 'index', 'debug']) {
          addedNode.instance[input] = this[input];
        }
        this.controlInitialized = true;

        if (this.formControl) {
          this.formControl.statusChanges.subscribe(value => {
            if (value === 'INVALID' && this.formControl.errors) {
              this.options.errorMessage = Object.keys(this.formControl.errors).map(
                  error => [error, Object.keys(this.formControl.errors[error]).map(
                    errorParameter => errorParameter + ': ' +
                      this.formControl.errors[error][errorParameter]
                  ).join(', ')].filter(e => e).join(' - ')
                ).join('<br>');
            } else {
              this.layoutNode.options.errorMessage = null;
            }
          });
        }

        if (this.debug) {
          let vars: any[] = [];
          // vars.push(this.formSettings.formGroup.value[this.options.name]);
          // vars.push(this.formSettings.formGroup.controls[this.options.name]['errors']);
          this.debugOutput = _.map(vars, thisVar => JSON.stringify(thisVar, null, 2)).join('\n');
        }
      }
    }
  }

  ngOnChanges() {
    this.updateArrayItems();
  }

  ngAfterContentChecked() {
  }

  private updateArrayItems() {
    if (this.layoutNode.isArrayItem) {
      const arrayPointer = JsonPointer.parse(this.layoutPointer).slice(0, -2);
      const parentArray = JsonPointer.get(this.formSettings.layout, arrayPointer);
      const minItems = parentArray.minItems || 0;
      const lastArrayItem = parentArray.items.length - 2;
      const tupleItems = parentArray.tupleItems;
      if (this.options.isRemovable && this.arrayIndex >= minItems &&
        (this.arrayIndex >= tupleItems || this.arrayIndex === lastArrayItem)
      ) {
        this.options.isRemovable = true;
      }
    }
  }

  private setTitle(type: string): string {
    switch (this.layoutNode.type) {
      case 'array': case 'button': case 'checkbox': case 'conditional':
      case 'fieldset': case 'help': case 'msg': case 'message':
      case 'section': case 'submit': case '$ref':
        return null;
      case 'advancedfieldset':
        this.layoutNode.options.title = null;
        return 'Advanced options';
      case 'authfieldset':
        this.layoutNode.options.title = null;
        return 'Authentication settings';
      default:
        let thisTitle = this.options.title
          || (!isNumber(this.layoutNode.name) && this.layoutNode.name !== '-' ?
          this.layoutNode.name : null);
        this.layoutNode.options.title = null;
        return thisTitle;
    }
  }

  private removeItem() {
    let formArray = getControl(this.formSettings.formGroup, this.layoutNode.dataPointer, true);
    formArray.removeAt(this.arrayIndex);
    let indexedPointer = toIndexedPointer(this.layoutNode.layoutPointer, this.index);
    JsonPointer.remove(this.formSettings.layout, indexedPointer);
  }
}
