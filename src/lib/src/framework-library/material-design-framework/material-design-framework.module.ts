import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { FlexLayoutModule } from '@angular/flex-layout';
import {
  MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule,
  MatCheckboxModule, MatChipsModule, MatDatepickerModule, MatExpansionModule,
  MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule,
  MatRadioModule, MatSelectModule, MatSliderModule, MatSlideToggleModule,
  MatStepperModule, MatTabsModule, MatTooltipModule,
} from '@angular/material';
export const ANGULAR_MATERIAL_MODULES = [
  MatAutocompleteModule, MatButtonModule, MatButtonToggleModule, MatCardModule,
  MatCheckboxModule, MatChipsModule, MatDatepickerModule, MatExpansionModule,
  MatFormFieldModule, MatIconModule, MatInputModule, MatNativeDateModule,
  MatRadioModule, MatSelectModule, MatSliderModule, MatSlideToggleModule,
  MatStepperModule, MatTabsModule, MatTooltipModule,
];
/**
 * unused @angular/material modules:
 * MatDialogModule, MatGridListModule, MatListModule, MatMenuModule,
 * MatPaginatorModule, MatProgressBarModule, MatProgressSpinnerModule,
 * MatSidenavModule, MatSnackBarModule, MatSortModule, MatTableModule,
 * MatToolbarModule,
 */

import { WidgetLibraryModule } from '../../widget-library/widget-library.module';
import { JsonSchemaFormService } from '../../json-schema-form.service';

import { MATERIAL_FRAMEWORK_COMPONENTS } from './index';

@NgModule({
  imports: [
    CommonModule, FormsModule, ReactiveFormsModule, FlexLayoutModule,
    ...ANGULAR_MATERIAL_MODULES, WidgetLibraryModule
  ],
  declarations:    [ ...MATERIAL_FRAMEWORK_COMPONENTS ],
  exports:         [ ...MATERIAL_FRAMEWORK_COMPONENTS ],
  entryComponents: [ ...MATERIAL_FRAMEWORK_COMPONENTS ],
  providers:       [ JsonSchemaFormService ]
})
export class MaterialDesignFrameworkModule { }
