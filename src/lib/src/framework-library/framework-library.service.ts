import { Inject, Injectable } from '@angular/core';

import { WidgetLibraryService } from '../widget-library/widget-library.service';
import { hasOwn } from '../shared/utility.functions';

// No framework - plain HTML controls (styles from form layout only)
import { NoFrameworkComponent } from './no-framework.component';

// Bootstrap 3 Framework
// https://github.com/valor-software/ng2-bootstrap
import { Bootstrap3FrameworkComponent } from './bootstrap-3-framework/bootstrap-3-framework.component';

// Bootstrap 4 Framework
// https://github.com/ng-bootstrap/ng-bootstrap
import { Bootstrap4FrameworkComponent } from './bootstrap-4-framework/bootstrap-4-framework.component';

// Material Design Framework
// https://github.com/angular/material2
import { FlexLayoutRootComponent } from './material-design-framework/flex-layout-root.component';
import { FlexLayoutSectionComponent } from './material-design-framework/flex-layout-section.component';
import { MaterialAddReferenceComponent } from './material-design-framework/material-add-reference.component';
import { MaterialOneOfComponent } from './material-design-framework/material-one-of.component';
import { MaterialButtonComponent } from './material-design-framework/material-button.component';
import { MaterialButtonGroupComponent } from './material-design-framework/material-button-group.component';
import { MaterialCheckboxComponent } from './material-design-framework/material-checkbox.component';
import { MaterialCheckboxesComponent } from './material-design-framework/material-checkboxes.component';
import { MaterialChipListComponent } from './material-design-framework/material-chip-list.component';
import { MaterialDatepickerComponent } from './material-design-framework/material-datepicker.component';
import { MaterialFileComponent } from './material-design-framework/material-file.component';
import { MaterialInputComponent } from './material-design-framework/material-input.component';
import { MaterialNumberComponent } from './material-design-framework/material-number.component';
import { MaterialRadiosComponent } from './material-design-framework/material-radios.component';
import { MaterialSelectComponent } from './material-design-framework/material-select.component';
import { MaterialSliderComponent } from './material-design-framework/material-slider.component';
import { MaterialStepperComponent } from './material-design-framework/material-stepper.component';
import { MaterialTabsComponent } from './material-design-framework/material-tabs.component';
import { MaterialTextareaComponent } from './material-design-framework/material-textarea.component';
import { MaterialDesignFrameworkComponent } from './material-design-framework/material-design-framework.component';

// Possible future frameworks:
// - Foundation 6:
//   http://justindavis.co/2017/06/15/using-foundation-6-in-angular-4/
//   https://github.com/zurb/foundation-sites
// - Semantic UI:
//   https://github.com/edcarroll/ng2-semantic-ui
//   https://github.com/vladotesanovic/ngSemantic

export interface Framework {
  framework: any,
  widgets?: { [key: string]: any },
  stylesheets?: string[],
  scripts?: string[]
};

export interface FrameworkLibrary {
  [key: string]: Framework
};

@Injectable()
export class FrameworkLibraryService {
  activeFramework: Framework = null;
  stylesheets: (HTMLStyleElement|HTMLLinkElement)[];
  scripts: HTMLScriptElement[];
  loadExternalAssets = false;
  defaultFramework = 'no-framework';
  frameworkLibrary: FrameworkLibrary = {
    'no-framework': {
      framework: NoFrameworkComponent
    },
    'material-design': {
      framework: MaterialDesignFrameworkComponent,
      widgets: {
        'root':            FlexLayoutRootComponent,
        'section':         FlexLayoutSectionComponent,
        '$ref':            MaterialAddReferenceComponent,
        'button':          MaterialButtonComponent,
        'button-group':    MaterialButtonGroupComponent,
        'checkbox':        MaterialCheckboxComponent,
        'checkboxes':      MaterialCheckboxesComponent,
        'chip-list':       MaterialChipListComponent,
        'date':            MaterialDatepickerComponent,
        'file':            MaterialFileComponent,
        'number':          MaterialNumberComponent,
        'one-of':          MaterialOneOfComponent,
        'radios':          MaterialRadiosComponent,
        'select':          MaterialSelectComponent,
        'slider':          MaterialSliderComponent,
        'stepper':         MaterialStepperComponent,
        'tabs':            MaterialTabsComponent,
        'text':            MaterialInputComponent,
        'textarea':        MaterialTextareaComponent,
        'alt-date':        'date',
        'any-of':          'one-of',
        'card':            'section',
        'color':           'text',
        'expansion-panel': 'section',
        'hidden':          'none',
        'image':           'none',
        'integer':         'number',
        'radiobuttons':    'button-group',
        'range':           'slider',
        'submit':          'button',
        'tagsinput':       'chip-list',
        'wizard':          'stepper',
      },
      stylesheets: [
        '//fonts.googleapis.com/icon?family=Material+Icons',
        '//fonts.googleapis.com/css?family=Roboto:300,400,500,700',
      ],
    },
    'bootstrap-3': {
      framework: Bootstrap3FrameworkComponent,
      stylesheets: [
        '//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap.min.css',
        '//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/css/bootstrap-theme.min.css',
      ],
      scripts: [
        '//ajax.googleapis.com/ajax/libs/jquery/2.2.4/jquery.min.js',
        '//ajax.googleapis.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js',
        '//maxcdn.bootstrapcdn.com/bootstrap/3.3.7/js/bootstrap.min.js',
      ],
    },
    'bootstrap-4': {
      framework: Bootstrap4FrameworkComponent,
      stylesheets: [
        '//maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/css/bootstrap.min.css'
      ],
      scripts: [
        '//code.jquery.com/jquery-3.2.1.slim.min.js',
        '//cdnjs.cloudflare.com/ajax/libs/popper.js/1.12.3/umd/popper.min.js',
        '//maxcdn.bootstrapcdn.com/bootstrap/4.0.0-beta.2/js/bootstrap.min.js',
      ],
    }
  };

  constructor(
    @Inject(WidgetLibraryService) private widgetLibrary: WidgetLibraryService
  ) { }

  public setLoadExternalAssets(loadExternalAssets = true): void {
    this.loadExternalAssets = !!loadExternalAssets;
  }

  public setFramework(
    framework?: string|Framework, loadExternalAssets = this.loadExternalAssets
  ): boolean {
    if (!framework) { return false; }
    let registerNewWidgets = false;
    if (!framework || framework === 'default') {
      this.activeFramework = this.frameworkLibrary[this.defaultFramework];
      registerNewWidgets = true;
    } else if (typeof framework === 'string' && this.hasFramework(framework)) {
      this.activeFramework = this.frameworkLibrary[framework];
      registerNewWidgets = true;
    } else if (typeof framework === 'object' && hasOwn(framework, 'framework')) {
      this.activeFramework = framework;
      registerNewWidgets = true;
    }
    return registerNewWidgets ?
      this.registerFrameworkWidgets(this.activeFramework) :
      registerNewWidgets;
  }

  registerFrameworkWidgets(framework: Framework): boolean {
    return hasOwn(framework, 'widgets') ?
      this.widgetLibrary.registerFrameworkWidgets(framework.widgets) :
      this.widgetLibrary.unRegisterFrameworkWidgets();
  }

  public hasFramework(type: string): boolean {
    return hasOwn(this.frameworkLibrary, type);
  }

  public getFramework(): any {
    if (!this.activeFramework) { this.setFramework('default', true); }
    return this.activeFramework.framework;
  }

  public getFrameworkWidgets(): any {
    return this.activeFramework.widgets || {};
  }

  public getFrameworkStylesheets(load: boolean = this.loadExternalAssets): string[] {
    return (load && this.activeFramework.stylesheets) || [];
  }

  public getFrameworkScripts(load: boolean = this.loadExternalAssets): string[] {
    return (load && this.activeFramework.scripts) || [];
  }
}
