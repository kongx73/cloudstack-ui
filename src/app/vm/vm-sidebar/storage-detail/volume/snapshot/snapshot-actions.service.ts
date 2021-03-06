import { Injectable } from '@angular/core';
import { DialogService } from '../../../../../dialog/dialog-module/dialog.service';

import { JobsNotificationService, NotificationService } from '../../../../../shared/services';
import { TemplateCreationComponent } from '../../../../../template/template-creation/template-creation.component';
import { Snapshot, Volume } from '../../../../../shared/models';
import { StatsUpdateService } from '../../../../../shared/services/stats-update.service';
import { SnapshotService } from '../../../../../shared/services/snapshot.service';


export interface SnapshotAction {
  name: string;
  icon: string;
  activate(snapshot: Snapshot, volume?: Volume): void;
}

@Injectable()
export class SnapshotActionsService {
  public Actions: Array<SnapshotAction> = [
    {
      name: 'CREATE_TEMPLATE_BUTTON',
      icon: 'add',
      activate: (snapshot) => this.showCreationDialog(snapshot)
    },
    {
      name: 'DELETE',
      icon: 'delete',
      activate: (snapshot, volume) => this.handleSnapshotDelete(snapshot, volume)
    },
  ];

  constructor(
    private dialogService: DialogService,
    private jobNotificationService: JobsNotificationService,
    private notificationService: NotificationService,
    private snapshotService: SnapshotService,
    private statsUpdateService: StatsUpdateService
  ) { }

  public showCreationDialog(snapshot: Snapshot): void {
    this.dialogService.showCustomDialog({
      component: TemplateCreationComponent,
      classes: 'template-creation-dialog-snapshot dialog-overflow-visible',
      providers: [
        { provide: 'mode', useValue: 'Template' },
        { provide: 'snapshot', useValue: snapshot }
      ]
    });
  }

  public handleSnapshotDelete(snapshot: Snapshot, volume): void {
    let notificationId: string;

    this.dialogService.confirm('CONFIRM_SNAPSHOT_DELETE', 'NO', 'YES')
      .switchMap(() => {
        snapshot['loading'] = true;
        notificationId = this.jobNotificationService.add('SNAPSHOT_DELETE_IN_PROGRESS');
        return this.snapshotService.remove(snapshot.id);
      })
      .finally(() => snapshot['loading'] = false)
      .subscribe(
        () => {
          this.statsUpdateService.next();
          volume.snapshots = volume.snapshots.filter(_ => _.id !== snapshot.id);
          this.jobNotificationService.finish({
            id: notificationId,
            message: 'SNAPSHOT_DELETE_DONE'
          });
        },
        error => {
          if (!error) {
            return;
          }

          this.notificationService.error(error);
          this.jobNotificationService.fail({
            id: notificationId,
            message: 'SNAPSHOT_DELETE_FAILED'
          });
        }
      );
  }
}
