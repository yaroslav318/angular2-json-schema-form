import { Injectable } from '@angular/core';

import {
  isDefined, isEmpty, isObject, isArray, isMap, isNumber, isString
} from './validator.functions';
import { hasOwn, copy } from './utility.functions';

/**
 * 'JsonPointer' class
 *
 * Some utilities for using JSON Pointers with JSON objects
 * https://tools.ietf.org/html/rfc6901
 *
 * get, getCopy, getFirst, set, setCopy, insert, insertCopy, remove, has, dict,
 * forEachDeep, forEachDeepCopy, escape, unescape, parse, compile, toKey,
 * isJsonPointer, isSubPointer, toIndexedPointer, toGenericPointer,
 * toControlPointer, toSchemaPointer, toDataPointer, parseObjectPath
 *
 * Some functions based on manuelstofer's json-pointer utilities
 * https://github.com/manuelstofer/json-pointer
 */
export type Pointer = string | string[];

@Injectable()
export class JsonPointer {

  /**
   * 'get' function
   *
   * Uses a JSON Pointer to retrieve a value from an object.
   *
   * @param {object} object - Object to get value from
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @param {number = 0} startSlice - Zero-based index of first Pointer key to use
   * @param {number} endSlice - Zero-based index of last Pointer key to use
   * @param {boolean = false} getBoolean - Return only true or false?
   * @param {boolean = true} errors - Show error if not found?
   * @return {object} - Located value (or true or false if getBoolean = true)
   */
  static get(
    object: any, pointer: Pointer, startSlice: number = 0,
    endSlice: number = null, getBoolean: boolean = false, errors: boolean = false
  ): any {
    if (object === null) { return getBoolean ? false : undefined; }
    let keyArray: any[] = this.parse(pointer, errors);
    if (typeof object === 'object' && keyArray !== null) {
      let subObject = object;
      if (startSlice >= keyArray.length || endSlice <= -keyArray.length) { return object; }
      if (startSlice <= -keyArray.length) { startSlice = 0; }
      if (!isDefined(endSlice) || endSlice >= keyArray.length) { endSlice = keyArray.length; }
      keyArray = keyArray.slice(startSlice, endSlice);
      for (let key of keyArray) {
        if (key === '-' && isArray(subObject) && subObject.length) {
          key = subObject.length - 1;
        }
        if (typeof subObject === 'object' && subObject !== null &&
          hasOwn(subObject, key)
        ) {
          subObject = subObject[key];
        } else if (isMap(subObject) && subObject.has(key)) {
          subObject = subObject.get(key);
        } else {
          if (errors) {
            console.error(`get error: "${key}" key not found in object.`);
            console.error(pointer);
            console.error(object);
          }
          return getBoolean ? false : undefined;
        }
      }
      return getBoolean ? true : subObject;
    }
    if (errors && keyArray === null) {
      console.error(`get error: Invalid JSON Pointer: ${pointer}`);
    }
    if (errors && typeof object !== 'object') {
      console.error('get error: Invalid object:');
      console.error(object);
    }
    return getBoolean ? false : undefined;
  }

  /**
   * 'get' function
   *
   * Uses a JSON Pointer to deeply clone a value from an object.
   *
   * @param {object} object - Object to get value from
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @param {number = 0} startSlice - Zero-based index of first Pointer key to use
   * @param {number} endSlice - Zero-based index of last Pointer key to use
   * @param {boolean = false} getBoolean - Return only true or false?
   * @param {boolean = true} errors - Show error if not found?
   * @return {object} - Located value (or true or false if getBoolean = true)
   */
  static getCopy(
    object: any, pointer: Pointer, startSlice: number = 0,
    endSlice: number = null, getBoolean: boolean = false, errors: boolean = false
  ): any {
    return this.forEachDeepCopy(this.get(
      object, pointer, startSlice, endSlice, getBoolean, errors
    ));
  }

  /**
   * 'getFirst' function
   *
   * Takes an array of JSON Pointers and objects,
   * checks each object for a value specified by the pointer,
   * and returns the first value found.
   *
   * @param {[object, pointer][]} items - Array of objects and pointers to check
   * @param {any = null} defaultValue - Value to return if nothing found
   * @param {boolean = false} getCopy - Return a copy instead?
   * @return {any} - First value found
   */
  static getFirst(
    items: any, defaultValue: any = null, getCopy: boolean = false
  ): any {
    if (isEmpty(items)) { return; }
    if (isArray(items)) {
      for (let item of items) {
        if (isEmpty(item)) { continue; }
        if (isArray(item) && item.length >= 2) {
          if (isEmpty(item[0]) || isEmpty(item[1])) { continue; }
          const value: any = getCopy ?
            this.getCopy(item[0], item[1]) : this.get(item[0], item[1]);
          if (value) { return value; }
          continue;
        }
        console.error('getFirst error: Input not in correct format.\n' +
          'Should be: [ [ object1, pointer1 ], [ object 2, pointer2 ], etc... ]');
        return;
      }
      return defaultValue;
    }
    if (isMap(items)) {
      for (let [object, pointer] of items) {
        if (object === null || !this.isJsonPointer(pointer)) { continue; }
        const value: any = getCopy ?
          this.getCopy(object, pointer) : this.get(object, pointer);
        if (value) { return value; }
      }
      return defaultValue;
    }
    console.error('getFirst error: Input not in correct format.\n' +
      'Should be: [ [ object1, pointer1 ], [ object 2, pointer2 ], etc... ]');
    return defaultValue;
  }

  /**
   * 'getFirstCopy' function
   *
   * Similar to getFirst, but always returns a copy.
   *
   * @param {[object, pointer][]} items - Array of objects and pointers to check
   * @param {any = null} defaultValue - Value to return if nothing found
   * @return {any} - Copy of first value found
   */
  static getFirstCopy(items: any, defaultValue: any = null): any {
    return this.getFirst(items, defaultValue, true);
  }

  /**
   * 'set' function
   *
   * Uses a JSON Pointer to set a value on an object.
   * Also creates any missing sub objects or arrays to contain that value.
   *
   * If the optional fourth parameter is TRUE and the inner-most container
   * is an array, the function will insert the value as a new item at the
   * specified location in the array, rather than overwriting the existing
   * value (if any) at that location.
   *
   * So set([1, 2, 3], '/1', 4) => [1, 4, 3]
   * and
   * So set([1, 2, 3], '/1', 4, true) => [1, 4, 2, 3]
   *
   * @param {object} object - The object to set value in
   * @param {Pointer} pointer - The JSON Pointer (string or array)
   * @param {any} value - The new value to set
   * @return {object} - The original object, modified with the set value
   */
  static set(
    object: any, pointer: Pointer, value: any, insert: boolean = false
  ): any {
    const keyArray: string[] = this.parse(pointer);
    if (keyArray !== null) {
      let subObject: any = object;
      for (let i = 0; i < keyArray.length - 1; ++i) {
        let key: string = keyArray[i];
        if (key === '-' && isArray(subObject)) {
          key = subObject.length;
        }
        if (isMap(subObject) && subObject.has(key)) {
          subObject = subObject.get(key);
        } else {
          if (!hasOwn(subObject, key)) {
            subObject[key] = (keyArray[i + 1].match(/^(\d+|-)$/)) ? [] : {};
          }
          subObject = subObject[key];
        }
      }
      let lastKey: string = keyArray[keyArray.length - 1];
      if (isArray(subObject) && lastKey === '-') {
        subObject.push(value);
      } else if (insert && isArray(subObject) && !isNaN(+lastKey)) {
        subObject.splice(lastKey, 0, value);
      } else if (isMap(subObject)) {
        subObject.set(lastKey, value);
      } else {
        subObject[lastKey] = value;
      }
      return object;
    }
    console.error(`set error: Invalid JSON Pointer: ${pointer}`);
    return object;
  }

  /**
   * 'setCopy' function
   *
   * Copies an object and uses a JSON Pointer to set a value on the copy.
   * Also creates any missing sub objects or arrays to contain that value.
   *
   * If the optional fourth parameter is TRUE and the inner-most container
   * is an array, the function will insert the value as a new item at the
   * specified location in the array, rather than overwriting the existing value.
   *
   * @param {object} object - The object to copy and set value in
   * @param {Pointer} pointer - The JSON Pointer (string or array)
   * @param {any} value - The value to set
   * @return {object} - The new object with the set value
   */
  static setCopy(
    object: any, pointer: Pointer, value: any, insert: boolean = false
  ): any {
    const keyArray: string[] = this.parse(pointer);
    if (keyArray !== null) {
      let newObject: any = copy(object);
      let subObject: any = newObject;
      for (let i = 0; i < keyArray.length - 1; ++i) {
        let key: string = keyArray[i];
        if (key === '-' && isArray(subObject)) {
          key = subObject.length;
        }
        if (isMap(subObject) && subObject.has(key)) {
          subObject.set(key, copy(subObject.get(key)));
          subObject = subObject.get(key);
        } else {
          if (!hasOwn(subObject, key)) {
            subObject[key] = (keyArray[i + 1].match(/^(\d+|-)$/)) ? [] : {};
          }
          subObject[key] = copy(subObject[key]);
          subObject = subObject[key];
        }
      }
      let lastKey: string = keyArray[keyArray.length - 1];
      if (isArray(subObject) && lastKey === '-') {
        subObject.push(value);
      } else if (insert && isArray(subObject) && !isNaN(+lastKey)) {
        subObject.splice(lastKey, 0, value);
      } else if (isMap(subObject)) {
        subObject.set(lastKey, value);
      } else {
        subObject[lastKey] = value;
      }
      return newObject;
    }
    console.error(`setCopy error: Invalid JSON Pointer: ${pointer}`);
    return object;
  }

  /**
   * 'insert' function
   *
   * Calls 'set' with insert = TRUE
   *
   * @param {object} object - object to insert value in
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @param {any} value - value to insert
   * @return {object}
   */
  static insert(object: any, pointer: Pointer, value: any): any {
    return this.set(object, pointer, value, true);
  }

  /**
   * 'insertCopy' function
   *
   * Calls 'setCopy' with insert = TRUE
   *
   * @param {object} object - object to insert value in
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @param {any} value - value to insert
   * @return {object}
   */
  static insertCopy(object: any, pointer: Pointer, value: any): any {
    return this.setCopy(object, pointer, value, true);
  }

  /**
   * 'remove' function
   *
   * Uses a JSON Pointer to remove a key and its attribute from an object
   *
   * @param {object} object - object to delete attribute from
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @return {object}
   */
  static remove(object: any, pointer: Pointer): any {
    let keyArray: any[] = this.parse(pointer);
    if (keyArray !== null && keyArray.length) {
      let lastKey = keyArray.pop();
      let parentObject = this.get(object, keyArray);
      if (isArray(parentObject)) {
        if (lastKey === '-') { lastKey = parentObject.length - 1; }
        parentObject.splice(lastKey, 1);
      } else if (isObject(parentObject)) {
        delete parentObject[lastKey];
      }
      return object;
    }
    console.error(`remove error: Invalid JSON Pointer: ${pointer}`);
    return object;
  }

  /**
   * 'has' function
   *
   * Tests if an object has a value at the location specified by a JSON Pointer
   *
   * @param {object} object - object to chek for value
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @return {boolean}
   */
  static has(object: any, pointer: Pointer): boolean {
    return this.get(object, pointer, 0, null, true);
  }

  /**
   * 'dict' function
   *
   * Returns a (pointer -> value) dictionary for an object
   *
   * @param {Object} object - The object to create a dictionary from
   * @return {Object} - The resulting dictionary object
   */
  static dict(object: any): any {
    let results: any = {};
    this.forEachDeep(object, (value, pointer) => {
      if (typeof value !== 'object') { results[pointer] = value; }
    });
    return results;
  }

  /**
   * 'forEachDeep' function
   *
   * Iterates over own enumerable properties of an object or items in an array
   * and invokes an iteratee function for each key/value or index/value pair.
   * By default, iterates over items within objects and arrays after calling
   * the iteratee function on the containing object or array itself.
   *
   * The iteratee is invoked with three arguments: (value, pointer, rootObject),
   * where pointer is a JSON pointer indicating the location of the current
   * value within the root object, and rootObject is the root object initially
   * submitted to th function.
   *
   * If a third optional parameter 'bottomUp' is set to TRUE, the iterator
   * function will be called on sub-objects and arrays after being
   * called on their contents, rather than before, which is the default.
   *
   * This function can also optionally be called directly on a sub-object by
   * including optional 4th and 5th parameterss to specify the initial
   * root object and pointer.
   *
   * @param {object} object - the initial object or array
   * @param {(v: any, k?: string, o?: any, p?: any) => any} function - iteratee function
   * @param {boolean = false} bottomUp - optional, set to TRUE to reverse direction
   * @param {object = object} rootObject - optional, root object or array
   * @param {string = ''} pointer - optional, JSON Pointer to object within rootObject
   */
  static forEachDeep(
    object: any, fn: (v: any, p?: string, o?: any) => any = (v) => v,
    bottomUp: boolean = false, pointer: string = '', rootObject: any = object
  ): void {
    if (typeof fn !== 'function') {
      console.error(`forEachDeep error: Iterator is not a function:`, fn);
      return;
    }
    if (!bottomUp) { fn(object, pointer, rootObject); }
    if (isObject(object) || isArray(object)) {
      for (let key of Object.keys(object)) {
        const newPointer: string = pointer + '/' + this.escape(key);
        this.forEachDeep(object[key], fn, bottomUp, newPointer, rootObject);
      }
    }
    if (bottomUp) { fn(object, pointer, rootObject); }
  }

  /**
   * 'forEachDeepCopy' function
   *
   * Similar to forEachDeep, but returns a copy of the original object, with
   * the same keys and indexes, but with values replaced with the result of
   * the iteratee function.
   *
   * @param {object} object - the initial object or array
   * @param {(v: any, k?: string, o?: any, p?: any) => any} function - iteratee function
   * @param {boolean = false} bottomUp - optional, set to TRUE to reverse direction
   * @param {object = object} rootObject - optional, root object or array
   * @param {string = ''} pointer - optional, JSON Pointer to object within rootObject
   */
  static forEachDeepCopy(
    object: any, fn: (v: any, p?: string, o?: any) => any = (v) => v,
    bottomUp: boolean = false, pointer: string = '', rootObject: any = object
  ): any {
    if (typeof fn !== 'function') {
      console.error(`forEachDeepCopy error: Iterator is not a function:`, fn);
      return null;
    }
    if (isObject(object) || isArray(object)) {
      let newObject = isArray(object) ? [ ...object ] : { ...object };
      if (!bottomUp) { newObject = fn(newObject, pointer, rootObject); }
      for (let key of Object.keys(newObject)) {
        const newPointer: string = pointer + '/' + this.escape(key);
        newObject[key] = this.forEachDeepCopy(
          newObject[key], fn, bottomUp, newPointer, rootObject
        );
      }
      if (bottomUp) { newObject = fn(newObject, pointer, rootObject); }
      return newObject;
    } else {
      return fn(object, pointer, rootObject);
    }
  }

  /**
   * 'escape' function
   *
   * Escapes a string reference key
   *
   * @param {string} key - string key to escape
   * @return {string} - escaped key
   */
  static escape(key: string): string {
    return key.toString().replace(/~/g, '~0').replace(/\//g, '~1');
  }

  /**
   * 'unescape' function
   *
   * Unescapes a string reference key
   *
   * @param {string} key - string key to unescape
   * @return {string} - unescaped key
   */
  static unescape(key: string): string {
    return key.toString().replace(/~1/g, '/').replace(/~0/g, '~');
  }

  /**
   * 'parse' function
   *
   * Converts a string JSON Pointer into a array of keys
   * (if input is already an an array of keys, it is returned unchanged)
   *
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @param {boolean = true} errors - Show error if invalid pointer?
   * @return {string[]} - JSON Pointer array of keys
   */
  static parse(pointer: Pointer, errors: boolean = false): string[] {
    if (!this.isJsonPointer(pointer)) {
      if (errors) { console.error(`parse error: Invalid JSON Pointer: ${pointer}`); }
      return null;
    }
    if (isArray(pointer)) { return <string[]>pointer; }
    if (typeof pointer === 'string') {
      if ((<string>pointer)[0] === '#') { pointer = pointer.slice(1); }
      if (<string>pointer === '') { return []; }
      return (<string>pointer).slice(1).split('/').map(this.unescape);
    }
  }

  /**
   * 'compile' function
   *
   * Converts an array of keys into a JSON Pointer string
   * (if input is already a string, it is normalized and returned)
   *
   * The optional second parameter is a default which will replace any empty keys.
   *
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @param {boolean = true} errors - Show error if invalid pointer?
   * @returns {string} - JSON Pointer string
   */
  static compile(
    pointer: Pointer, defaultValue: string | number = '', errors: boolean = false
  ): string {
    if (!this.isJsonPointer(pointer)) {
      if (errors) { console.error(`compile error: Invalid JSON Pointer: ${pointer}`); }
      return null;
    }
    if (isArray(pointer)) {
      if ((<string[]>pointer).length === 0) { return ''; }
      return '/' + (<string[]>pointer).map(
        key => key === '' ? defaultValue : this.escape(key)
      ).join('/');
    }
    if (typeof pointer === 'string') {
      if (pointer[0] === '#') { pointer = pointer.slice(1); }
      return pointer;
    }
  }

  /**
   * 'toKey' function
   *
   * Extracts name of the final key from a JSON Pointer.
   *
   * @param {Pointer} pointer - JSON Pointer (string or array)
   * @param {boolean = true} errors - Show error if invalid pointer?
   * @returns {string} - the extracted key
   */
  static toKey(pointer: Pointer, errors: boolean = false): string {
    let keyArray = this.parse(pointer, errors);
    if (keyArray === null) { return null; }
    if (!keyArray.length) { return ''; }
    return keyArray[keyArray.length - 1];
  }

  /**
   * 'isJsonPointer' function
   *
   * Checks a string or array value to determine if it is a valid JSON Pointer.
   * Returns true if a string is empty, or starts with '/' or '#/'.
   * Returns true if an array contains only string values.
   *
   * @param {any} value - value to check
   * @returns {boolean} - true if value is a valid JSON Pointer, otherwise false
   */
  static isJsonPointer(value: any): boolean {
    if (isArray(value)) {
      return value.every(key => typeof key === 'string');
    } else if (isString(value)) {
      if (value === '') { return true; }
      if (value[0] === '#') { value = value.slice(1); }
      if (value[0] === '/') { return true; }
    }
    return false;
  }

  /**
   * 'isSubPointer' function
   *
   * Checks whether one JSON Pointer is a subset of another.
   *
   * @param {Pointer} shortPointer - potential subset JSON Pointer
   * @param {Pointer} longPointer - potential superset JSON Pointer
   * @param {boolean = false} trueIfMatching - return true if pointers match?
   * @param {boolean = false} errors - Show error if invalid pointer?
   * @return {boolean} - true if shortPointer is a subset of longPointer, false if not
   */
  static isSubPointer(
    shortPointer: Pointer, longPointer: Pointer,
    trueIfMatching: boolean = false, errors: boolean = false
  ): boolean {
    if (!this.isJsonPointer(shortPointer) || !this.isJsonPointer(longPointer)) {
      if (errors) {
        let invalid = ''
        if (!this.isJsonPointer(shortPointer)) { invalid += ` 1: ${shortPointer}`; }
        if (!this.isJsonPointer(longPointer)) { invalid += ` 2: ${longPointer}`; }
        console.error(`isSubPointer error: Invalid JSON Pointer ${invalid}`);
      }
      return;
    }
    shortPointer = this.compile(shortPointer, '', errors);
    longPointer = this.compile(longPointer, '', errors);
    return shortPointer === longPointer ? trueIfMatching :
      `${shortPointer}/` === longPointer.slice(0, shortPointer.length + 1);
  }

  /**
   * 'toIndexedPointer' function
   *
   * Merges an array of numeric indexes and a generic pointer to create an
   * indexed pointer for a specific item.
   *
   * For example, merging the generic pointer '/foo/-/bar/-/baz' and
   * the array [4, 2] would result in the indexed pointer '/foo/4/bar/2/baz'
   *
   * @function
   * @param {string | string[]} genericPointer - The generic pointer
   * @param {number[]} indexArray - The array of numeric indexes
   * @param {Map<string, number>} arrayMap - An optional array map
   * @return {string} - The merged pointer with indexes
   */
  static toIndexedPointer(
    genericPointer: Pointer, indexArray: number[], arrayMap: Map<string, number> = null
  ) {
    if (this.isJsonPointer(genericPointer) && isArray(indexArray)) {
      let indexedPointer = this.compile(genericPointer);
      if (isMap(arrayMap)) {
        let arrayIndex = 0;
        return indexedPointer.replace(/\/\-(?=\/|$)/g, (key, stringIndex) =>
          arrayMap.has((<string>indexedPointer).slice(0, stringIndex)) ?
            '/' + indexArray[arrayIndex++] : key
        );
      } else {
        for (let pointerIndex of indexArray) {
          indexedPointer = indexedPointer.replace('/-', '/' + pointerIndex);
        }
        return indexedPointer;
      }
    }
    if (!this.isJsonPointer(genericPointer)) {
      console.error(`toIndexedPointer error: Invalid JSON Pointer: ${genericPointer}`);
    }
    if (!isArray(indexArray)) {
      console.error(`toIndexedPointer error: Invalid indexArray: ${indexArray}`);
    }
  };

  /**
   * 'toGenericPointer' function
   *
   * Compares an indexed pointer to an array map and removes list array
   * indexes (but leaves tuple arrray indexes and all object keys, including
   * numeric keys) to create a generic pointer.
   *
   * For example, using the indexed pointer '/foo/1/bar/2/baz/3' and
   * the arrayMap [['/foo', 0], ['/foo/-/bar', 3], ['/foo/-/bar/-/baz', 0]]
   * would result in the generic pointer '/foo/-/bar/2/baz/-'
   * Using the indexed pointer '/foo/1/bar/4/baz/3' and the same arrayMap
   * would result in the generic pointer '/foo/-/bar/-/baz/-'
   * (the bar array has 3 tuple items, so index 2 is retained, but 4 is removed)
   *
   * The structure of the arrayMap is: [['path to array', number of tuple items]...]
   *
   * @function
   * @param {Pointer} indexedPointer - The indexed pointer (array or string)
   * @param {Map<string, number>} arrayMap - The optional array map (for preserving tuple indexes)
   * @return {string} - The generic pointer with indexes removed
   */
  static toGenericPointer(
    indexedPointer: Pointer, arrayMap: Map<string, number> = new Map<string, number>()
  ) {
    if (this.isJsonPointer(indexedPointer) && isMap(arrayMap)) {
      let pointerArray = this.parse(indexedPointer);
      for (let i = 1; i < pointerArray.length; i++) {
        const subPointer = this.compile(pointerArray.slice(0, i));
        if (arrayMap.has(subPointer) &&
          arrayMap.get(subPointer) <= +pointerArray[i]
        ) {
          pointerArray[i] = '-';
        }
      }
      return this.compile(pointerArray);
    }
    if (!this.isJsonPointer(indexedPointer)) {
      console.error(`toGenericPointer error: invalid JSON Pointer: ${indexedPointer}`);
    }
    if (!isMap(arrayMap)) {
      console.error(`toGenericPointer error: invalid arrayMap: ${arrayMap}`);
    }
  }

  /**
   * 'toControlPointer' function
   *
   * Accepts a JSON Pointer for a data object and returns a JSON Pointer for the
   * matching control in an Angular FormGroup.
   *
   * @param {Pointer} dataPointer - JSON Pointer (string or array) to a data object
   * @param {FormGroup} formGroup - Angular FormGroup to get value from
   * @param {boolean = false} controlMustExist - Only return if control exists?
   * @return {Pointer} - JSON Pointer (string) to the formGroup object
   */
  static toControlPointer(
    dataPointer: Pointer, formGroup: any, controlMustExist: boolean = false
  ): string {
    const dataPointerArray: string[] = this.parse(dataPointer);
    let controlPointerArray: string[] = [];
    let subGroup = formGroup;
    if (dataPointerArray !== null) {
      for (let key of dataPointerArray) {
        if (hasOwn(subGroup, 'controls')) {
          controlPointerArray.push('controls');
          subGroup = subGroup.controls;
        }
        if (isArray(subGroup) && (key === '-')) {
          controlPointerArray.push((subGroup.length - 1).toString());
          subGroup = subGroup[subGroup.length - 1];
        } else if (hasOwn(subGroup, key)) {
          controlPointerArray.push(key);
          subGroup = subGroup[key];
        } else if (controlMustExist) {
          console.error(`toControlPointer error: Unable to find "${key}" item in FormGroup.`);
          console.error(dataPointer);
          console.error(formGroup);
          return;
        } else {
          controlPointerArray.push(key);
          subGroup = { controls: {} };
        }
      }
      return this.compile(controlPointerArray);
    }
    console.error(`toControlPointer error: Invalid JSON Pointer: ${dataPointer}`);
  }

  /**
   * 'toSchemaPointer' function
   *
   * Accepts a JSON Pointer to a value inside a data object and a JSON schema
   * for that object.
   *
   * Returns a Pointer to the sub-schema for the value inside the object's schema.
   *
   * @param {Pointer} dataPointer - JSON Pointer (string or array) to an object
   * @param {any} schema - JSON schema for the object
   * @return {Pointer} - JSON Pointer (string) to the object's schema
   */
  static toSchemaPointer(dataPointer: Pointer, schema: any): string {
    if (this.isJsonPointer(dataPointer) && typeof schema === 'object') {
      const pointerArray = this.parse(dataPointer);
      const firstKey = pointerArray.shift();
      if (firstKey === undefined) { return ''; }
      if (schema.type === 'object' || schema.properties || schema.additionalProperties) {
        if ((schema.properties || {})[firstKey]) {
          return `/properties/${this.escape(firstKey)}` +
            this.toSchemaPointer(pointerArray, (schema.properties || {})[firstKey]);
        } else  if (schema.additionalProperties) {
          return '/additionalProperties' +
            this.toSchemaPointer(pointerArray, schema.additionalProperties);
        }
      }
      if ((schema.type === 'array' || schema.items) &&
        (isNumber(firstKey) || firstKey === '-' || firstKey === '')
      ) {
        const arrayItem = firstKey === '-' || firstKey === '' ? 0 : +firstKey;
        if (isArray(schema.items)) {
          if (arrayItem < schema.items.length) {
            return `/items/${arrayItem}` +
              this.toSchemaPointer(pointerArray, schema.items[arrayItem]);
          } else if (schema.additionalItems) {
            return '/additionalItems' +
              this.toSchemaPointer(pointerArray, schema.additionalItems);
          }
        } else if (isObject(schema.items)) {
          return '/items' + this.toSchemaPointer(pointerArray, schema.items);
        } else if (isObject(schema.additionalItems)) {
          return '/additionalItems' +
            this.toSchemaPointer(pointerArray, schema.additionalItems);
        }
      }
      console.error(`toSchemaPointer error: Data pointer ${dataPointer} ` +
        `not compatible with schema ${schema}`);
      return null;
    }
    if (!this.isJsonPointer(dataPointer)) {
      console.error(`toSchemaPointer error: Invalid JSON Pointer: ${dataPointer}`);
    }
    if (typeof schema !== 'object') {
      console.error(`toSchemaPointer error: Invalid JSON Schema: ${schema}`);
    }
    return null;
  }

  /**
   * 'toDataPointer' function
   *
   * Accepts a JSON Pointer to a sub-schema inside a JSON schema and the schema.
   *
   * If possible, returns a generic Pointer to the corresponding value inside
   * the data object described by the JSON schema.
   *
   * Returns null if the sub-schema is in an ambiguous location (such as
   * definitions or additionalProperties) where the corresponding value
   * location cannot be determined.
   *
   * @param {Pointer} schemaPointer - JSON Pointer (string or array) to a JSON schema
   * @param {any} schema - the JSON schema
   * @return {Pointer} - JSON Pointer (string) to the value in the data object
   */
  static toDataPointer(schemaPointer: Pointer, schema: any): string {
    if (this.isJsonPointer(schemaPointer) && typeof schema === 'object' &&
      this.has(schema, schemaPointer)
    ) {
      const pointerArray = this.parse(schemaPointer);
      if (!pointerArray.length) { return ''; }
      let dataPointer = '';
      const firstKey = pointerArray.shift();
      if (firstKey === 'properties' ||
        (firstKey === 'items' && isArray(schema.items))
      ) {
        const secondKey = pointerArray.shift();
        return '/' + secondKey +
          this.toDataPointer(pointerArray, schema[firstKey][secondKey]);
      } else if (firstKey === 'additionalItems' ||
        (firstKey === 'items' && isObject(schema.items))
      ) {
        return '/-' + this.toDataPointer(pointerArray, schema[firstKey]);
      }
      return null;
    }
    if (!this.isJsonPointer(schemaPointer)) {
      console.error(`toDataPointer error: Invalid JSON Pointer: ${schemaPointer}`);
    }
    if (typeof schema !== 'object') {
      console.error(`toDataPointer error: Invalid JSON Schema: ${schema}`);
    }
    if (typeof schema !== 'object') {
      console.error(`toDataPointer error: Pointer ${schemaPointer} invalid for Schema: ${schema}`);
    }
    return null;
  }

  /**
   * 'parseObjectPath' function
   *
   * Parses a JavaScript object path into an array of keys, which
   * can then be passed to compile() to convert into a string JSON Pointer.
   *
   * Based on mike-marcacci's excellent objectpath parse function:
   * https://github.com/mike-marcacci/objectpath
   *
   * @param {string} path - The object path to parse
   * @return {string[]} - The resulting array of keys
   */
  static parseObjectPath(path: string | string[]): string[] {
    if (isArray(path)) { return <string[]>path; }
    if (this.isJsonPointer(path)) { return this.parse(path); }
    if (typeof path === 'string') {
      let index: number = 0;
      let parts: string[] = [];
      while (index < path.length) {
        const nextDot: number = path.indexOf('.', index);
        const nextOB: number = path.indexOf('[', index); // next open bracket
        if (nextDot === -1 && nextOB === -1) { // last item
          parts.push(path.slice(index));
          index = path.length;
        } else if (nextDot !== -1 && (nextDot < nextOB || nextOB === -1)) { // dot notation
          parts.push(path.slice(index, nextDot));
          index = nextDot + 1;
        } else { // bracket notation
          if (nextOB > index) {
            parts.push(path.slice(index, nextOB));
            index = nextOB;
          }
          const quote: string = path.charAt(nextOB + 1);
          if (quote === '"' || quote === "'") { // enclosing quotes
            let nextCB: number = path.indexOf(quote + ']', nextOB); // next close bracket
            while (nextCB !== -1 && path.charAt(nextCB - 1) === '\\') {
              nextCB = path.indexOf(quote + ']', nextCB + 2);
            }
            if (nextCB === -1) { nextCB = path.length; }
            parts.push(path.slice(index + 2, nextCB)
              .replace(new RegExp('\\' + quote, 'g'), quote));
            index = nextCB + 2;
          } else { // no enclosing quotes
            let nextCB: number = path.indexOf(']', nextOB); // next close bracket
            if (nextCB === -1) { nextCB = path.length; }
            parts.push(path.slice(index + 1, nextCB));
            index = nextCB + 1;
          }
          if (path.charAt(index) === '.') { index++; }
        }
      }
      return parts;
    }
    console.error('parseObjectPath error: Input object path must be a string.');
  }
}
