import { NgModule, ApplicationRef, Injector, LOCALE_ID } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { HttpModule } from '@angular/http';
import { FormsModule } from '@angular/forms';
import { TranslateModule, TranslateService } from 'ng2-translate';
import { MdlModule, DISABLE_NATIVE_VALIDITY_CHECKING, MdlDialogService } from 'angular2-mdl';
import { MdlPopoverModule } from '@angular2-mdl-ext/popover';
import { MdlSelectModule } from '@angular2-mdl-ext/select';
import { removeNgStyles, createNewHosts } from '@angularclass/hmr';

import { AppComponent } from './app.component';
import { LoginComponent } from './auth/login.component';
import { ServiceLocator } from './shared/services';
import { routing } from './app.routing';
import { SecurityGroupModule } from './security-group/sg.module';
import { ServiceOfferingModule } from './service-offering/service-offering.module';
import { SharedModule } from './shared/shared.module';
import { TemplateModule } from './template';
import { VmModule } from './vm';
import { CustomDialogService } from './shared/services/custom-dialog.service';
import { EventsModule } from './events/events.module';
import { SpareDriveModule } from './spare-drive/spare-drive.module';
import { SettingsModule } from './settings/settings.module';
import { SshKeysModule } from './ssh-keys/ssh-keys.module';
import { LogoutComponent } from './auth/logout.component';


@NgModule({
  imports: [
    BrowserModule,
    HttpModule,
    FormsModule,
    TranslateModule.forRoot(),
    routing,
    EventsModule,
    MdlModule,
    MdlPopoverModule,
    MdlSelectModule,
    SecurityGroupModule,
    ServiceOfferingModule,
    SettingsModule,
    SpareDriveModule,
    SshKeysModule,
    TemplateModule,
    VmModule,
    SharedModule
  ],
  declarations: [
    AppComponent,
    LoginComponent,
    LogoutComponent
  ],
  providers: [
    { provide: DISABLE_NATIVE_VALIDITY_CHECKING, useValue: true },
    { provide: MdlDialogService, useClass: CustomDialogService },
    {
      provide: LOCALE_ID,
      deps: [TranslateService],
      useFactory: (translateService) => translateService.currentLang
    }
  ],
  bootstrap: [AppComponent]
})
export class AppModule {
  constructor(public appRef: ApplicationRef, private injector: Injector) {
    ServiceLocator.injector = this.injector;
  }

  public hmrOnInit(store): void {
    // tslint:disable-next-line
    console.log('HMR store', store);
  }

  public hmrOnDestroy(store): void {
    let cmpLocation = this.appRef.components.map(cmp => cmp.location.nativeElement);
    // recreate elements
    store.disposeOldHosts = createNewHosts(cmpLocation);
    // remove styles
    removeNgStyles();
  }

  public hmrAfterDestroy(store): void {
    // display new elements
    store.disposeOldHosts();
    delete store.disposeOldHosts;
  }
}
