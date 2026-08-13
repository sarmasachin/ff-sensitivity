import {
  IsArray,
  IsBoolean,
  IsDateString,
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RedeemCodeStatus, RedeemMode } from '@prisma/client';

const MSG = {
  title: 'Title must be 2-80 characters.',
  type: 'Choose a valid redeem type.',
  valueLabel: 'Value label is required (max 40 characters).',
  codeSecret: 'Code secret must be 8-80 characters.',
  status: 'Choose a valid status.',
  cadence: 'Choose a valid cadence.',
  mode: 'Choose Single or Scratch reward mode.',
  stock: 'Stock must be 0 or 1.',
  coinCost: 'Coin cost must be 0 or higher.',
  coinReward: 'Coin reward must be 0-10000.',
  window: 'Window minutes must be 5-240.',
  codesPerWindow: 'Codes per window must be 1-20.',
  expiresLabel: 'Expires label must be at most 40 characters.',
  tip: 'Tip must be at most 120 characters.',
  redeemUrl: 'Redeem URL must be at most 200 characters.',
  password: 'Current password must be 6-128 characters.',
  pool: 'Paste at least one code (8-80 chars each, one per line).',
  defId:
    'Id must start with a letter and use A-Z, 0-9, underscore only (2-32).',
  defLabel: 'Label must be 2-40 characters.',
  sortOrder: 'Sort order must be between 0 and 9999.',
  claimLimit: 'Claim limit must be 1–100.',
  windowHours: 'Window hours must be 1–8760.',
} as const;

const DEF_ID = /^[A-Z][A-Z0-9_]*$/;

export class CreateRedeemTypeDto {
  @IsString()
  @MinLength(2, { message: MSG.defId })
  @MaxLength(32, { message: MSG.defId })
  @Matches(DEF_ID, { message: MSG.defId })
  id!: string;

  @IsString()
  @MinLength(2, { message: MSG.defLabel })
  @MaxLength(40, { message: MSG.defLabel })
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateRedeemTypeDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: MSG.defLabel })
  @MaxLength(40, { message: MSG.defLabel })
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateRedeemCadenceDto {
  @IsString()
  @MinLength(2, { message: MSG.defId })
  @MaxLength(32, { message: MSG.defId })
  @Matches(DEF_ID, { message: MSG.defId })
  id!: string;

  @IsString()
  @MinLength(2, { message: MSG.defLabel })
  @MaxLength(40, { message: MSG.defLabel })
  label!: string;

  @IsOptional()
  @IsInt({ message: MSG.claimLimit })
  @Min(1, { message: MSG.claimLimit })
  @Max(100, { message: MSG.claimLimit })
  claimLimit?: number;

  @IsOptional()
  @IsInt({ message: MSG.windowHours })
  @Min(1, { message: MSG.windowHours })
  @Max(8760, { message: MSG.windowHours })
  windowHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class UpdateRedeemCadenceDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: MSG.defLabel })
  @MaxLength(40, { message: MSG.defLabel })
  label?: string;

  @IsOptional()
  @IsInt({ message: MSG.claimLimit })
  @Min(1, { message: MSG.claimLimit })
  @Max(100, { message: MSG.claimLimit })
  claimLimit?: number;

  @IsOptional()
  @IsInt({ message: MSG.windowHours })
  @Min(1, { message: MSG.windowHours })
  @Max(8760, { message: MSG.windowHours })
  windowHours?: number;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;
}

export class CreateRedeemCodeDto {
  @IsOptional()
  @IsEnum(RedeemMode, { message: MSG.mode })
  mode?: RedeemMode;

  @IsString()
  @MinLength(2, { message: MSG.title })
  @MaxLength(80, { message: MSG.title })
  title!: string;

  @IsString({ message: MSG.type })
  @MinLength(2, { message: MSG.type })
  @MaxLength(32, { message: MSG.type })
  @Matches(DEF_ID, { message: MSG.type })
  type!: string;

  @IsString()
  @MinLength(1, { message: MSG.valueLabel })
  @MaxLength(40, { message: MSG.valueLabel })
  valueLabel!: string;

  @ValidateIf((o) => (o.mode ?? RedeemMode.SINGLE) === RedeemMode.SINGLE)
  @IsString()
  @MinLength(8, { message: MSG.codeSecret })
  @MaxLength(80, { message: MSG.codeSecret })
  codeSecret?: string;

  @ValidateIf(
    (o) => (o.mode ?? RedeemMode.SINGLE) === RedeemMode.SCRATCH_REWARD,
  )
  @IsArray({ message: MSG.pool })
  @IsString({ each: true })
  codePool?: string[];

  @IsEnum(RedeemCodeStatus, { message: MSG.status })
  status!: RedeemCodeStatus;

  @IsString({ message: MSG.cadence })
  @MinLength(2, { message: MSG.cadence })
  @MaxLength(32, { message: MSG.cadence })
  @Matches(DEF_ID, { message: MSG.cadence })
  cadence!: string;

  @ValidateIf((o) => (o.mode ?? RedeemMode.SINGLE) === RedeemMode.SINGLE)
  @IsInt()
  @Min(0, { message: MSG.stock })
  @Max(1, { message: MSG.stock })
  stockLeft?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt({ message: MSG.coinCost })
  @Min(0, { message: MSG.coinCost })
  @Max(999999, { message: MSG.coinCost })
  coinCost?: number | null;

  @ValidateIf(
    (o) => (o.mode ?? RedeemMode.SINGLE) === RedeemMode.SCRATCH_REWARD,
  )
  @IsInt({ message: MSG.coinReward })
  @Min(0, { message: MSG.coinReward })
  @Max(10000, { message: MSG.coinReward })
  coinRewardMin?: number;

  @ValidateIf(
    (o) => (o.mode ?? RedeemMode.SINGLE) === RedeemMode.SCRATCH_REWARD,
  )
  @IsInt({ message: MSG.coinReward })
  @Min(0, { message: MSG.coinReward })
  @Max(10000, { message: MSG.coinReward })
  coinRewardMax?: number;

  @IsOptional()
  @IsDateString({}, { message: 'Start time must be a valid date.' })
  startsAt?: string;

  @IsOptional()
  @IsDateString({}, { message: 'End time must be a valid date.' })
  endsAt?: string;

  @IsOptional()
  @IsInt({ message: MSG.window })
  @Min(5, { message: MSG.window })
  @Max(240, { message: MSG.window })
  windowMinutes?: number;

  @IsOptional()
  @IsInt({ message: MSG.codesPerWindow })
  @Min(1, { message: MSG.codesPerWindow })
  @Max(20, { message: MSG.codesPerWindow })
  codesPerWindow?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40, { message: MSG.expiresLabel })
  expiresLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: MSG.tip })
  tip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: MSG.redeemUrl })
  redeemUrl?: string;
}

export class UpdateRedeemCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: MSG.title })
  @MaxLength(80, { message: MSG.title })
  title?: string;

  @IsOptional()
  @IsString({ message: MSG.type })
  @MinLength(2, { message: MSG.type })
  @MaxLength(32, { message: MSG.type })
  @Matches(DEF_ID, { message: MSG.type })
  type?: string;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: MSG.valueLabel })
  @MaxLength(40, { message: MSG.valueLabel })
  valueLabel?: string;

  @IsOptional()
  @IsString()
  @MinLength(8, { message: MSG.codeSecret })
  @MaxLength(80, { message: MSG.codeSecret })
  codeSecret?: string;

  @IsOptional()
  @IsArray({ message: MSG.pool })
  @IsString({ each: true })
  codePool?: string[];

  @IsOptional()
  @IsEnum(RedeemCodeStatus, { message: MSG.status })
  status?: RedeemCodeStatus;

  @IsOptional()
  @IsString({ message: MSG.cadence })
  @MinLength(2, { message: MSG.cadence })
  @MaxLength(32, { message: MSG.cadence })
  @Matches(DEF_ID, { message: MSG.cadence })
  cadence?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.stock })
  @Max(1, { message: MSG.stock })
  stockLeft?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt({ message: MSG.coinCost })
  @Min(0, { message: MSG.coinCost })
  @Max(999999, { message: MSG.coinCost })
  coinCost?: number | null;

  @IsOptional()
  @IsInt({ message: MSG.coinReward })
  @Min(0, { message: MSG.coinReward })
  @Max(10000, { message: MSG.coinReward })
  coinRewardMin?: number;

  @IsOptional()
  @IsInt({ message: MSG.coinReward })
  @Min(0, { message: MSG.coinReward })
  @Max(10000, { message: MSG.coinReward })
  coinRewardMax?: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString({}, { message: 'Start time must be a valid date.' })
  startsAt?: string | null;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsDateString({}, { message: 'End time must be a valid date.' })
  endsAt?: string | null;

  @IsOptional()
  @IsInt({ message: MSG.window })
  @Min(5, { message: MSG.window })
  @Max(240, { message: MSG.window })
  windowMinutes?: number;

  @IsOptional()
  @IsInt({ message: MSG.codesPerWindow })
  @Min(1, { message: MSG.codesPerWindow })
  @Max(20, { message: MSG.codesPerWindow })
  codesPerWindow?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40, { message: MSG.expiresLabel })
  expiresLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(120, { message: MSG.tip })
  tip?: string;

  @IsOptional()
  @IsString()
  @MaxLength(200, { message: MSG.redeemUrl })
  redeemUrl?: string;
}

export class AppendRedeemPoolDto {
  @IsArray({ message: MSG.pool })
  @IsString({ each: true })
  codePool!: string[];
}

export class RevealRedeemCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: MSG.password })
  @MaxLength(128, { message: MSG.password })
  currentPassword?: string;
}
