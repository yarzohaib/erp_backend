#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/5b738e1983d1786ab733f10d28e0d3d83dcdc2ca5bb88a767ea62871b77c7562/contract';
import startContract from '../../snapshots/5b738e1983d1786ab733f10d28e0d3d83dcdc2ca5bb88a767ea62871b77c7562/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/6a3e7a98508a9a7c29c05b1001a6e973a39426dacf3e7680d996506560f6c6ef/contract';
import endContract from '../../snapshots/6a3e7a98508a9a7c29c05b1001a6e973a39426dacf3e7680d996506560f6c6ef/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, lit, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'UserSettings',
        columns: [
          col('brandColor', 'text', {
            notNull: true,
            default: lit('#245FD4'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('defaultExportFormat', 'text', {
            notNull: true,
            default: lit('html'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('defaultTemplateId', 'text', { codecRef: { codecId: 'pg/text@1' } }),
          col('includePhoto', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('notifyProductUpdates', 'bool', {
            notNull: true,
            default: lit(true),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('notifyTips', 'bool', {
            notNull: true,
            default: lit(false),
            codecRef: { codecId: 'pg/bool@1' },
          }),
          col('premiumWaitlistAt', 'timestamptz', {
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('signatureFont', 'text', {
            notNull: true,
            default: lit('Arimo'),
            codecRef: { codecId: 'pg/text@1' },
          }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['userId'])],
      }),
      this.addColumn({
        schema: 'public',
        table: 'User',
        column: col('companyName', 'text', { codecRef: { codecId: 'pg/text@1' } }),
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'UserSettings',
        foreignKey: {
          name: 'UserSettings_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
