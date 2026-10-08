#!/usr/bin/env -S node
import type { Contract as End } from '../../snapshots/20ccc439fb0c17bdcb571c6f04bad3be7305f38c7cc1e294c370344f970c14d4/contract';
import endContract from '../../snapshots/20ccc439fb0c17bdcb571c6f04bad3be7305f38c7cc1e294c370344f970c14d4/contract.json' with { type: 'json' };
import type { Contract as Start } from '../../snapshots/c5eee25581e6df26ad3b92fb428fd2361395115c0e56e42756e43af46f0cf1c3/contract';
import startContract from '../../snapshots/c5eee25581e6df26ad3b92fb428fd2361395115c0e56e42756e43af46f0cf1c3/contract.json' with { type: 'json' };
import { Migration, MigrationCLI } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.setDefault({
        schema: 'public',
        table: 'User',
        column: 'updatedAt',
        defaultSql: 'DEFAULT (now())',
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
