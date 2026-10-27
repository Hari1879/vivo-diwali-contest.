import {
  Column,
  CreateDateColumn,
  Entity,
  Index,
  PrimaryColumn,
  PrimaryGeneratedColumn,
} from 'typeorm';

/** Shop / store master, loaded from vivo's store list (Store code, Store name, Zone). */
@Entity('stores')
export class Store {
  @PrimaryColumn({ length: 32 })
  code!: string;

  @Column({ length: 255 })
  name!: string;

  /** Zone in the store list = Branch in the registration form (14 branches). */
  @Index()
  @Column({ length: 64 })
  branch!: string;

  @Column({ default: true })
  active!: boolean;
}

/** Eligible IMEIs, uploaded daily by the vivo team. */
@Entity('eligible_imeis')
export class EligibleImei {
  @PrimaryColumn({ length: 15 })
  imei!: string;

  @Column({ type: 'int', nullable: true })
  uploadId!: number | null;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('imei_uploads')
export class ImeiUpload {
  @PrimaryGeneratedColumn()
  id!: number;

  @Column({ length: 255 })
  fileName!: string;

  @Column({ type: 'int' })
  totalFound!: number;

  @Column({ type: 'int' })
  added!: number;

  @Column({ type: 'int' })
  alreadyPresent!: number;

  @Column({ type: 'int' })
  invalidRows!: number;

  @Column({ length: 64 })
  uploadedBy!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

export type EntryStatus = 'valid' | 'review' | 'rejected';

@Entity('entries')
export class Entry {
  @PrimaryGeneratedColumn('uuid')
  id!: string;

  @Column({ length: 100 })
  name!: string;

  @Column({ length: 10 })
  contactNumber!: string;

  @Index()
  @Column({ length: 64 })
  branch!: string;

  @Index()
  @Column({ length: 32 })
  shopCode!: string;

  @Column({ length: 255 })
  shopName!: string;

  @Column({ length: 10 })
  mobileNumber!: string;

  /** One entry per IMEI — enforced by this unique index. */
  @Index({ unique: true })
  @Column({ length: 15 })
  imei!: string;

  @Column({ length: 100 })
  mobileModel!: string;

  @Column({ type: 'int' })
  mobilePrice!: number;

  @Column({ default: false })
  termsAccepted!: boolean;

  @Index()
  @Column({ type: 'varchar', length: 16, default: 'valid' })
  status!: EntryStatus;

  @Column({ type: 'varchar', length: 255, nullable: true })
  reviewReason!: string | null;

  @Column({ default: false })
  played!: boolean;

  @Column({ type: 'timestamptz', nullable: true })
  playedAt!: Date | null;

  /** Random token handed to the browser so only the registrant can mark the game as played. */
  @Column({ length: 64, select: false })
  playToken!: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  ipAddress!: string | null;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent!: string | null;

  @Index()
  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

@Entity('mobile_models')
export class MobileModel {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ length: 100 })
  name!: string;

  @Column({ type: 'int', default: 0 })
  sortOrder!: number;
}

@Entity('admins')
export class Admin {
  @PrimaryGeneratedColumn()
  id!: number;

  @Index({ unique: true })
  @Column({ length: 64 })
  username!: string;

  @Column({ length: 100, select: false })
  passwordHash!: string;

  @CreateDateColumn({ type: 'timestamptz' })
  createdAt!: Date;
}

export const ALL_ENTITIES = [Store, EligibleImei, ImeiUpload, Entry, MobileModel, Admin];
