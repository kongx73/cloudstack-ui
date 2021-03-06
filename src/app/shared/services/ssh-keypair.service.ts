import { Injectable } from '@angular/core';
import { Observable } from 'rxjs/Observable';

import { SSHKeyPair } from '../models';
import { BackendResource } from '../decorators';
import { BaseBackendCachedService } from './base-backend-cached.service';
import { VirtualMachine } from '../../vm/shared/vm.model';
import { AsyncJobService } from './async-job.service';


export interface SshKeyCreationData {
  name: string;
  publicKey?: string;
}

@Injectable()
@BackendResource({
  entity: 'SSHKeyPair',
  entityModel: SSHKeyPair
})
export class SSHKeyPairService extends BaseBackendCachedService<SSHKeyPair> {
  constructor(private asyncJobService: AsyncJobService) {
    super();
  }

  public create(params: SshKeyCreationData): Observable<SSHKeyPair> {
    this.invalidateCache();
    return this.sendCommand('create', params)
      .map(response => this.prepareModel(response['keypair']));
  }

  public register(params: SshKeyCreationData): Observable<SSHKeyPair> {
    this.invalidateCache();
    return this.sendCommand('register', params)
      .map(response => this.prepareModel(response['keypair']));
  }

  public reset(params): Observable<VirtualMachine> {
    return this.sendCommand('reset;ForVirtualMachine', params, 'SSHKey')
      .switchMap(job =>
        this.asyncJobService.queryJob(job.jobid, 'VirtualMachine', VirtualMachine)
      );
  }
}
