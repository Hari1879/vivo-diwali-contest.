import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { Repository } from 'typeorm';
import { EligibleImei, Entry, MobileModel, Store } from '../entities';
import { CreateEntryDto } from './create-entry.dto';

@Injectable()
export class PublicService {
  constructor(
    @InjectRepository(Store) private stores: Repository<Store>,
    @InjectRepository(EligibleImei) private imeis: Repository<EligibleImei>,
    @InjectRepository(Entry) private entries: Repository<Entry>,
    @InjectRepository(MobileModel) private models: Repository<MobileModel>,
    private config: ConfigService,
  ) {}

  get minPrice(): number {
    return Number(this.config.get('MIN_PRICE') ?? 20000);
  }

  /** "block" (default) rejects IMEIs not in the list; "review" saves them for vivo to check. */
  get imeiMismatchMode(): 'block' | 'review' {
    return this.config.get('IMEI_MISMATCH_MODE') === 'review' ? 'review' : 'block';
  }

  get contestOpen(): boolean {
    const start = this.config.get<string>('CONTEST_START');
    const end = this.config.get<string>('CONTEST_END');
    const now = Date.now();
    if (start && now < new Date(start).getTime()) return false;
    if (end && now > new Date(end).getTime()) return false;
    return true;
  }

  async getConfig() {
    const branchRows = await this.stores
      .createQueryBuilder('s')
      .select('DISTINCT s.branch', 'branch')
      .where('s.active = true')
      .orderBy('branch')
      .getRawMany<{ branch: string }>();
    const models = await this.models.find({ order: { sortOrder: 'ASC', name: 'ASC' } });
    return {
      contestOpen: this.contestOpen,
      minPrice: this.minPrice,
      branches: branchRows.map((b) => b.branch),
      models: models.map((m) => m.name),
    };
  }

  async findStore(code: string) {
    const store = await this.stores.findOne({
      where: { code: code.trim().toUpperCase(), active: true },
    });
    if (!store) throw new NotFoundException('Shop code not found');
    return { code: store.code, name: store.name, branch: store.branch };
  }

  async createEntry(dto: CreateEntryDto, ip: string | null, userAgent: string | null) {
    if (!this.contestOpen) throw new BadRequestException('The contest is not open right now');

    const store = await this.stores.findOne({ where: { code: dto.shopCode, active: true } });
    if (!store) throw new BadRequestException('Shop code not found');
    if (store.branch !== dto.branch) {
      throw new BadRequestException(`This shop belongs to the ${store.branch} branch`);
    }

    if (dto.mobilePrice < this.minPrice) {
      throw new BadRequestException(
        `This contest is only for phones priced Rs. ${this.minPrice.toLocaleString('en-IN')} and above`,
      );
    }

    if (await this.entries.exists({ where: { imei: dto.imei } })) {
      throw new ConflictException('This IMEI number has already been registered');
    }

    let status: Entry['status'] = 'valid';
    let reviewReason: string | null = null;
    const eligible = await this.imeis.exists({ where: { imei: dto.imei } });
    if (!eligible) {
      if (this.imeiMismatchMode === 'block') {
        throw new BadRequestException(
          'This IMEI number is not eligible. Please check the number or contact the store.',
        );
      }
      status = 'review';
      reviewReason = 'IMEI not in uploaded list';
    }

    const playToken = randomBytes(24).toString('hex');
    const entry = this.entries.create({
      name: dto.name,
      contactNumber: dto.contactNumber,
      branch: store.branch,
      shopCode: store.code,
      shopName: store.name,
      mobileNumber: dto.mobileNumber,
      imei: dto.imei,
      mobileModel: dto.mobileModel,
      mobilePrice: dto.mobilePrice,
      termsAccepted: true,
      status,
      reviewReason,
      playToken,
      ipAddress: ip?.slice(0, 64) ?? null,
      userAgent: userAgent?.slice(0, 255) ?? null,
    });

    try {
      const saved = await this.entries.save(entry);
      return { entryId: saved.id, playToken };
    } catch (err: unknown) {
      // Unique violation: two submissions with the same IMEI at the same moment.
      if ((err as { code?: string }).code === '23505') {
        throw new ConflictException('This IMEI number has already been registered');
      }
      throw err;
    }
  }

  async markPlayed(id: string, playToken: string) {
    const entry = await this.entries
      .createQueryBuilder('e')
      .addSelect('e.playToken')
      .where('e.id = :id', { id })
      .getOne();
    if (!entry || entry.playToken !== playToken) throw new NotFoundException('Entry not found');
    if (!entry.played) {
      await this.entries.update(id, { played: true, playedAt: new Date() });
    }
    return { ok: true };
  }
}
