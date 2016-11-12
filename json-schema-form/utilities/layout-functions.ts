import { FormGroup, FormBuilder } from '@angular/forms';
import { Http } from '@angular/http';
import { Observable } from 'rxjs/Observable';
import 'rxjs/add/operator/map';

import * as _ from 'lodash';
import * as Immutable from 'immutable';

import { WidgetLibraryService } from '../widgets/widget-library.service';
const widgetLibrary = new WidgetLibraryService();

import {
  buildFormGroupTemplate, checkInlineType, copy, forEach, getFromSchema,
  getInputType, getControl, hasOwn, inArray, isArray, isEmpty, isInputRequired,
  isMap, isNumber, isObject, isDefined, isString, JsonPointer, toControlPointer,
  toTitleCase, updateInputOptions,
} from './index';

/**
 * Layout function library:
 *
 * buildLayout:            Builds a complete layout from an input layout and schema
 *
 * buildLayoutFromSchema:  Builds a complete layout entirely from an input schema
 *
 * mapLayout:
 *
 * buildTitleMap:
 *
 * toIndexedPointer:
 *
 * toGenericPointer:
 */

/**
 * 'buildLayout' function
 *
 * @param {any} formSettings
 * @return {any[]}
 */
export function buildLayout(formSettings: any): any[] {
  let hasSubmitButton = !JsonPointer.get(formSettings, '/globalOptions/addSubmit');
  let formLayout =
    mapLayout(formSettings.layout, (layoutItem, index, layoutPointer) => {

    let currentIndex: number = index;
    let newNode: any = {};
    if (isObject(layoutItem)) {
      newNode = layoutItem;
    } else if (JsonPointer.isJsonPointer(layoutItem)) {
      newNode.dataPointer = layoutItem;
    } else if (isString(layoutItem)) {
      newNode.key = layoutItem;
    } else {
      console.error('buildLayout error: Form layout element not recognized:');
      console.error(layoutItem);
      return null;
    }
    newNode.options = {};
    newNode.layoutPointer = layoutPointer.replace(/\/\d+/g, '/-');
    let itemSchema: any = null;

    // If newNode does not have a dataPointer, try to find an equivalent
    if (!hasOwn(newNode, 'dataPointer')) {

      // If newNode has a key, change it to a dataPointer
      if (hasOwn(newNode, 'key')) {
        if (newNode.key === '*') {
          newNode.dataPointer = newNode.key;
        } else if (JsonPointer.isJsonPointer(newNode.key)) {
          newNode.dataPointer = JsonPointer.compile(newNode.key);
        } else {
          newNode.dataPointer =
            JsonPointer.compile(JsonPointer.parseObjectPath(newNode.key), '-');
        }
        delete newNode.key;

      // If newNode is an array, searh for dataPointer in child nodes
      } else if (hasOwn(newNode, 'type') && newNode.type.slice(-5) === 'array') {
        const findDataPointer = (items) => {
          if (items === null || typeof items !== 'object') return;
          if (hasOwn(items, 'dataPointer')) return items.dataPointer;
          if (isArray(items.items)) {
            for (let item of items.items) {
              if (hasOwn(item, 'dataPointer') &&
                item.dataPointer.indexOf('/-') !== -1
              ) {
                return item.dataPointer;
              }
              if (hasOwn(item, 'items')) {
                const searchItem = findDataPointer(item);
                if (searchItem) return searchItem;
              }
            }
          }
        };
        const childDataPointer = findDataPointer(newNode);
        if (childDataPointer) {
          newNode.dataPointer =
            childDataPointer.slice(0, childDataPointer.lastIndexOf('/-'));
        }
      }
    }

    if (hasOwn(newNode, 'dataPointer')) {
      if (newNode.dataPointer === '*') {
        return buildLayoutFromSchema(
          formSettings, newNode.layoutPointer.slice(0, -2)
        );
      }
      newNode.dataPointer =
        toGenericPointer(newNode.dataPointer, formSettings.arrayMap);
      const LastKey: string = JsonPointer.toKey(newNode.dataPointer);
      if (isString(LastKey) && LastKey !== '-') newNode.name = LastKey;
      if (!formSettings.dataMap.has(newNode.dataPointer)) {
        formSettings.dataMap.set(newNode.dataPointer, new Map);
      } else if (
        formSettings.dataMap.get(newNode.dataPointer).has('schemaPointer')
      ) {
        itemSchema = JsonPointer.get(
          formSettings.schema,
          formSettings.dataMap.get(newNode.dataPointer).get('schemaPointer')
        );
      } else {
        itemSchema = getFromSchema(formSettings.schema, newNode.dataPointer);
      }
      if (itemSchema) {
        if (!hasOwn(newNode, 'type')) {
          newNode.type = getInputType(itemSchema, newNode);
        } else if (!widgetLibrary.hasWidget(newNode.type)) {
          const oldWidgetType = newNode.type;
          newNode.type = getInputType(itemSchema, newNode);
          console.error('error: widget type "' + oldWidgetType +
            '" not found in library. Replacing with "' + newNode.type + '".');
        } else {
          newNode.type = checkInlineType(newNode.type, itemSchema, newNode);
        }
        newNode.dataType = itemSchema.type;
        updateInputOptions(newNode, itemSchema, formSettings);

        // Present checkboxes as single control, rather than array
        if (newNode.type === 'checkboxes' && hasOwn(itemSchema, 'items')) {
          updateInputOptions(newNode, itemSchema.items, formSettings);
        } else if (itemSchema.type === 'array' && hasOwn(itemSchema, 'items')) {
          if (isArray(itemSchema.items)) {
            newNode.tupleItems = itemSchema.items.length;
            if (hasOwn(itemSchema, 'additionalItems')) {
              newNode.listItems = hasOwn(itemSchema, 'maxItems') ?
                itemSchema.maxItems - itemSchema.items.length : true;
            } else {
              newNode.listItems = false;
            }
          } else {
            newNode.tupleItems = false;
            newNode.listItems = itemSchema.maxItems || true;
          }
        }
        if (!newNode.options.title && newNode.options.legend) {
          newNode.options.title = newNode.options.legend;
        } else if (!newNode.options.title) {
          newNode.options.title = toTitleCase(newNode.name.replace(/_/g, ' '));
        }
        if (isInputRequired(formSettings.schema, newNode.dataPointer)) {
          newNode.options.required = true;
          formSettings.fieldsRequired = true;
        }
      } else {
        // TODO: create item in FormGroup model from layout key (?)
        updateInputOptions(newNode, {}, formSettings);
      }

      newNode.widget = widgetLibrary.getWidget(newNode.type);
      formSettings.dataMap.get(newNode.dataPointer).set('inputType', newNode.type);
      formSettings.dataMap.get(newNode.dataPointer).set('widget', newNode.widget);

      if (newNode.dataType === 'array' && hasOwn(newNode, 'items')) {
        if (newNode.options.required && !newNode.minItems) newNode.minItems = 1;
        let arrayPointer: string = newNode.dataPointer + '/-';
        if (!formSettings.dataMap.has(arrayPointer)) {
          formSettings.dataMap.set(arrayPointer, new Map);
        }
        formSettings.dataMap.get(arrayPointer).set('inputType', 'section');

        // Fix insufficiently nested array item groups
        if (newNode.items.length > 1) {
          let arrayItemGroup = [];
          let arrayItemGroupTemplate = [];
          let newIndex = 0;
          for (let i = newNode.items.length - 1, l = 0; i >= l; i--) {
            let subItem = newNode.items[i];
            if (hasOwn(subItem, 'dataPointer') &&
              subItem.dataPointer.slice(0, arrayPointer.length) === arrayPointer
            ) {
              let arrayItem = newNode.items.splice(i, 1)[0];
              let arrayItemTemplate = mapLayout([arrayItem], templateItem => {
                templateItem.layoutPointer = templateItem.layoutPointer
                  .replace(newNode.layoutPointer, newNode.layoutPointer + '/items/-');
                return templateItem;
              })[0];
              arrayItemGroupTemplate.unshift(arrayItemTemplate);
              arrayItem.dataPointer = newNode.dataPointer + '/-' +
                arrayItem.dataPointer.slice(arrayPointer.length);
              arrayItem.layoutPointer = newNode.layoutPointer + '/items/-/items/-';
              arrayItemGroup.unshift(arrayItem);
              newIndex++;
            } else {
              subItem.arrayItem = true;
              // TODO: Check schema to get arrayItemType and removable
              subItem.arrayItemType = 'list';
              subItem.removable = newNode.options.removable || !newNode.options.minItems;
            }
          }
          if (arrayItemGroup.length) {
            newNode.items.push({
              arrayItem: true,
              items: arrayItemGroup,
              layoutPointer: newNode.layoutPointer + '/items/-',
              options: {
                arrayItemType: newNode.tupleItems > newNode.items.length ?
                  'tuple' : 'list',
                removable: newNode.options.removable !== false &&
                  (newNode.options.minItems || 0) <= newNode.items.length,
              },
              dataPointer: newNode.dataPointer + '/-',
              type: 'fieldset',
              widget: widgetLibrary.getWidget('fieldset'),
            });
          }
        } else {
          newNode.items[0].arrayItem = true;
          if (!newNode.items[0].dataPointer) {
            newNode.items[0].dataPointer =
              toGenericPointer(arrayPointer, formSettings.arrayMap);
          }
          if (newNode.options.minItems) {
            newNode.items[0].options.removable = false;
          } else if (!JsonPointer.has(newNode, '/items/0/options/removable')) {
            newNode.items[0].options.removable = true;
          }
          newNode.items[0].options.arrayItemType =
            newNode.tupleItems ? 'tuple' : 'list';
        }

        // TODO: check maxItems to verify adding new items is OK, and check
        // additionalItems for whether there is a different schema for new items
        if (newNode.options.addable !== false) {
          formSettings.layoutRefLibrary[arrayPointer] =
            _.cloneDeep(newNode.items[newNode.items.length - 1]);
          const initialNodeData =
            JsonPointer.get(formSettings.initialValues, newNode.dataPointer);
          if (isArray(initialNodeData) &&
            initialNodeData.length > newNode.items.length
          ) {
            for (let i = newNode.items.length, l = initialNodeData.length; i < l; i++) {
              newNode.items
                .push(_.cloneDeep(formSettings.layoutRefLibrary[arrayPointer]));
            }
          }
          let buttonText: string = 'Add';
          if (newNode.options.title) {
            buttonText += ' ' + newNode.options.title;
          } else if (newNode.name) {
            buttonText += ' ' + toTitleCase(newNode.name.replace(/_/g, ' '));
          // If newNode doesn't have a title, look for title of parent array item
          } else {
            const parentSchema =
              getFromSchema(formSettings.schema, newNode.dataPointer, true);
            if (hasOwn(parentSchema, 'title')) {
              buttonText += ' to ' + parentSchema.title;
            }
          }
          const dataPointer = toGenericPointer(arrayPointer, formSettings.arrayMap);
          let newNodeRef: any = {
            arrayItem: true,
            dataPointer: dataPointer,
            layoutPointer: newNode.layoutPointer + '/items/-',
            listItems: newNode.listItems,
            options: {
              arrayItemType: 'list',
              removable: !!newNode.options.removable,
              title: buttonText,
            },
            tupleItems: newNode.tupleItems,
            type: '$ref',
            widget: widgetLibrary.getWidget('$ref'),
            $ref: dataPointer,
          };
          if (isDefined(newNode.options.maxItems)) {
            newNodeRef.options.maxItems = newNode.options.maxItems;
          }
          if (isString(JsonPointer.get(newNode, '/style/add'))) {
            newNodeRef.options.fieldStyle = newNode.style.add;
            delete newNode.style.add;
            if (isEmpty(newNode.style)) delete newNode.style;
          }
          newNode.items.push(newNodeRef);
        }
      } else {
        newNode.arrayItem = false;
      }
    } else if (hasOwn(newNode, 'type')) {
      newNode.arrayItem = false;
      newNode.widget = widgetLibrary.getWidget(newNode.type);
      updateInputOptions(newNode, {}, formSettings);
    }
    if (newNode.type === 'submit') hasSubmitButton = true;
    return newNode;
  });
  if (!hasSubmitButton) {
    formLayout.push({
      options: {
        title: 'Submit',
      },
      type: 'submit',
      widget: widgetLibrary.getWidget('submit'),
    });
  }
  return formLayout;
}

/**
 * 'buildLayoutFromSchema' function
 *
 * @param {any} formSettings -
 * @param {number = 0} layoutIndex -
 * @param {string = ''} layoutPointer -
 * @param {string = ''} schemaPointer -
 * @param {string = ''} dataPointer -
 * @param {boolean = false} arrayItem -
 * @param {string = null} arrayItemType -
 * @param {boolean = null} removable -
 * @param {boolean = true} forRefLibrary -
 * @return {any}
 */
export function buildLayoutFromSchema(
  formSettings: any, layoutPointer: string = '',
  schemaPointer: string = '', dataPointer: string = '',
  arrayItem: boolean = false, arrayItemType: string = null,
  removable: boolean = null, forRefLibrary: boolean = false
): any {
  const schema = JsonPointer.get(formSettings.schema, schemaPointer);
  if (!hasOwn(schema, 'type') && !hasOwn(schema, 'x-schema-form') &&
    !hasOwn(schema, '$ref')) return null;
  let newNode: any = { options: {} };
  newNode.dataPointer = toGenericPointer(dataPointer, formSettings.arrayMap);
  newNode.layoutPointer = layoutPointer.replace(/\/\d+/g, '/-');
  const lastDataKey = JsonPointer.toKey(newNode.dataPointer);
  if (lastDataKey !== '-') newNode.name = lastDataKey;
  newNode.type = getInputType(schema);
  newNode.dataType = schema.type || (hasOwn(schema, '$ref') ? '$ref' : null);
  newNode.arrayItem = arrayItem;
  if (newNode.arrayItem) {
    newNode.options.arrayItemType = arrayItemType;
    newNode.options.removable = removable;
  }
  newNode.widget = widgetLibrary.getWidget(newNode.type);
  if (dataPointer !== '') {
    if (!formSettings.dataMap.has(newNode.dataPointer)) {
      formSettings.dataMap.set(newNode.dataPointer, new Map);
    }
    formSettings.dataMap.get(newNode.dataPointer).set('schemaPointer', schemaPointer);
    formSettings.dataMap.get(newNode.dataPointer).set('inputType', newNode.type);
    formSettings.dataMap.get(newNode.dataPointer).set('widget', newNode.widget);
  }
  updateInputOptions(newNode, schema, formSettings);
  if (!newNode.options.title && newNode.options.legend) {
    newNode.options.title = newNode.options.legend;
  } else if (!newNode.options.title && newNode.name) {
    newNode.options.title = toTitleCase(newNode.name.replace(/_/g, ' '));
  }
  if (newNode.dataType === 'object') {
    let newFieldset: any[] = [];
    let newKeys: string[];
    let subObject: string = 'properties';
    if (hasOwn(schema, 'properties')) {
      newKeys = hasOwn(schema.properties, 'ui:order') ?
        schema['properties']['ui:order'] : Object.keys(schema['properties']);
    } else if (hasOwn(schema, 'additionalProperties')) {
      subObject = 'additionalProperties';
      newKeys = Object.keys(schema['additionalProperties']);
    }
    for (let key of newKeys) {
      if (hasOwn(schema[subObject], key)) {
        let newLayoutPointer: string;
        if (newNode.layoutPointer === '' && !forRefLibrary) {
          newLayoutPointer = '/-';
        } else {
          newLayoutPointer = newNode.layoutPointer + '/items/-';
        }
        let innerItem = buildLayoutFromSchema(
          formSettings,
          newLayoutPointer,
          schemaPointer + '/properties/' + key,
          dataPointer + '/' + key,
          false, null, null, forRefLibrary
        );
        if (innerItem) {
          if (isInputRequired(schema, '/' + key)) {
            innerItem.options.required = true;
            formSettings.fieldsRequired = true;
          }
          newFieldset.push(innerItem);
        }
      }
    }
    if (dataPointer === '' && !forRefLibrary) {
      newNode = newFieldset;
    } else {
      newNode.items = newFieldset;
    }
  } else if (newNode.dataType === 'array') {
    newNode.items = [];
    let templateArray: any[] = [];
    if (!forRefLibrary) {
      const templateControl: any =
        getControl(formSettings.formGroupTemplate, dataPointer);
      if (hasOwn(templateControl, 'controls')) {
        templateArray = templateControl['controls'];
      }
    }
    if (!newNode.minItems && isInputRequired(formSettings.schema, schemaPointer)) {
      newNode.minItems = 1;
    }
    const minItems: number = newNode.minItems || 0;
    const maxItems: number = newNode.maxItems || 1000000;
    if (isDefined(newNode.options.removable)) {
      removable = newNode.options.removable;
    } else if (!isDefined(removable)) {
      removable = true;
    }
    let additionalItems: any = null;
    if (isArray(schema.items)) { // 'items' is an array = tuple items
      newNode.tupleItems = schema.items.length;
      if (hasOwn(schema, 'additionalItems')) {
        newNode.listItems = hasOwn(schema, 'maxItems') ?
          schema.maxItems - schema.items.length : true;
      } else {
        newNode.listItems = false;
      }
      newNode.items = _.filter(_.map(schema.items, (item: any, i) => {
        return buildLayoutFromSchema(
          formSettings,
          newNode.layoutPointer + '/items/-',
          schemaPointer + '/items/' + i,
          dataPointer + '/' + i,
          true, 'tuple', removable && i >= minItems, forRefLibrary
        );
      }));
      if (newNode.items.length < maxItems &&
        hasOwn(schema, 'additionalItems') && isObject(schema.additionalItems)
      ) { // 'additionalItems' is an object = additional list items
        if (newNode.items.length < templateArray.length) {
          for (let i = newNode.items.length, l = templateArray.length; i < l; i++) {
            newNode.items.push(buildLayoutFromSchema(
              formSettings,
              newNode.layoutPointer + '/items/-',
              schemaPointer + '/additionalItems',
              dataPointer + '/' + i,
              true, 'list', removable && i >= minItems, forRefLibrary
            ));
          }
        } else if (newNode.items.length > templateArray.length) {
          for (let i = templateArray.length, l = newNode.items.length; i < l; i++) {
            templateArray.push(buildFormGroupTemplate(
              formSettings, null, false,
              schemaPointer + '/additionalItems',
              dataPointer + '/' + i,
              toControlPointer(formSettings.formGroupTemplate, dataPointer + '/' + i)
            ));
          }
        }
        if (newNode.items.length < maxItems && newNode.options.addable !== false &&
          JsonPointer.get(newNode.items[newNode.items.length - 1], '/type') !== '$ref'
        ) {
          additionalItems = buildLayoutFromSchema(
            formSettings,
            newNode.layoutPointer + '/items/-',
            schemaPointer + '/additionalItems',
            dataPointer + '/-',
            true, 'list', removable, forRefLibrary
          );
        }
      }
    } else { // 'items' is an object = list items only (no tuple items)
      newNode.tupleItems = false;
      newNode.listItems = schema.maxItems || true;
      for (let i = 0, l = Math.max(templateArray.length, minItems, 1); i < l; i++) {
        newNode.items.push(buildLayoutFromSchema(
          formSettings,
          newNode.layoutPointer + '/items/-',
          schemaPointer + '/items',
          dataPointer + '/' + i,
          true, 'list', removable && i >= minItems, forRefLibrary
        ));
      }
      if (newNode.items.length < maxItems && newNode.options.addable !== false &&
        JsonPointer.get(newNode.items[newNode.items.length - 1], '/type') !== '$ref'
      ) {
        additionalItems = buildLayoutFromSchema(
          formSettings,
          newNode.layoutPointer + '/items/-',
          schemaPointer + '/items',
          dataPointer + '/-',
          true, 'list', removable, forRefLibrary
        );
      }
    }

    // If addable items, save to layoutRefLibrary, and add $ref item to layout
    if (additionalItems) {
      formSettings.layoutRefLibrary[dataPointer + '/-'] = additionalItems;
      delete formSettings.layoutRefLibrary[dataPointer + '/-']['key'];
      delete formSettings.layoutRefLibrary[dataPointer + '/-']['name'];
      let buttonText: string = 'Add ';
      if (additionalItems.options.title) {
        buttonText += additionalItems.options.title;
      } else if (schema.title) {
        buttonText += 'to ' + schema.title;
      } else {
        buttonText += 'to ' +
          toTitleCase(JsonPointer.toKey(dataPointer).replace(/_/g, ' '));
      }
      let newNodeRef: any = {
        arrayItem: true,
        dataPointer: dataPointer + '/-',
        layoutPointer: newNode.layoutPointer + '/items/-',
        listItems: newNode.listItems,
        options: {
          arrayItemType: 'list',
          removable: false,
          title: buttonText,
        },
        tupleItems: newNode.tupleItems,
        type: '$ref',
        widget: widgetLibrary.getWidget('$ref'),
        $ref: dataPointer + '/-',
      };
      if (isDefined(newNode.options.maxItems)) {
        newNodeRef.options.maxItems = newNode.options.maxItems;
      }
      newNode.items.push(newNodeRef);
    } else if (
      JsonPointer.get(newNode.items[newNode.items.length - 1], '/type') === '$ref'
    ) {
      Object.assign(newNode.items[newNode.items.length - 1], {
        listItems: newNode.listItems,
        tupleItems: newNode.tupleItems,
      });
      if (
        isNumber(JsonPointer.get(formSettings.schema, schemaPointer, 0, -1).maxItems)
      ) {
        newNode.items[newNode.items.length - 1].options.maxItems =
          JsonPointer.get(formSettings.schema, schemaPointer, 0, -1).maxItems;
      }
    }
  } else if (newNode.dataType === '$ref') {
    let buttonText: string = 'Add';
    if (newNode.options.title) {
      buttonText += ' ' + newNode.options.title;
    } else if (newNode.name) {
      buttonText += ' ' + toTitleCase(newNode.name.replace(/_/g, ' '));
    // If newNode doesn't have a title, look for title of parent array item
    } else if (
      hasOwn(JsonPointer.get(formSettings.schema, schemaPointer, 0, -1), 'title')
    ) {
      buttonText += ' to ' +
        JsonPointer.get(formSettings.schema, schemaPointer, 0, -1).title;
    }
    Object.assign(newNode, {
      circularReference: true,
      widget: widgetLibrary.getWidget('$ref'),
      $ref: schema.$ref,
    });
    Object.assign(newNode.options, {
      removable: false,
      title: buttonText,
    });
    if (isNumber(JsonPointer.get(formSettings.schema, schemaPointer, 0, -1).maxItems)) {
      newNode.options.maxItems =
        JsonPointer.get(formSettings.schema, schemaPointer, 0, -1).maxItems;
    }

    // Build dataCircularRefMap
    if (!forRefLibrary) {
      // Temporary entry with schema $ref
      formSettings.dataCircularRefMap.set(schema.$ref, newNode.dataPointer);
    } else if (formSettings.dataCircularRefMap.has(schema.$ref) &&
      !formSettings.dataCircularRefMap.has(formSettings.dataCircularRefMap.get(schema.$ref))
    ) {
      // If temporary entry already exists, map current and previous dataPointers
      if (newNode.dataPointer === formSettings.dataCircularRefMap
        .get(schema.$ref).slice(-newNode.dataPointer.length)
      ) {
        formSettings.dataCircularRefMap.set(
          formSettings.dataCircularRefMap.get(schema.$ref),
          formSettings.dataCircularRefMap.get(schema.$ref).slice(0, -newNode.dataPointer.length)
        );
      } else {
        formSettings.dataCircularRefMap.set(
          formSettings.dataCircularRefMap.get(schema.ref) + newNode.dataPointer,
          formSettings.dataCircularRefMap.get(schema.$ref)
        );
      }
    }

    // Add layout template to layoutRefLibrary
    if (!hasOwn(formSettings.layoutRefLibrary, schema.$ref)) {
      // Set to null first to prevent circular reference from causing endless loop
      formSettings.layoutRefLibrary[schema.$ref] = null;
      formSettings.layoutRefLibrary[schema.$ref] = buildLayoutFromSchema(
        formSettings, '', JsonPointer.compile(schema.$ref), '',
        newNode.arrayItem, newNode.arrayItemType, true, true
      );
    }
  }
  return newNode;
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
 * @param {any = ''} layoutPointer - the layoutPointer to layout, inside rootLayout
 * @return {[type]}
 */
export function mapLayout(
  layout: any[],
  fn: (v: any, i?: number, p?: string, l?: any) => any,
  layoutPointer: string = '',
  rootLayout: any[] = layout
): any[] {
  let indexPad: number = 0;
  let newLayout: any[] = [];
  forEach(layout, (item, index) => {
    let realIndex = +index + indexPad;
    let newPath = layoutPointer + '/' + realIndex;
    let newNode: any = copy(item);
    let itemsArray: any[] = [];
    if (isObject(item)) {
      if (hasOwn(item, 'items')) {
        itemsArray = isArray(item.items) ? item.items : [item.items];
      } else if (hasOwn(item, 'tabs')) {
        itemsArray = isArray(item.tabs) ? item.tabs : [item.tabs];
      }
    }
    if (itemsArray.length) {
      newNode.items = mapLayout(itemsArray, fn, newPath + '/items', rootLayout);
    }
    newNode = fn(newNode, realIndex, newPath, rootLayout);
    if (!isDefined(newNode)) {
      indexPad--;
    } else {
      if (isArray(newNode)) indexPad += newNode.length - 1;
      newLayout = newLayout.concat(newNode);
    }
  });
  return newLayout;
};

/**
 * 'buildTitleMap' function
 *
 * @param {any} titleMap -
 * @param {any} enumList -
 * @param {boolean = false} fieldRequired -
 * @return {{name: string, value: any}[]}
 */
export function buildTitleMap(
  titleMap: any, enumList: any, fieldRequired: boolean = true
): { name: string, value: any }[] {
  let newTitleMap: { name: string, value: any }[] = [];
  let hasEmptyValue: boolean = false;
  if (titleMap) {
    if (isArray(titleMap)) {
      if (enumList) {
        for (let i of Object.keys(titleMap)) {
          if (isObject(titleMap[i])) { // JSON Form / Angular Schema Form style
            const value: any = titleMap[i].value;
            if (enumList.indexOf(value) !== -1) {
              const name: string = titleMap[i].name;
              newTitleMap.push({ name, value });
              if (!value) hasEmptyValue = true;
            }
          } else if (isString(titleMap[i])) { // React Jsonschema Form style
            if (i < enumList.length) {
              const name: string = titleMap[i];
              const value: any = enumList[i];
              newTitleMap.push({ name, value });
              if (!value) hasEmptyValue = true;
            }
          }
        }
      } else { // If array titleMap and no enum list, just return the titleMap
        newTitleMap = titleMap;
        if (!fieldRequired) hasEmptyValue = !!newTitleMap.filter(i => !i.value).length;
      }
    } else if (enumList) { // Alternate JSON Form style, with enum list
      for (let i of Object.keys(enumList)) {
        let value: any = enumList[i];
        if (hasOwn(titleMap, value)) {
          let name: string = titleMap[value];
          newTitleMap.push({ name, value });
          if (!value) hasEmptyValue = true;
        }
      }
    } else { // Alternate JSON Form style, without enum list
      for (let value of Object.keys(titleMap)) {
        let name: string = titleMap[value];
        newTitleMap.push({ name, value });
        if (!value) hasEmptyValue = true;
      }
    }
  } else if (enumList) { // Build map from enum list alone
    for (let i of Object.keys(enumList)) {
      let name: string = enumList[i];
      let value: any = enumList[i];
      newTitleMap.push({ name, value});
      if (!value) hasEmptyValue = true;
    }
  } else { // If no titleMap and no enum list, return default map of boolean values
    newTitleMap = [{ name: 'True', value: true }, { name: 'False', value: false }];
  }
  if (!fieldRequired && !hasEmptyValue) {
    newTitleMap.unshift({ name: '', value: '' });
  }
  return newTitleMap;
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
**/
export function toIndexedPointer(
  genericPointer: string, indexArray: number[], arrayMap: Map<string, number> = null
) {
  if (JsonPointer.isJsonPointer(genericPointer) && isArray(indexArray)) {
    if (isMap(arrayMap)) {
      let arrayIndex: number = 0;
      return genericPointer.replace(/\/\-(?=\/|$)/g, (key, stringIndex) => {
        const subPointer = genericPointer.slice(0, stringIndex);
        if (arrayMap.has(subPointer)) return '/' + indexArray[arrayIndex++];
      });
    } else {
      let indexedPointer = genericPointer;
      for (let pointerIndex of indexArray) {
        indexedPointer = indexedPointer.replace('/-', '/' + pointerIndex);
      }
      return indexedPointer;
    }
  }
  console.error('toIndexedPointer error: genericPointer must be ' +
    'a JSON Pointer and indexArray must be an array.');
  console.error(genericPointer);
  console.error(indexArray);
};

/**
 * 'toGenericPointer' function
 *
 * Compares an indexed pointer to an array map and removes list array
 * indexes (but leaves tuple arrray indexes and all object keys, including
 * numeric keys) to create a generic pointer.
 *
 * For example, comparing the indexed pointer '/foo/1/bar/2/baz/3' and
 * the arrayMap [['/foo', 0], ['/foo/-/bar', 3], ['/foo/-/bar/2/baz', 0]]
 * would result in the generic pointer '/foo/-/bar/2/baz/-'
 *
 * The structure of the arrayMap is: ['path to array', number of tuple items]
 *
 * @function
 * @param {string} indexedPointer - The indexed pointer
 * @param {Map<string, number>} arrayMap - The array map
 * @return {string} - The merged pointer with indexes
**/
export function toGenericPointer(
  indexedPointer: string, arrayMap: Map<string, number>
) {
  if (JsonPointer.isJsonPointer(indexedPointer) && isMap(arrayMap)) {
    let pointerArray = JsonPointer.parse(indexedPointer);
    for (let i = 1, l = pointerArray.length; i < l; i++) {
      const subPointer = JsonPointer.compile(pointerArray.slice(0, i));
      if (arrayMap.has(subPointer) && arrayMap.get(subPointer) <= +pointerArray[i]) {
        pointerArray[i] = '-';
      }
    }
    return JsonPointer.compile(pointerArray);
  }
  console.error('toGenericPointer error: indexedPointer must be ' +
    'a JSON Pointer and arrayMap must be a Map.');
  console.error(indexedPointer);
  console.error(arrayMap);
};
