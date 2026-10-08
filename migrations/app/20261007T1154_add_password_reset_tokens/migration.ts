#!/usr/bin/env -S node
import type { Contract as Start } from '../../snapshots/84f5c2496fcdbe1358255a0da35c5b3d779c0e77b51b6eb07206ce448edd8297/contract';
import startContract from '../../snapshots/84f5c2496fcdbe1358255a0da35c5b3d779c0e77b51b6eb07206ce448edd8297/contract.json' with { type: 'json' };
import type { Contract as End } from '../../snapshots/aec271506649d84f0c26bf30390033bc690d60bfdc059ebe537e893359b1e092/contract';
import endContract from '../../snapshots/aec271506649d84f0c26bf30390033bc690d60bfdc059ebe537e893359b1e092/contract.json' with { type: 'json' };
import { Migration, MigrationCLI, col, fn, primaryKey } from '@prisma/orm-postgres/migration';

export default class M extends Migration<Start, End> {
  override readonly startContractJson = startContract;
  override readonly endContractJson = endContract;

  override get operations() {
    return [
      this.createTable({
        schema: 'public',
        table: 'PasswordResetToken',
        columns: [
          col('createdAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('expiresAt', 'timestamptz', {
            notNull: true,
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('id', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('tokenHash', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
          col('updatedAt', 'timestamptz', {
            notNull: true,
            default: fn('now()'),
            codecRef: { codecId: 'pg/timestamptz-temporal@1' },
          }),
          col('usedAt', 'timestamptz', { codecRef: { codecId: 'pg/timestamptz-temporal@1' } }),
          col('userId', 'text', { notNull: true, codecRef: { codecId: 'pg/text@1' } }),
        ],
        constraints: [primaryKey(['id'])],
      }),
      this.addUnique({
        schema: 'public',
        table: 'PasswordResetToken',
        constraint: 'PasswordResetToken_tokenHash_key',
        columns: ['tokenHash'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PasswordResetToken',
        index: 'PasswordResetToken_expiresAt_idx_6b6b8c10',
        columns: ['expiresAt'],
      }),
      this.createIndex({
        schema: 'public',
        table: 'PasswordResetToken',
        index: 'PasswordResetToken_userId_idx_a489d58a',
        columns: ['userId'],
      }),
      this.addForeignKey({
        schema: 'public',
        table: 'PasswordResetToken',
        foreignKey: {
          name: 'PasswordResetToken_userId_fkey',
          columns: ['userId'],
          references: { schema: 'public', table: 'User', columns: ['id'] },
          onDelete: 'cascade',
        },
      }),
    ];
  }
}

MigrationCLI.run(import.meta.url, M);
