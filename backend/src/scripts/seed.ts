/**
 * Setup / data loading from the command line.
 *
 *   npm run seed                               -> admin user + stores (data/stores.xlsx) + models (data/models.txt)
 *   npm run seed -- --stores path/to/stores.xlsx
 *   npm run seed -- --imeis path/to/imei-list.xlsx
 *   npm run seed -- --reset-admin              -> sets the admin password again from .env
 */
import 'dotenv/config';
import 'reflect-metadata';
import * as bcrypt from 'bcryptjs';
import { existsSync, readFileSync } from 'fs';
import { basename, resolve } from 'path';
import { DataSource } from 'typeorm';
import { importImeis, importStores } from '../common/importers';
import { readSpreadsheet } from '../common/spreadsheet';
import { databaseOptions } from '../database';
import { Admin, MobileModel } from '../entities';

function arg(name: string): string | undefined {
  const i = process.argv.indexOf(`--${name}`);
  return i >= 0 ? process.argv[i + 1] : undefined;
}

async function main() {
  const ds = new DataSource({ ...databaseOptions(process.env), synchronize: true });
  await ds.initialize();
  const onlyImeis = !!arg('imeis');

  // Admin user
  const username = process.env.ADMIN_USERNAME ?? 'admin';
  const password = process.env.ADMIN_PASSWORD;
  const admins = ds.getRepository(Admin);
  const existing = await admins.findOne({ where: { username } });
  if (!existing || process.argv.includes('--reset-admin')) {
    if (!password || password.length < 8) {
      throw new Error('Set ADMIN_PASSWORD (min 8 characters) in .env before seeding');
    }
    const passwordHash = await bcrypt.hash(password, 10);
    if (existing) await admins.update(existing.id, { passwordHash });
    else await admins.save(admins.create({ username, passwordHash }));
    console.log(`Admin user "${username}" ${existing ? 'password reset' : 'created'}`);
  }

  // Stores
  const storesPath = resolve(arg('stores') ?? 'data/stores.xlsx');
  if (!onlyImeis && existsSync(storesPath)) {
    const rows = await readSpreadsheet(readFileSync(storesPath), storesPath);
    const res = await importStores(ds, rows);
    console.log(`Stores: ${res.imported} imported, ${res.invalidRows} invalid rows skipped`);
  }

  // Mobile models (only added if missing; manage the list later from the admin panel)
  const modelsPath = resolve('data/models.txt');
  if (!onlyImeis && existsSync(modelsPath)) {
    const repo = ds.getRepository(MobileModel);
    const names = readFileSync(modelsPath, 'utf8')
      .split(/\r?\n/)
      .map((s) => s.trim())
      .filter(Boolean);
    let added = 0;
    for (const [i, name] of names.entries()) {
      if (!(await repo.exists({ where: { name } }))) {
        await repo.save(repo.create({ name, sortOrder: i + 1 }));
        added++;
      }
    }
    console.log(`Mobile models: ${added} added`);
  }

  // IMEIs
  const imeiPath = arg('imeis');
  if (imeiPath) {
    const full = resolve(imeiPath);
    const rows = await readSpreadsheet(readFileSync(full), full);
    const res = await importImeis(ds, rows, basename(full), 'cli');
    console.log(
      `IMEIs: ${res.totalFound} found, ${res.added} added, ${res.alreadyPresent} already present, ${res.invalidRows} invalid`,
    );
  }

  await ds.destroy();
}

main().catch((err: unknown) => {
  console.error(err instanceof Error ? err.message : err);
  process.exit(1);
});
