#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/284703afb3bab3cbc6841e6320766bf7ad9e89f195921b73dfb9daceba61bfc0/contract';
import startContract from '../../snapshots/284703afb3bab3cbc6841e6320766bf7ad9e89f195921b73dfb9daceba61bfc0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/5b738e1983d1786ab733f10d28e0d3d83dcdc2ca5bb88a767ea62871b77c7562/contract';
import endContract from '../../snapshots/5b738e1983d1786ab733f10d28e0d3d83dcdc2ca5bb88a767ea62871b77c7562/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.addColumn({
        schema: 'public',
        table: 'TeamMember',
        column: col('socials', 'json', { codecRef: { codecId: 'pg/json@1' } }),
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
