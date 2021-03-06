import { Component, Input, OnChanges, OnInit } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { SgRulesComponent } from '../../security-group/sg-rules/sg-rules.component';
import { SecurityGroup } from '../../security-group/sg.model';
import {
  ServiceOfferingDialogComponent
} from '../../service-offering/service-offering-dialog/service-offering-dialog.component';
import { Color, ServiceOfferingFields, ServiceOffering } from '../../shared/models';
import { ConfigService } from '../../shared/services';
import { ZoneService } from '../../shared/services/zone.service';
import { VirtualMachine, VmActions, VmStates } from '../shared/vm.model';
import { VmService } from '../shared/vm.service';
import { ServiceOfferingService } from '../../shared/services/service-offering.service';
import { DialogService } from '../../dialog/dialog-module/dialog.service';
import { AffinityGroupDialogComponent } from './affinity-group-dialog.component';
import { AffinityGroup } from '../../shared/models/affinity-group.model';
import { SshKeypairResetComponent } from './ssh/ssh-keypair-reset.component';


@Component({
  selector: 'cs-vm-detail',
  templateUrl: 'vm-detail.component.html',
  styleUrls: ['vm-detail.component.scss']
})
export class VmDetailComponent implements OnChanges, OnInit {
  @Input() public vm: VirtualMachine;
  public color: Color;
  public colorList: Array<Color>;
  public description: string;
  public disableSecurityGroup = false;
  public expandNIC: boolean;
  public expandServiceOffering: boolean;

  constructor(
    private dialogService: DialogService,
    private serviceOfferingService: ServiceOfferingService,
    private vmService: VmService,
    private zoneService: ZoneService,
    private configService: ConfigService
  ) {
    this.expandNIC = false;
    this.expandServiceOffering = false;
  }

  public ngOnInit(): void {
    Observable.forkJoin(
      this.configService.get('themeColors'),
      this.configService.get('vmColors')
    ).subscribe(
      ([themeColors, vmColors]) => this.colorList = themeColors.concat(vmColors)
    );
  }

  public ngOnChanges(): void {
    this.update();
  }

  public changeColor(color: Color): void {
    this.vmService.setColor(this.vm, color)
      .subscribe(vm => {
        this.vm = vm;
        this.vmService.updateVmInfo(this.vm);
      });
  }

  public changeServiceOffering(): void {
    this.dialogService.showCustomDialog({
      component: ServiceOfferingDialogComponent,
      classes: 'service-offering-dialog',
      providers: [{ provide: 'virtualMachine', useValue: this.vm }],
    }).switchMap(res => res.onHide())
      .subscribe((newOffering: ServiceOffering) => {
        if (newOffering) {
          this.serviceOfferingService.get(newOffering.id).subscribe(offering => {
            this.vm.serviceOffering = offering;
          });
        }
      });
  }

  public changeDescription(newDescription: string): void {
    this.vmService
      .updateDescription(this.vm, newDescription)
      .onErrorResumeNext()
      .subscribe();
  }

  public changeAffinityGroup(): void {
    this.askToStopVM(
      'STOP_MACHINE_FOR_AG',
      () => this.showAffinityGroupDialog()
    );
  }

  public isNotFormattedField(key: string): boolean {
    return [
      ServiceOfferingFields.id,
      ServiceOfferingFields.created,
      ServiceOfferingFields.diskBytesReadRate,
      ServiceOfferingFields.diskBytesWriteRate,
      ServiceOfferingFields.storageType,
      ServiceOfferingFields.provisioningType
    ].indexOf(key) === -1;
  }

  public isTranslatedField(key: string): boolean {
    return [
      ServiceOfferingFields.storageType,
      ServiceOfferingFields.provisioningType
    ].indexOf(key) > -1;
  }

  public isDateField(key: string): boolean {
    return key === ServiceOfferingFields.created;
  }

  public isDiskStatsField(key: string): boolean {
    return [
      ServiceOfferingFields.diskBytesReadRate,
      ServiceOfferingFields.diskBytesWriteRate
    ].indexOf(key) > -1;
  }

  public toggleNIC(): void {
    this.expandNIC = !this.expandNIC;
  }

  public toggleServiceOffering(): void {
    this.expandServiceOffering = !this.expandServiceOffering;
  }

  public showRulesDialog(securityGroup: SecurityGroup): void {
    this.dialogService.showCustomDialog({
      component: SgRulesComponent,
      providers: [{ provide: 'securityGroup', useValue: securityGroup }],
      styles: { 'width': '880px' },
    });
  }

  public confirmAddSecondaryIp(vm: VirtualMachine): void {
    this.dialogService.confirm('ARE_YOU_SURE_ADD_SECONDARY_IP', 'NO', 'YES')
      .onErrorResumeNext()
      .subscribe(() => this.addSecondaryIp(vm));
  }

  public confirmRemoveSecondaryIp(secondaryIpId: string, vm: VirtualMachine): void {
    this.dialogService.confirm('ARE_YOU_SURE_REMOVE_SECONDARY_IP', 'NO', 'YES')
      .onErrorResumeNext()
      .subscribe(() => this.removeSecondaryIp(secondaryIpId, vm));
  }

  public resetSshKey(): void {
    this.askToStopVM(
      'STOP_MACHINE_FOR_SSH',
      () => this.showSshKeypairResetDialog()
    );
  }

  private update(): void {
    this.updateColor();
    this.updateDescription();

    this.checkSecurityGroupDisabled();
  }

  private addSecondaryIp(vm: VirtualMachine): void {
    this.vmService.addIpToNic(vm.nic[0].id)
      .subscribe(
        res => {
          const ip = res.result.nicsecondaryip;
          vm.nic[0].secondaryIp.push(ip);
        },
        err => this.dialogService.alert(err.errortext)
      );
  }

  private removeSecondaryIp(secondaryIpId: string, vm: VirtualMachine): void {
    this.vmService.removeIpFromNic(secondaryIpId)
      .subscribe(
        () => {
          vm.nic[0].secondaryIp = vm.nic[0].secondaryIp.filter(ip => ip.id !== secondaryIpId);
        },
        err => this.dialogService.alert(err.errortext)
      );
  }

  private updateColor(): void {
    this.color = this.vm.getColor();
  }

  private updateDescription(): void {
    this.vmService.getDescription(this.vm)
      .subscribe(description => {
        this.description = description;
      });
  }

  private askToStopVM(message: string, onStopped): void {
    if (this.vm.state === VmStates.Stopped) {
      onStopped();
      return;
    }

    this.dialogService.customConfirm({
      message: message,
      confirmText: 'STOP',
      declineText: 'CANCEL',
      width: '350px',
      clickOutsideToClose: false
    })
      .onErrorResumeNext()
      .subscribe((result) => {
        if (result === null) {
          this.vmService.command({
            action: VirtualMachine.getAction(VmActions.STOP),
            vm: this.vm
          })
            .subscribe(onStopped);
        }
      });
  }

  private showAffinityGroupDialog(): void {
    this.dialogService.showCustomDialog({
      component: AffinityGroupDialogComponent,
      styles: { width: '350px' },
      providers: [{ provide: 'virtualMachine', useValue: this.vm }],
      clickOutsideToClose: false
    }).switchMap(dialog => dialog.onHide())
      .subscribe((group?: Array<AffinityGroup>) => {
        if (group) {
          this.vm.affinityGroup = group;
        }
      });
  }

  private showSshKeypairResetDialog(): void {
    this.dialogService.showCustomDialog({
      component: SshKeypairResetComponent,
      styles: { width: '350px' },
      providers: [{ provide: 'virtualMachine', useValue: this.vm }],
      clickOutsideToClose: false
    }).switchMap(dialog => dialog.onHide())
      .subscribe((keyPairName: string) => {
        if (keyPairName) {
          this.vm.keyPair = keyPairName;
        }
      });
  }

  private checkSecurityGroupDisabled(): void {
    this.zoneService.get(this.vm.zoneId)
      .subscribe(zone => this.disableSecurityGroup = zone.networkTypeIsBasic);
  }
}
