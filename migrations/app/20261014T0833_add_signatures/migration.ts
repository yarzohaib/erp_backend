#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/37349bb780f032980b848d5a59f05159f9e6a760eef7392241670ee5df9161d0/contract';
import startContract from '../../snapshots/37349bb780f032980b848d5a59f05159f9e6a760eef7392241670ee5df9161d0/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/e89a6442bb3cee2ba54d5fb665bbdabbd55a509309388c65b3271019c2878544/contract';
import endContract from '../../snapshots/e89a6442bb3cee2ba54d5fb665bbdabbd55a509309388c65b3271019c2878544/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'Signature',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('data', 'json', { notNull: true, codecRef: { codecId: 'pg/json@1' } }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('name', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('templateId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('templateVersion', 'int4', {
            notNull: true,
            default: lit(1),
            codecRef: { codecId: 'pg/int4@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Signature',
        index: 'Signature_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'Signature',
        index: 'Signature_userId_updatedAt_idx_42f5280d',
        columns: ['userId', 'updatedAt'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'Signature',
        foreignKey: {
          name: 'Signature_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
