import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';

import { WidgetLibraryModule } from '../../widget-library/widget-library.module';

import { WidgetLibraryService } from '../../widget-library/widget-library.service';
import { FrameworkLibraryService } from '../framework-library.service';

import { Bootstrap4FrameworkComponent } from './bootstrap-4-framework.component';

@NgModule({
  imports:         [ CommonModule, WidgetLibraryModule ],
  declarations:    [ Bootstrap4FrameworkComponent ],
  exports:         [ Bootstrap4FrameworkComponent ],
  entryComponents: [ Bootstrap4FrameworkComponent ],
  providers:       [ WidgetLibraryService, FrameworkLibraryService ]
})
export class Bootstrap4FrameworkModule { }
