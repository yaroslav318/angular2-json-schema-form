# Angular2 JSON Schema Form

[![npm version](https://img.shields.io/npm/v/angular2-json-schema-form.svg?style=plastic)](https://www.npmjs.com/package/angular2-json-schema-form) [![npm downloads](https://img.shields.io/npm/dm/angular2-json-schema-form.svg?style=plastic)](https://www.npmjs.com/package/angular2-json-schema-form) [![GitHub MIT License](https://img.shields.io/github/license/dschnelldavis/angular2-json-schema-form.svg?style=social)](https://github.com/dschnelldavis/angular2-json-schema-form)
[![Dependencies](https://david-dm.org/dschnelldavis/angular2-json-schema-form.svg)](https://david-dm.org/dschnelldavis/angular2-json-schema-form) [![devDependencies](https://david-dm.org/dschnelldavis/angular2-json-schema-form/dev-status.svg)](https://david-dm.org/dschnelldavis/angular2-json-schema-form?type=dev)

A [JSON Schema](http://json-schema.org) Form builder for Angular (2 or 4), similar to, and mostly API compatible with,

  * [JSON Schema Form](https://github.com/json-schema-form)'s [Angular Schema Form](http://schemaform.io) for [Angular 1](https://angularjs.org) ([examples](http://schemaform.io/examples/bootstrap-example.html))
  * [Mozilla](https://blog.mozilla.org/services/)'s [React JSON Schema Form](https://github.com/mozilla-services/react-jsonschema-form) for [React](https://facebook.github.io/react/) ([examples](https://mozilla-services.github.io/react-jsonschema-form/)), and
  * [Joshfire](http://www.joshfire.com)'s [JSON Form](http://github.com/joshfire/jsonform/wiki) for [jQuery](https://jquery.com) ([examples](http://ulion.github.io/jsonform/playground/))

Note: This is a personal proof-of-concept project, and is NOT currently affiliated with any of the organizations listed above. (Though they are all awesome, and totally worth checking out.)

## Installation

### To install from GitHub and play with the examples

The [GitHub](https://github.com) version of Angular JSON Schema Form includes an example playground with over 70 different JSON Schemas (including all examples used by each of the three libraries listed above), and the ability to quickly view any example formatted using Bootstrap 3 or Material Design (or with no formatting, which is functional, but usually pretty ugly).

To install both the library and the example playground, clone `https://github.com/dschnelldavis/angular2-json-schema-form.git` with your favorite git program, or, assuming you have [git](https://git-scm.com/book/en/v2/Getting-Started-Installing-Git) and [Node/NPM](https://nodejs.org/en/download/) installed, enter the following in your terminal:

```shell
git clone https://github.com/dschnelldavis/angular2-json-schema-form.git angular2-json-schema-form
cd angular2-json-schema-form
npm install
npm start
```

This should start the example playground locally and display it at `http://localhost:3000`

All the source code is in the `/src` folder. Inside that folder, you will find the following sub-folders:

* `library` contains the Angular JSON Schema Form library
* `playground` contains the example playground
* `playground/examples` contains the JSON Schema examples
* `frameworks` contains the framework library (described below)
* `widgets` contains the widget library

If you want additional documentation describing the individual functions used in this library, run `npm run docs` to generate TypeDoc documentation, and then look in the newly generated `/docs` folder. (Angular JSON Schema Form is still a work in progress, so right now this documentation varies from highly detailed to completely missing.)

### To install from NPM and use in your own project

If, after playing with the examples, you decide this library is functional enough to use in your own project, you can install it from [NPM](https://www.npmjs.com) by running the following from your terminal:

```shell
npm install angular2-json-schema-form --save
```

If you want to use the Material Design framework, also install Angular2 Material. (If you only want to use the Bootstrap 3 framework, you can skip this step.)

```shell
npm install angular2-json-schema-form --save
```

Then import JsonSchemaFormModule in your main application module:
(Note: if you are using Angular CLI you will want to import from source instead, see the next section for details.)
```javascript
import { JsonSchemaFormModule } from 'angular2-json-schema-form';
```

And finally, add `JsonSchemaFormModule.forRoot()` to the `imports` array in your @NgModule declaration.

Your final app.module.ts should look something like this:

```javascript
import { NgModule }             from '@angular/core';
import { BrowserModule }        from '@angular/platform-browser';
import { MaterialModule }       from '@angular/material';

import { JsonSchemaFormModule } from 'angular2-json-schema-form';

import { AppComponent }         from './app.component';

@NgModule({
  declarations: [ AppComponent ],
  imports:      [
    BrowserModule, MaterialModule.forRoot(), JsonSchemaFormModule.forRoot()
  ],
  bootstrap:    [ AppComponent ]
})
export class AppModule { }
```
(This also shows how to add the Angular2 Material module, used by the Material Design framework. If you will not be using that framework, you can safely leave out both the line `import { MaterialModule } from '@angular/material';` and the import reference `MaterialModule.forRoot(),`.)

#### Additional notes for Angular CLI

If you use [Angular CLI](https://github.com/angular/angular-cli) you will instead need to import JsonSchemaFormModule FROM SOURCE in your main application module (Note the additional `/src` at the end of the import line.):
```javascript
import { JsonSchemaFormModule } from 'angular2-json-schema-form/src';
```

If you create a new Angular CLI project, and install Angular2 Material, your final app.module.ts in /src/app will look like this:
```javascript
import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HttpModule } from '@angular/http';
import { MaterialModule } from '@angular/material';

import { JsonSchemaFormModule } from 'angular2-json-schema-form/src';

import { AppComponent } from './app.component';

@NgModule({
  declarations: [ AppComponent ],
  imports: [
    BrowserModule, FormsModule, HttpModule,
    MaterialModule.forRoot(), JsonSchemaFormModule.forRoot()
  ],
  providers: [],
  bootstrap: [ AppComponent ]
})
export class AppModule { }
```

#### Additional notes for SystemJS

If you use SystemJS, you will also need to make the following changes to your systemjs.config.js file. (If you don't have a systemjs.config.js file in your project, that means you're not using SystemJS, and you can safely ignore this section.)

Add these three lines to the 'map' section:
```javascript
'angular2-json-schema-form': 'npm:angular2-json-schema-form',
'ajv':                       'npm:ajv/dist/ajv.min.js',
'lodash':                    'npm:lodash/lodash.min.js',
```

And add this line to the 'packages' section:
```javascript
'angular2-json-schema-form': { main: './dist/index.js', defaultExtension: 'js' },
```

(For a complete example of how to install and use the library with SystemJS, clone the GitHub repository and look at how the library is imported into the example playground.)

## Using Angular JSON Schema Form

### Basic use

For basic use, after loading the JsonSchemaFormModule as described above, to add a form to your Angular component, simply add the following to your component's template:

```html
<json-schema-form
  [schema]="yourJsonSchema"
  loadExternalAssets="true"
  (onSubmit)="yourOnSubmitFn($event)">
</json-schema-form>
```

Where the `schema` input is a valid JSON schema object (either v3 or v4), and the `onSubmit` output is a function that will be called when the form is submitted, with the results of the form as a JSON object. If you don't already have your own schemas, you can find a whole bunch of samples to test with in the `src/playground/examples` folder, as described above.

(Note: The `loadExternalAssets` attribute is useful when you are first trying out this library, but you will usually want to remove it in your production sites. For full details see 'Changing or adding frameworks', below.)

### Advanced use

#### Additional inputs an outputs

For more control over your form, you may provide these additional inputs:

  * `layout` with a custom form layout (see Angular Schema Form's [form definitions](https://github.com/json-schema-form/angular-schema-form/blob/master/docs/index.md#form-definitions) for information about how to construct a form layout)
  * `data` to populate the form with defaults or previously submitted values
  * `options` to set any global options for the form
  * `widgets` to add custom widgets
  * `framework` to set which framework to use

If you want more detailed output, you may provide additional functions for `onChanges` to read the values in real time as the form is being filled out, and you may implement your own custom validation indicators from the boolean `isValid` or the detailed `validationErrors` outputs.

Here is an example:

```html
<json-schema-form
  [schema]="yourJsonSchema"
  [layout]="yourJsonFormLayout"
  [data]="yourData"
  [options]="yourGlobalOptionSettings"
  [widgets]="yourCustomWidgets"
  [framework]="nameOfFrameworkToUse-or-yourCustomFramework"
  (onChanges)="yourOnChangesFn($event)"
  (onSubmit)="yourOnSubmitFn($event)"
  (isValid)="yourIsValidFn($event)"
  (validationErrors)="yourValidationErrorsFn($event)">
</json-schema-form>
```

#### Single-input mode

You may also combine all your inputs into one compound object and include it as a `form` input, like so:

```javascript
let yourCompoundInputObject = {
  schema:    {...}, // required
  layout:    [...], // optional
  data:      {...}, // optional
  options:   {...}, // optional
  widgets:   {...}, // optional
  framework: {...}  // optional
}
```

```html
<json-schema-form
  [form]="yourCompoundInputObject"
  (onSubmit)="yourOnSubmitFn($event)">
</json-schema-form>
```

You can also mix these two styles depending on your needs. All samples in example playground use the combined `form` input for `schema`, `layout`, and `data`, to enable each example to control those three inputs together, but uses a separate input for `framework`, so the framework can be changed independent of the example.

Combining inputs is useful if you have many unique forms and store each form's data and schema together. If you have one form (or many identical forms), it will likely be more useful to use separate inputs for your data and schema—though even in that case, if you use a custom layout, you could store your schema and layout together and use one input for both.

#### Data-only mode

A new experimental feature will also create a form entirely from a JSON object—with no schema—like so:

```javascript
exampleJsonObject = {
  "first_name": "Jane", "last_name": "Doe", "age": 25, "is_company": false,
  "address": {
    "street_1": "123 Main St.", "street_2": null,
    "city": "Las Vegas", "state": "NV", "zip_code": "89123"
  },
  "phone_numbers": [
    { "number": "702-123-4567", "type": "cell" },
    { "number": "702-987-6543", "type": "work" }
  ], "notes": ""
};
```

```html
<json-schema-form
  [data]="exampleJsonObject"
  loadExternalAssets="true"
  (onSubmit)="yourOnSubmitFn($event)">
</json-schema-form>
```

In this mode, Angular JSON Schema Form generates a schema from your data on the fly. The generated schema is obviously very simple compared to what you could create on your own. However, as the above example shows, it does detect and enforce string, number, and boolean values (nulls are also assumed to be strings), and automatically allows array elements to be added, removed, and reordered.

After displaying a form in this mode, you can also use the `formSchema` and `formLayout` outputs (described in 'Debugging inputs and outputs', below), to return the generated schema and layout, which will give you a head start on writing your own schemas and layouts by showing you examples created from your own data.

#### Compatibility modes

If you have previously used Angular Schema Form, JSON Form, or React JSON Schema Form, in order to make the transition easier, Angular2 JSON Schema Form will recognize the input names and custom input objects used by those libraries, and will automatically work with JSON Schemas in [version 4](http://json-schema.org/draft-03/schema), [version 3](http://json-schema.org/draft-03/schema), or the [truncated version 3 format supported by JSON Form](https://github.com/joshfire/jsonform/wiki#schema-shortcut). So the following will all work:

Angular Schema Form compatibility:
```html
<json-schema-form
  [schema]="yourJsonSchema"
  [form]="yourAngularSchemaFormLayout"
  [model]="yourData">
</json-schema-form>
```

JSON Form compatibility:
```html
<json-schema-form
  [form]="{
    schema: 'yourJsonSchema',
    form: 'yourJsonFormLayout',
    customFormItems: 'yourJsonFormCustomFormItems',
    value: 'yourData'
  }">
</json-schema-form>
```

React JSON Schema Form compatibility:
```html
<json-schema-form
  [JSONSchema]="yourJsonSchema"
  [UISchema]="yourReactJsonSchemaFormUISchema"
  [formData]="yourData">
</json-schema-form>
```

#### Debugging inputs and outputs

Finally, Angular2 JSON Schema Form includes some additional inputs and outputs for debugging:

* `debug` input—activates debugging mode
* `loadExternalAssets` input—automatically loads external JavaScript and CSS needed by the selected framework (this is not 100% reliable, so while this may be helpful during development and testing, it is not recommended in production)
* `formSchema` and `formLayout` outputs—returns the final schema and layout used to create the form (which will either show how your original input schema and layout were modified, if you provided inputs, or show you the automatically generated ones, if you didn't)

```html
<json-schema-form
  [schema]="yourJsonSchema"
  [debug]="true"
  [loadExternalAssets]="true"
  (formSchema)="showFormSchemaFn($event)"
  (formLayout)="showFormLayoutFn($event)">
</json-schema-form>
```

## Customizing

Angular JSON Schema Form has two built-in features designed to make it easy to customize at run-time: a widget library and a framework library. All forms are constructed from these basic components. The default widget library includes all standard HTML 5 form controls, as well as several common layout patterns, such as multiple checkboxes and tab sets. And the default framework library includes templates to style forms using either Bootstrap 3 or Material Design (or with no formatting, which is not useful in production, but can be helpful for debugging).

### Changing or adding widgets

To add a new widget or override an existing widget, either add an object containing your new widgets to the `widgets` input of the `<json-schema-form>` tag, or load the `WidgetLibraryService` and call `registerWidget(widgetType, widgetComponent)`, with a string type name and an Angular component to be used whenever a form needs that widget type.

Example:

```javascript
import { YourInputWidgetComponent } from './your-input-widget.component';
import { YourCustomWidgetComponent } from './your-custom-widget.component';
...
let yourNewWidgets = {
  input: YourInputWidgetComponent,          // Replace existing 'input' widget
  custom-control: YourCustomWidgetComponent // Add new 'custom-control' widget
}
```
...and...
```html
<json-schema-form
  [schema]="yourJsonSchema"
  [widgets]="yourNewWidgets">
</json-schema-form>
```
...or...
```javascript
import { WidgetLibraryService } from 'angular2-json-schema-form';
...
constructor(private widgetLibrary: WidgetLibraryService) { }
...
// Replace existing 'input' widget:
widgetLibrary.registerWidget('input', YourInputWidgetComponent);
// Add new 'custom-control' widget:
widgetLibrary.registerWidget('custom-control', YourCustomWidgetComponent);
```

To see many examples of widgets, explore the source code, or call `getAllWidgets()` from the `WidgetLibraryService` to see all widgets currently available in the library. All default widget components are in the `/src/widgets` folder, and all custom Material Design widget components are in the `/src/frameworks/material-design` folder. (The Bootstrap framework just reformats the default widgets, and so does not include any custom widgets if its own.)

### Changing or adding frameworks

To change the active framework, either use the `framework` input of the `<json-schema-form>` tag, or load the `FrameworkLibraryService` and call `setFramework(yourCustomFramework)`, with either the name of an available framework (by default 'no-framework', 'bootstrap-3' or 'material-design'), or with your own custom framework object in the following format:

```javascript
import { YourFrameworkComponent } from './your-framework.component';
import { YourWidgetComponent } from './your-widget.component';
...
let yourCustomFramework = {
  framework: YourFrameworkComponent,                               // required
  widgets:     { 'your-widget-name': YourWidgetComponent, ... },   // optional
  stylesheets: [ '//url-to-framework-external-style-sheet', ... ], // optional
  scripts:     [ '//url-to-framework-external-script', ... ]       // optional
}
```
...and...
```html
<json-schema-form
  [schema]="yourJsonSchema"
  [framework]="yourCustomFramework">
</json-schema-form>
```
...or...
```javascript
import { FrameworkLibraryService } from 'angular2-json-schema-form';
...
constructor(private frameworkLibrary: FrameworkLibraryService) { }
...
frameworkLibrary.setFramework(yourCustomFramework);
```

The value of the required `framework` key is an Angular component which will be called to format each widget before it is displayed. The optional `widgets` object contains any custom widgets which will override or supplement the built-in widgets. And the optional `stylesheets` and `scripts` arrays contain URLs to any additional external style sheets or JavaScript libraries required by the framework.

#### Loading external assets required by a framework

Most Web layout framework libraries (including both Bootstrap and Material Design) need additional external JavaScript and/or CSS assets loaded in order to work properly. The best practice is to load these assets separately in your site, before calling Angular JSON Schema Form. (For the included libraries, follow these links for more information about how to do this: [Bootstrap](http://getbootstrap.com/getting-started/) and [Material Design](https://github.com/angular/material2/blob/master/GETTING_STARTED.md).)

Alternately, during development, you may find it helpful to let Angular JSON Schema Form load these resources for you (as wed did in the 'Basic use' example, above), which you can do in several ways:

  * Call `setFramework` with a second parameter of `true` (e.g. `setFramework('material-design', true)`), or
  * Add `loadExternalAssets: true` to your `options` object, or
  * Add `loadExternalAssets="true"` to your `<json-schema-form>` tag, as shown above

Finally, if you want to find what scripts a particular framework will automatically load, after setting that framework you can call `getFrameworkStylesheets()` or `getFrameworkScritps()` from the `FrameworkLibraryService` to return the built-in arrays of URLs.

However, if you are creating a production site you should load these assets separately, and remove all references to `loadExternalAssets` to prevent the assets from being loaded twice.

#### Two strategies for writing your own frameworks

The two built-in frameworks (both in the `/src/frameworks` folder) demonstrate different strategies for how frameworks can style form elements. The Bootstrap 3 framework is very lightweight and includes no additional widgets (though it does load some external stylesheets and scripts) and works entirely by adding styles to the default widgets. In contrast, the Material Design framework uses the [Material Design for Angular](https://github.com/angular/material2) library (which must also be loaded into the application separately, as described above) to replace most of the default form control widgets with custom widgets from that library.

## Contributions and future development

If you find this library useful, I'd love to hear from you. If you have any trouble with it or would like to request a feature, please [post an issue on GitHub](https://github.com/dschnelldavis/angular2-json-schema-form/issues).

If you're a programmer and would like a fun intermediate-level Angular2 project to hack on, then clone the library and take a look at the source code. I wrote this library both because I needed an Angular2 JSON Schema Form builder, and also as a way to sharpen my Angular2 skills. This project is just complex enough to be challenging and fun, but not so difficult as to be overwhelming. One thing I particularly like is that each example in the demo playground is like a little puzzle which provides immediate feedback—as soon as it works perfectly, you know you've solved it.

I've also split everything into small modules, so even though some code is still a bit messy, most individual parts should be straightforward to work with. (A lot of the code is well commented, though some isn't—but I'm working to fix that. If you run into anything you don't understand, please ask.) If you make improvements, please [submit pull requests](https://github.com/dschnelldavis/angular2-json-schema-form/pulls) to share what you've done with everyone else.

This library is mostly functional (I'm already using it in another large site, where it works well), but it still has many small bugs to fix and enhancements that could be made. Here's a random list of some stuff I know needs to be improved:

  * No testing framework—The single biggest flaw in this library is that each change or improvement has the potential to break something else (which has already happened several times). Integrating automated tests into the build process would fix that.

  * The 'JSON Schema - Required Field' example doesn't work—Currently, required fields inside objects are always required. But when the object itself is not required, those fields should instead be dynamically required, or not, only if at least one field in the object is non-empty.

  * More frameworks—Not everyone uses Bootstrap 3 or Material Design, so it would be great to create framework plug-ins for [Bootstrap 4](https://github.com/ng-bootstrap/ng-bootstrap), [Foundation 6](https://github.com/zurb/foundation-sites), [Semantic UI](https://github.com/vladotesanovic/ngSemantic), or other web design frameworks.

  * More widgets—There are lots of great form controls available, such as the [Pikaday calendar](https://github.com/dbushell/Pikaday), [Spectrum color picker](http://bgrins.github.io/spectrum), and [ACE code editor](https://ace.c9.io), which just need small custom wrappers to convert them into Angular2 JSON Schema Form plug-ins.

  * Also, there are a bunch of 'TODO:' comments in the source code noting other bugs and improvements I'd like to add someday.

So if you like this library, need help, or want to contribute, let me know.

Thanks! I hope you enjoy using this library as much as I enjoyed writing it. :-)

# License

[MIT](/LICENSE)
