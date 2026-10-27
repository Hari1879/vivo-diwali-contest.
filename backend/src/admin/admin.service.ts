import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectDataSource, InjectRepository } from '@nestjs/typeorm';
import * as bcrypt from 'bcryptjs';
import ExcelJS from 'exceljs';
import type { Response } from 'express';
import { Brackets, DataSource, Repository, SelectQueryBuilder } from 'typeorm';
import { Admin, EligibleImei, Entry, ImeiUpload, MobileModel, Store } from '../entities';
import { importImeis, importStores } from '../common/importers';
import { formatIst, istEndOfDayExclusive, istStartOfDay, istToday } from '../common/ist';
import { csvEscape, readSpreadsheet } from '../common/spreadsheet';
import { EntryQueryDto, ExportQueryDto } from './admin.dto';

const EXPORT_COLUMNS: { header: string; key: keyof Entry | 'createdAtIst' | 'playedAtIst'; width: number }[] = [
  { header: 'Registered At (IST)', key: 'createdAtIst', width: 20 },
  { header: 'Name', key: 'name', width: 24 },
  { header: 'Contact Number', key: 'contactNumber', width: 15 },
  { header: 'Branch', key: 'branch', width: 16 },
  { header: 'Shop Code', key: 'shopCode', width: 14 },
  { header: 'Shop Name', key: 'shopName', width: 40 },
  { header: 'Mobile Number', key: 'mobileNumber', width: 15 },
  { header: 'IMEI Number', key: 'imei', width: 18 },
  { header: 'Mobile Model', key: 'mobileModel', width: 18 },
  { header: 'Mobile Price', key: 'mobilePrice', width: 12 },
  { header: 'Status', key: 'status', width: 10 },
  { header: 'Review Reason', key: 'reviewReason', width: 26 },
  { header: 'Game Played', key: 'played', width: 12 },
  { header: 'Played At (IST)', key: 'playedAtIst', width: 20 },
  { header: 'Entry ID', key: 'id', width: 38 },
];

@Injectable()
export class AdminService {
  constructor(
    @InjectDataSource() private ds: DataSource,
    @InjectRepository(Admin) private admins: Repository<Admin>,
    @InjectRepository(Entry) private entries: Repository<Entry>,
    @InjectRepository(EligibleImei) private imeis: Repository<EligibleImei>,
    @InjectRepository(ImeiUpload) private uploads: Repository<ImeiUpload>,
    @InjectRepository(Store) private stores: Repository<Store>,
    @InjectRepository(MobileModel) private models: Repository<MobileModel>,
    private jwt: JwtService,
  ) {}

  async login(username: string, password: string) {
    const admin = await this.admins
      .createQueryBuilder('a')
      .addSelect('a.passwordHash')
      .where('LOWER(a.username) = LOWER(:u)', { u: username.trim() })
      .getOne();
    if (!admin || !(await bcrypt.compare(password, admin.passwordHash))) {
      throw new UnauthorizedException('Invalid username or password');
    }
    const token = await this.jwt.signAsync({ sub: admin.id, username: admin.username });
    return { token, username: admin.username };
  }

  async stats() {
    const today = istToday();
    const counts = await this.entries
      .createQueryBuilder('e')
      .select('COUNT(*)::int', 'total')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = 'valid')::int`, 'valid')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = 'review')::int`, 'review')
      .addSelect(`COUNT(*) FILTER (WHERE e.status = 'rejected')::int`, 'rejected')
      .addSelect(`COUNT(*) FILTER (WHERE e.played)::int`, 'played')
      .addSelect(`COUNT(*) FILTER (WHERE e.createdAt >= :start)::int`, 'today')
      .setParameter('start', istStartOfDay(today))
      .getRawOne<Record<string, number>>();

    const byBranch = await this.entries
      .createQueryBuilder('e')
      .select('e.branch', 'branch')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('e.branch')
      .orderBy('count', 'DESC')
      .getRawMany<{ branch: string; count: number }>();

    const daily = await this.entries
      .createQueryBuilder('e')
      .select(`TO_CHAR(e.createdAt AT TIME ZONE 'Asia/Kolkata', 'YYYY-MM-DD')`, 'day')
      .addSelect('COUNT(*)::int', 'count')
      .groupBy('day')
      .orderBy('day', 'ASC')
      .getRawMany<{ day: string; count: number }>();

    return {
      ...counts,
      eligibleImeis: await this.imeis.count(),
      stores: await this.stores.count({ where: { active: true } }),
      byBranch,
      daily,
    };
  }

  private filtered(q: EntryQueryDto): SelectQueryBuilder<Entry> {
    const qb = this.entries.createQueryBuilder('e');
    if (q.branch) qb.andWhere('e.branch = :branch', { branch: q.branch });
    if (q.status) qb.andWhere('e.status = :status', { status: q.status });
    if (q.from) qb.andWhere('e.createdAt >= :from', { from: istStartOfDay(q.from) });
    if (q.to) qb.andWhere('e.createdAt < :to', { to: istEndOfDayExclusive(q.to) });
    if (q.search) {
      const s = `%${q.search.replace(/[%_\\]/g, (c) => `\\${c}`)}%`;
      qb.andWhere(
        new Brackets((w) => {
          w.where('e.name ILIKE :s', { s })
            .orWhere('e.imei LIKE :s', { s })
            .orWhere('e.contactNumber LIKE :s', { s })
            .orWhere('e.mobileNumber LIKE :s', { s })
            .orWhere('e.shopCode ILIKE :s', { s })
            .orWhere('e.shopName ILIKE :s', { s });
        }),
      );
    }
    return qb.orderBy('e.createdAt', 'DESC');
  }

  async listEntries(q: EntryQueryDto) {
    const [items, total] = await this.filtered(q)
      .skip((q.page - 1) * q.limit)
      .take(q.limit)
      .getManyAndCount();
    return { items, total, page: q.page, limit: q.limit };
  }

  async updateStatus(id: string, status: Entry['status']) {
    const res = await this.entries.update(id, { status });
    if (!res.affected) throw new NotFoundException('Entry not found');
    return { ok: true };
  }

  async exportEntries(q: ExportQueryDto, res: Response) {
    const rows = await this.filtered(q).getMany();
    const toRow = (e: Entry) => ({
      ...e,
      createdAtIst: formatIst(e.createdAt),
      playedAtIst: formatIst(e.playedAt),
      played: e.played ? 'Yes' : 'No',
    });
    const stamp = istToday();

    if (q.format === 'csv') {
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="diwali-entries-${stamp}.csv"`);
      const lines = [EXPORT_COLUMNS.map((c) => csvEscape(c.header)).join(',')];
      for (const e of rows) {
        const r = toRow(e) as Record<string, unknown>;
        // Leading tab keeps Excel from turning IMEIs/phone numbers into scientific notation.
        lines.push(
          EXPORT_COLUMNS.map((c) => {
            const v = r[c.key];
            return ['imei', 'contactNumber', 'mobileNumber'].includes(c.key)
              ? csvEscape(`\t${v}`)
              : csvEscape(v);
          }).join(','),
        );
      }
      res.send('﻿' + lines.join('\r\n'));
      return;
    }

    const wb = new ExcelJS.Workbook();
    const ws = wb.addWorksheet('Entries');
    ws.columns = EXPORT_COLUMNS.map((c) => ({ header: c.header, key: c.key, width: c.width }));
    ws.getRow(1).font = { bold: true };
    ws.views = [{ state: 'frozen', ySplit: 1 }];
    rows.forEach((e) => ws.addRow(toRow(e)));
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader('Content-Disposition', `attachment; filename="diwali-entries-${stamp}.xlsx"`);
    await wb.xlsx.write(res);
    res.end();
  }

  async uploadImeis(file: Express.Multer.File, uploadedBy: string) {
    const rows = await readSpreadsheet(file.buffer, file.originalname);
    const upload = await importImeis(this.ds, rows, file.originalname, uploadedBy);
    return { ...upload, totalEligible: await this.imeis.count() };
  }

  listUploads() {
    return this.uploads.find({ order: { createdAt: 'DESC' }, take: 100 });
  }

  async checkImei(imei: string) {
    const eligible = await this.imeis.findOne({ where: { imei } });
    const entry = await this.entries.findOne({ where: { imei } });
    return { imei, eligible: !!eligible, addedAt: eligible?.createdAt ?? null, entry };
  }

  async uploadStores(file: Express.Multer.File) {
    const rows = await readSpreadsheet(file.buffer, file.originalname);
    const result = await importStores(this.ds, rows);
    return { ...result, totalStores: await this.stores.count() };
  }

  listModels() {
    return this.models.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
  }

  async addModel(name: string) {
    const existing = await this.models.findOne({ where: { name } });
    if (existing) return existing;
    const max = await this.models.maximum('sortOrder');
    return this.models.save(this.models.create({ name, sortOrder: (max ?? 0) + 1 }));
  }

  async deleteModel(id: number) {
    await this.models.delete(id);
    return { ok: true };
  }
}
