#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/6a3e7a98508a9a7c29c05b1001a6e973a39426dacf3e7680d996506560f6c6ef/contract';
import startContract from '../../snapshots/6a3e7a98508a9a7c29c05b1001a6e973a39426dacf3e7680d996506560f6c6ef/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/72c39a12e3adbb0cb1366e1176624365df6d01ea342d18227c952a2b4b9229df/contract';
import endContract from '../../snapshots/72c39a12e3adbb0cb1366e1176624365df6d01ea342d18227c952a2b4b9229df/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('avatarUrl', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
