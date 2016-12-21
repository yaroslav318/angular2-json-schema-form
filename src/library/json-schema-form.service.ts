import { Injectable } from '@angular/core';
import { AbstractControl, FormArray, FormGroup } from '@angular/forms';

import * as _ from 'lodash';

import {
  buildFormGroup, convertJsonSchema3to4, getControl, hasOwn, isArray,
  isDefined, isObject, JsonPointer, parseText
} from './utilities/index';

@Injectable()
export class JsonSchemaFormService {
  public JsonFormCompatibility: boolean = false;
  public ReactJsonSchemaFormCompatibility: boolean = false;
  public AngularSchemaFormCompatibility: boolean = false;
  public tpldata: any = {};

  // Default global form options
  public globalOptions: any = {
    // addSubmit: false, // Add a submit button if layout does not have one?
    // debug: false, // Show debugging output?
    // fieldsRequired: false, // Are there any required fields in the form?
    // framework: 'bootstrap-3', // Display formating framework to use
    // loadExternalAssets: false, // Load external css and JavaScript for framework?
    pristine: { errors: true, success: true },
    // supressPropertyTitles: false,
    setSchemaDefaults: true,
    // validateOnRender: false,
    formDefaults: { // Default options for form controls
      // addable: true, // Allow adding items to an array or $ref point?
      // orderable: true, // Allow reordering items within an array?
      // removable: true, // Allow removing items from an array or $ref point?
      // allowExponents: false, // Allow exponent entry in number fields?
      // disableErrorState: false, // Don't apply 'has-error' class when field fails validation?
      // disableSuccessState: false, // Don't apply 'has-success' class when field validates?
      // feedback: false, // Show inline feedback icons?
      // notitle: false, // Hide title?
      // readonly: false, // Set control as read only?
    },
  };

  public initialValues: any = {}; // The initial data model (e.g. previously submitted data)
  public schema: any = {}; // The internal JSON Schema
  public layout: any[] = []; // The internal Form layout
  public formGroupTemplate: any = {}; // The template used to create formGroup
  public formGroup: any = null; // The Angular 2 formGroup, which powers the reactive form
  public framework: any = null; // The active framework component

  public arrayMap: Map<string, number> = new Map<string, number>(); // Maps arrays in data object and number of tuple values
  public dataMap: Map<string, any> = new Map<string, any>(); // Maps paths in data model to schema and formGroup paths
  public dataCircularRefMap: Map<string, string> = new Map<string, string>(); // Maps circular reference points in data model
  public schemaCircularRefMap: Map<string, string> = new Map<string, string>(); // Maps circular reference points in schema
  public layoutRefLibrary: any = {}; // Library of layout nodes for adding to form
  public schemaRefLibrary: any = {}; // Library of schemas for resolving schema $refs
  public templateRefLibrary: any = {}; // Library of formGroup templates for adding to form

  constructor() { }

  public setOptions(newOptions: any): void {
    if (typeof newOptions === 'object') {
      Object.assign(this.globalOptions, newOptions);
    }
  }

  public setTpldata(newTpldata: any = {}): void {
    this.tpldata = newTpldata;
  }

  public parseText(
    text: string = '', value: any = {}, values: any = {}, key: number|string = null
  ): string {
    return parseText(text, value, values, key, this.tpldata);
  }

  public setTitle(
    parentCtx: any = {}, childNode: any = null, index: number = null
  ): string {
    const parentNode: any = parentCtx.layoutNode || {};
    let text: string;
    let childValue: any;
    let parentValues: any = this.getControlValue(parentCtx);
    const isArrayItem: boolean =
      parentNode.type.slice(-5) === 'array' && isArray(parentValues);
    if (isArrayItem && childNode.type !== '$ref') {
      text = JsonPointer.getFirst([
        [childNode, '/options/legend'],
        [childNode, '/options/title'],
        [childNode, '/title'],
        [parentNode, '/options/title'],
        [parentNode, '/options/legend'],
        [parentNode, '/title'],
      ]);
    } else {
      text = JsonPointer.getFirst([
        [childNode, '/title'],
        [childNode, '/options/title'],
        [childNode, '/options/legend'],
        [parentNode, '/title'],
        [parentNode, '/options/title'],
        [parentNode, '/options/legend']
      ]);
      if (childNode.type === '$ref') text = '+ ' + text;
    }
    if (!text) return text;
    childValue = isArrayItem ? parentValues[index] : parentValues;
    return this.parseText(text, childValue, parentValues, index);
  }

  public convertJsonSchema3to4() {
    this.schema = convertJsonSchema3to4(this.schema);
  }

  public initializeControl(ctx: any): boolean {
    ctx.formControl = this.getControl(ctx);
    ctx.boundControl = !!ctx.formControl;
    if (ctx.boundControl) {
      ctx.controlName = this.getControlName(ctx);
      ctx.controlValue = ctx.formControl.value;
      ctx.formControl.valueChanges.subscribe(v => ctx.controlValue = v);
      ctx.controlDisabled = ctx.formControl.disabled;
      // TODO: subscribe to status changes
      // TODO: emit / display error messages
      // ctx.formControl.statusChanges.subscribe(v => ...);
    } else {
      ctx.controlName = ctx.layoutNode.name;
      ctx.controlValue = ctx.layoutNode.value;
      const dataPointer = this.getDataPointer(ctx);
      if (dataPointer) {
        console.error(
          'warning: control "' + dataPointer +
          '" is not bound to the Angular 2 FormGroup.'
        );
      }
    }
    return ctx.boundControl;
  }

  public updateValue(ctx: any, value): void {

    // Set value of current control
    ctx.controlValue = value;
    if (ctx.boundControl) {
      ctx.formControl.setValue(value);
      ctx.formControl.markAsDirty();
    }
    ctx.layoutNode.value = value;

    // Set values of any related controls in copyValueTo array
    if (isArray(ctx.options.copyValueTo)) {
      for (let item of ctx.options.copyValueTo) {
        let targetControl = getControl(this.formGroup, item);
        if (isObject(targetControl) && typeof targetControl.setValue === 'function') {
          targetControl.setValue(value);
          targetControl.markAsDirty();
        }
      }
    }
  }

  public getControl(ctx: any): AbstractControl {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer ||
      ctx.layoutNode.type === '$ref') return null;
    return getControl(this.formGroup, this.getDataPointer(ctx));
  }

  public getControlValue(ctx: any): AbstractControl {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer ||
      ctx.layoutNode.type === '$ref') return null;
    const control = getControl(this.formGroup, this.getDataPointer(ctx));
    return control ? control.value : null;
  }

  public getControlGroup(ctx: any): FormArray | FormGroup {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer) return null;
    return getControl(this.formGroup, this.getDataPointer(ctx), true);
  }

  public getControlName(ctx: any): string {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer || !ctx.dataIndex) return null;
    return JsonPointer.toKey(JsonPointer.toIndexedPointer(
      ctx.layoutNode.dataPointer, ctx.dataIndex, this.arrayMap
    ));
  }

  public getLayoutArray(ctx: any): any[] {
    return JsonPointer.get(this.layout, this.getLayoutPointer(ctx), 0, -1);
  }

  public getParentNode(ctx: any): any[] {
    return JsonPointer.get(this.layout, this.getLayoutPointer(ctx), 0, -2);
  }

  public getDataPointer(ctx: any): string {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer || !ctx.dataIndex) return null;
    return JsonPointer.toIndexedPointer(ctx.layoutNode.dataPointer, ctx.dataIndex, this.arrayMap);
  }

  public getLayoutPointer(ctx: any): string {
    if (!ctx.layoutNode || !ctx.layoutNode.layoutPointer || !ctx.layoutIndex) return null;
    return JsonPointer.toIndexedPointer(ctx.layoutNode.layoutPointer, ctx.layoutIndex);
  }

  public isControlBound(ctx: any): boolean {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer || !ctx.dataIndex) return false;
    const control = this.getControlGroup(ctx);
    if (!control) return false;
    return control.controls.hasOwnProperty(JsonPointer.toKey(this.getDataPointer(ctx)));
  }

  public addItem(ctx: any): boolean {
    if (!ctx.layoutNode || !ctx.layoutNode.$ref || !ctx.dataIndex ||
      !ctx.layoutNode.layoutPointer || !ctx.layoutIndex) return false;
    // Create a new Angular 2 form control from a template in templateRefLibrary
    const newFormGroup = buildFormGroup(JsonPointer.get(
      this.templateRefLibrary, [ctx.layoutNode.$ref]
    ));
    // Add the new form control to the parent formArray or formGroup
    if (ctx.layoutNode.arrayItem) { // Add new array item to formArray
      (<FormArray>this.getControlGroup(ctx)).push(newFormGroup);
    } else { // Add new $ref item to formGroup
      (<FormGroup>this.getControlGroup(ctx)).addControl(
        this.getControlName(ctx), newFormGroup
      );
    }
    // Copy a new layoutNode from layoutRefLibrary
    const newLayoutNode = _.cloneDeep(JsonPointer.get(
      this.layoutRefLibrary, [ctx.layoutNode.$ref]
    ));
    JsonPointer.forEachDeep(newLayoutNode, (value, pointer) => {
      // Reset all _id's in newLayoutNode to unique values
      if (hasOwn(value, '_id')) value._id = _.uniqueId();
      // If adding a recursive item, prefix current dataPointer
      // and layoutPointer to all pointers in new layoutNode
      if (!ctx.layoutNode.arrayItem || ctx.layoutNode.circularReference) {
        if (hasOwn(value, 'dataPointer')) {
          value.dataPointer = ctx.layoutNode.dataPointer + value.dataPointer;
        }
        if (hasOwn(value, 'layoutPointer')) {
          value.layoutPointer = ctx.layoutNode.layoutPointer + value.layoutPointer;
        }
      }
    });
    // Add the new layoutNode to the layout
    JsonPointer.insert(this.layout, this.getLayoutPointer(ctx), newLayoutNode);
    return true;
  }

  public moveArrayItem(ctx: any, oldIndex: number, newIndex: number): boolean {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer || !ctx.dataIndex ||
      !ctx.layoutNode.layoutPointer || !ctx.layoutIndex ||
      !isDefined(oldIndex) || !isDefined(newIndex)) return false;
    // Move item in the formArray
    let formArray = this.getControlGroup(ctx);
    (<any>formArray.controls).splice(newIndex, 0, (<any>formArray.controls).splice(oldIndex, 1)[0]);
    formArray.updateValueAndValidity();
    (<any>formArray)._onCollectionChange();
    // Move layout item
    let layoutArray = this.getLayoutArray(ctx);
    layoutArray.splice(newIndex, 0, layoutArray.splice(oldIndex, 1)[0]);
    return true;
  }

  public removeItem(ctx: any): boolean {
    if (!ctx.layoutNode || !ctx.layoutNode.dataPointer || !ctx.dataIndex ||
      !ctx.layoutNode.layoutPointer || !ctx.layoutIndex) return false;
    // Remove the Angular 2 form control from the parent formArray or formGroup
    if (ctx.layoutNode.arrayItem) { // Remove array item from formArray
      (<FormArray>this.getControlGroup(ctx)).removeAt(ctx.dataIndex[ctx.dataIndex.length - 1]);
    } else { // Remove $ref item from formGroup
      (<FormGroup>this.getControlGroup(ctx)).removeControl(this.getControlName(ctx));
    }
    // Remove layoutNode from layout
    let layoutPointer = this.getLayoutPointer(ctx);
    JsonPointer.remove(this.layout, layoutPointer);
    return true;
  }
}
