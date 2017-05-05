import { ChangeDetectorRef, Component, Input, OnInit } from '@angular/core';
import { VirtualMachine } from '../../../../shared/vm.model';
import { Volume } from '../../../../../shared/models';
import { VolumeService } from '../../../../../shared/services/volume.service';
import { DialogService } from '../../../../../shared/services';
import {
  SpareDriveAttachmentDialogComponent
} from '../spare-drive-attchment-dialog/spare-drive-attachment-dialog.component';
import { SpareDriveActionsService } from '../../../../../spare-drive/spare-drive-actions.service';


@Component({
  selector: 'cs-spare-drive-attachment-detail',
  templateUrl: 'spare-drive-attachment-detail.component.html',
  styleUrls: ['spare-drive-attachment-detail.component.scss']
})
export class SpareDriveAttachmentDetailComponent implements OnInit {
  @Input() public virtualMachine: VirtualMachine;

  public loading: boolean;
  public selectedVolume: Volume;
  public volumes: Array<Volume>;

  constructor(
    private changeDetector: ChangeDetectorRef,
    private dialogService: DialogService,
    private spareDriveActionsService: SpareDriveActionsService,
    private volumeService: VolumeService
  ) {}

  public ngOnInit(): void {
    if (!this.virtualMachine) {
      throw new Error('the virtualMachine property is missing in cs-spare-drive-attachment-detail');
    }

    this.loading = true;
    this.volumeService
      .getSpareList({ zoneId: this.virtualMachine.zoneId })
      .subscribe(volumes => {
        this.volumes = volumes;
        this.loading = false;
      });
  }

  public showDialog(): void {
    this.dialogService.showCustomDialog({
      component: SpareDriveAttachmentDialogComponent,
      providers: [{ provide: 'volumes', useValue: this.volumes }],
      classes: 'spare-drive-attachment-dialog'
    })
      .switchMap(res => res.onHide())
      .onErrorResumeNext()
      .subscribe((volume: Volume) => {
        this.selectedVolume = volume;
        this.changeDetector.detectChanges();
      });
  }

  public attachIso(): void {
    this.spareDriveActionsService.attach({
      id: this.selectedVolume.id,
      virtualMachineId: this.virtualMachine.id
    });
  }
}
