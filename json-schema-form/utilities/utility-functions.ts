import {
  AbstractControl, FormArray, FormControl, FormGroup, ValidatorFn
} from '@angular/forms';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as _ from 'lodash';

import {
  isPresent, isBlank, isSet, isNotSet, isEmpty, isString, isNumber,
  isInteger, isBoolean, isFunction, isObject, isArray, getType, isType,
  toJavaScriptType, toSchemaType, xor, hasOwn, forOwn, inArray,
  SchemaPrimitiveType
} from './validator-functions';
import { JsonPointer } from './jsonpointer';

/**
 * Utility function library:
 *
 * getInputType, mapLayout, isInputRequired, buildTitleMap, formatFormData
 *
 * forOwnDeep, toTitleCase
 */

/**
 * 'getInputType' function
 *
 * @param {any} schema
 * @return {string}
 */
export function getInputType(schema: any): string {
  if (
    isObject(schema['x-schema-form']) && isSet(schema['x-schema-form']['type'])
  ) {
    return schema['x-schema-form']['type'];
  } else if (hasOwn(schema, 'ui:widget') && isString(schema['ui:widget'])) {
    return schema['ui:widget']; // react-jsonschema-form compatibility
  }
  let schemaType = schema.type;
  if (isArray(schemaType)) { // If multiple types listed, use most inclusive type
    if (inArray('object', schemaType) && hasOwn(schema, 'properties')) {
      schemaType = 'object';
    } else if (inArray('array', schemaType) && hasOwn(schema, 'items')) {
      schemaType = 'array';
    } else if (inArray('string', schemaType)) {
      schemaType = 'string';
    } else if (inArray('number', schemaType)) {
      schemaType = 'number';
    } else if (inArray('integer', schemaType)) {
      schemaType = 'integer';
    } else if (inArray('boolean', schemaType)) {
      schemaType = 'boolean';
    } else {
      schemaType = 'null';
    }
  }
  if (schemaType === 'boolean') return 'checkbox';
  if (schemaType === 'object') {
    if (hasOwn(schema, 'properties')) return 'fieldset';
    return 'textarea';
  }
  if (schemaType === 'array') {
    let itemsObject = JsonPointer.getFirst([
      [schema, '/items'],
      [schema, '/additionalItems']
    ]);
    if (!itemsObject) return null;
    if (hasOwn(itemsObject, 'enum')) return 'checkboxes';
    return 'array';
  }
  if (schemaType === 'null') return 'hidden';
  if (hasOwn(schema, 'enum')) return 'select';
  if (schemaType === 'number' || schemaType === 'integer') {
    if (hasOwn(schema, 'maximum') && hasOwn(schema, 'minimum') &&
      (schemaType === 'integer' || hasOwn(schema, 'multipleOf'))) return 'range';
    return schemaType;
  }
  if (schemaType === 'string') {
    if (hasOwn(schema, 'format')) {
      if (schema.format === 'color') return 'color';
      if (schema.format === 'date') return 'date';
      if (schema.format === 'date-time') return 'datetime-local';
      if (schema.format === 'email') return 'email';
      if (schema.format === 'uri') return 'url';
    }
    return 'text';
  }
  return 'text';
}

/**
 * 'mapLayout' function
 *
 * Creates a new layout by running each element in an existing layout through
 * an iteratee. Recursively maps within array elements 'items' and 'tabs'.
 * The iteratee is invoked with four arguments: (value, index, layout, path)
 *
 * THe returned layout may be longer (or shorter) then the source layout.
 *
 * If an item from the source layout returns multiple items (as '*' usually will),
 * this function will keep all returned items in-line with the surrounding items.
 *
 * If an item from the source layout causes an error and returns null, it is
 * simply skipped, and the function will still return all non-null items.
 *
 * @param {any[]} layout - the layout to map
 * @param {(v: any, i?: number, l?: any, p?: string) => any}
 *   function - the funciton to invoke on each element
 * @param {any[] = layout} rootLayout - the root layout, which conatins layout
 * @param {any = ''} path - the path to layout, inside rootLayout
 * @return {[type]}
 */
export function mapLayout(
  layout: any[],
  fn: (v: any, i?: number, l?: any, p?: string) => any,
  rootLayout: any[] = layout,
  path: string = ''
): any[] {
  let newLayout: any[] = [];
  let indexPad = 0;
  _.forEach(layout, (item, index) => {
    let realIndex = index + indexPad;
    let newPath = path + '/' + realIndex;
    let newItem: any = item;
    if (isObject(newItem)) {
      if (isArray(newItem.items)) {
        newItem.items =
          mapLayout(newItem.items, fn, rootLayout, newPath + '/items');
      } else if (isArray(newItem.tabs)) {
        newItem.tabs =
          mapLayout(newItem.tabs, fn, rootLayout, newPath + '/tabs');
      }
    }
    newItem = fn(newItem, realIndex, rootLayout, newPath);
    if (newItem === undefined) {
      indexPad--;
    } else {
      if (isArray(newItem)) indexPad += newItem.length - 1;
      newLayout = newLayout.concat(newItem);
    }
  });
  return newLayout;
};

/**
 * 'forOwnDeep' function
 *
 * Iterates over own enumerable properties of an object or items in an array
 * and invokes an iteratee function for each key/value or index/value pair.
 *
 * Similar to the Lodash _.forOwn and _.forEach functions, except:
 *
 * - This function also iterates over sub-objects and arrays after calling
 * the iteratee function on the containing object or array itself
 * (except for the root object or array).
 *
 * - The iteratee function is invoked with four arguments (instead of three):
 * (value, key/index, rootObject, jsonPointer), where rootObject is the root
 * object submitted (not necesarily the sub-object directly containing the
 * key/value or index/value), and jsonPointer is a JSON pointer indicating the
 * location of the key/value or index/value within the root object.
 *
 * - This function can also optionally be called directly on a sub-object by
 * including optional parameterss to specify the initial root object and JSON pointer.
 *
 * - A fifth optional boolean parameter of TRUE may also be added to reverse
 * direction, which causes the iterator function to be called on sub-objects
 * and arrays, in reverse order, before being called on the containing object
 * or array itself (still excluding the root object or array).
 *
 * @param {object} object - the initial object or array
 * @param {(v: any, k?: string, o?: any, p?: any) => any} function - iteratee function
 * @param {object = object} rootObject - optional, root object or array
 * @param {string = ''} jsonPointer - optional, JSON Pointer to object within rootObject
 * @param {boolean = false} bottomUp - optional, set to TRUE to reverse direction
 * @return {object} - the object or array
 */
export function forOwnDeep(
  object: any,
  fn: (value: any, key?: string, object?: any, jsonPointer?: string) => any,
  rootObject: any = null,
  jsonPointer: string = '',
  bottomUp: boolean = false
): any {
  let isRoot: boolean = !rootObject;
  if (isRoot) { rootObject = object; }
  let currentKey = JsonPointer.parse(jsonPointer).pop();
  let forFn = null;
  if (!isRoot && !bottomUp) fn(object, currentKey, rootObject, jsonPointer);
  if (isArray(object) || isObject(object)) {
    let keys: string[] = Object.keys(object);
    let recurse: Function = (key) => forOwnDeep(object[key],
      fn, rootObject, jsonPointer + '/' + JsonPointer.escape(key), bottomUp);
    if (bottomUp) {
      for (let i = keys.length - 1, l = 0; i >= l; i--) recurse(keys[i]);
    } else {
      for (let i = 0, l = keys.length; i < l; i++) recurse(keys[i]);
    }
  }
  if (!isRoot && bottomUp) fn(object, currentKey, rootObject, jsonPointer);
  return object;
}

/**
 * 'isInputRequired' function
 *
 * Checks a JSON Schema to see if an item is required
 *
 * @param {schema} schema - the schema to check
 * @param {string} key - the key of the item to check
 * @return {boolean} - true if the item is required, false if not
 */
export function isInputRequired(schema: any, pointer: string): boolean {
  if (!isObject(schema)) {
    console.error('Schema must be an object.');
    return false;
  }
  let dataPointerArray: string[] = JsonPointer.parse(pointer);
  if (isArray(dataPointerArray) && dataPointerArray.length) {
    let keyName: string = dataPointerArray[dataPointerArray.length - 1];
    let requiredList: any;
    if (dataPointerArray.length > 1) {
      let listPointerArray: string[] = dataPointerArray.slice(0, -1);
      if (listPointerArray[listPointerArray.length - 1] === '-') {
        listPointerArray = listPointerArray.slice(0, -1);
        requiredList = JsonPointer.getFromSchema(schema, listPointerArray)['items']['required'];
      } else {
        requiredList = JsonPointer.getFromSchema(schema, listPointerArray)['required'];
      }
    } else {
      requiredList = schema['required'];
    }
    if (isArray(requiredList)) return requiredList.indexOf(keyName) !== -1;
  }
  return false;
};

/**
 * 'buildTitleMap' function
 *
 * @param {any} titleMap -
 * @param {any} enumList -
 * @param {boolean = false} fieldRequired -
 * @return { { name: any, value: any}[] }
 */
export function buildTitleMap(
  titleMap: any, enumList: any, fieldRequired: boolean = true
): { name: any, value: any}[] {
  let newTitleMap: { name: any, value: any}[] = [];
  let hasEmptyValue: boolean = false;
  if (titleMap) {
    if (isArray(titleMap)) {
      if (enumList) {
        for (let i = 0, l = titleMap.length; i < l; i++) {
          let value: any = titleMap[i].value;
          if (enumList.indexOf(value) !== -1) {
            let name: any = titleMap[i].name;
            newTitleMap.push({ name, value });
            if (!value) hasEmptyValue = true;
          }
        }
      } else {
        newTitleMap = titleMap;
        if (!fieldRequired) hasEmptyValue = !!newTitleMap.filter(i => !i.value).length;
      }
    } else if (enumList) {
      for (let i = 0, l = enumList.length; i < l; i++) {
        let value: any = enumList[i];
        if (titleMap.hasOwnProperty(value)) {
          let name: any = titleMap[value];
          newTitleMap.push({ name, value });
          if (!value) hasEmptyValue = true;
        }
      }
    } else {
      for (let name in titleMap) {
        if (titleMap.hasOwnProperty(name)) {
          let value: any = titleMap[name];
          newTitleMap.push({ name, value });
          if (!value) hasEmptyValue = true;
        }
      }
    }
  } else if (enumList) {
    for (let i = 0, l = enumList.length; i < l; i++) {
      let name: any = enumList[i];
      let value: any = enumList[i];
      newTitleMap.push({ name, value});
      if (!value) hasEmptyValue = true;
    }
  }
  if (!fieldRequired && !hasEmptyValue) {
    newTitleMap.unshift({ name: '', value: '' });
  }
  return newTitleMap;
}

/**
 * 'formatFormData' function
 *
 * @param {any} formData - Angular 2 FormGroup data object
 * @param {any} fieldMap - map of correct data types for each field
 * @param {boolean = false} fixErrors - if TRUE, tries to fix data
 * @return {any} - formatted data object
 */
export function formatFormData(formData: any, fieldMap: any, fixErrors: boolean = false): any {
  let formattedData = {};
  forOwnDeep(formData, (value, key, ignore, pointer) => {
    let genericPointer: string;
    if (hasOwn(fieldMap, pointer)) {
      genericPointer = pointer;
    } else { // TODO: Fix to allow for integer object keys
      genericPointer = JsonPointer.compile(
        JsonPointer.parse(pointer).map(k => (isInteger(k)) ? '-' : k)
      );
    }
    if (hasOwn(fieldMap, genericPointer) &&
      hasOwn(fieldMap[genericPointer], 'schemaType')
    ) {
      let schemaType: SchemaPrimitiveType | SchemaPrimitiveType[] =
        fieldMap[genericPointer]['schemaType'];
      if (isSet(value) &&
        inArray(schemaType, ['string', 'integer', 'number', 'boolean', 'null'])
      ) {
        let newValue = fixErrors ? toSchemaType(value, schemaType) :
          toJavaScriptType(value, <SchemaPrimitiveType>schemaType);
        if (isPresent(newValue)) JsonPointer.set(formattedData, pointer, newValue);
      }
    }
  });
  return formattedData;
}

/**
 * 'toTitleCase' function
 *
 * Intelligently converts an input string to Title Case.
 *
 * Accepts an optional second parameter with an alternate list of
 * words and abbreviations to force into a particular case.
 *
 * This function is built on prior work by John Gruber and David Gouch:
 * http://daringfireball.net/2008/08/title_case_update
 * https://github.com/gouch/to-title-case
 *
 * @param  {string} input -
 * @param  {string | string[]} forceWords? -
 * @return {string} -
 */
export function toTitleCase(input: string, forceWords?: string | string[]): string {
  let forceArray: string[] = ['a', 'an', 'and', 'as', 'at', 'but', 'by', 'en', 'for', 'if',
    'in', 'nor', 'of', 'on', 'or', 'per', 'the', 'to', 'v', 'v.', 'vs', 'vs.', 'via'];
  if (typeof forceWords === 'string') forceWords = forceWords.split('|');
  if (Array.isArray(forceWords)) forceArray = forceArray.concat(forceWords);
  let forceArrayLower: string[] = forceArray.map(w => w.toLowerCase());
  let noInitialCase: boolean =
    input === input.toUpperCase() || input === input.toLowerCase();
  let prevLastChar: string = '';
  input = input.trim();
  return input.replace(/[A-Za-z0-9\u00C0-\u00FF]+[^\s-]*/g, (word, idx) => {
    if (!noInitialCase && word.slice(1).search(/[A-Z]|\../) !== -1) {
      return word;
    } else {
      let newWord: string;
      let forceWord: string = forceArray[forceArrayLower.indexOf(word.toLowerCase())];
      if (!forceWord) {
        if (noInitialCase) {
          if (word.slice(1).search(/\../) !== -1) {
            newWord = word.toLowerCase();
          } else {
            newWord = word[0].toUpperCase() + word.slice(1).toLowerCase();
          }
        } else {
          newWord = word[0].toUpperCase() + word.slice(1);
        }
      } else if (
        forceWord === forceWord.toLowerCase() && (
          idx === 0 || idx + word.length === input.length ||
          prevLastChar === ':' || input[idx - 1].search(/[^\s-]/) !== -1 ||
          (input[idx - 1] !== '-' && input[idx + word.length] === '-')
        )
      ) {
        newWord = forceWord[0].toUpperCase() + forceWord.slice(1);
      } else {
        newWord = forceWord;
      }
      prevLastChar = word.slice(-1);
      return newWord;
    }
  });
};
