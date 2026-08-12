import {
  IsEnum,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';
import { RedeemCadence, RedeemCodeStatus, RedeemType } from '@prisma/client';

const MSG = {
  title: 'Title must be 2-80 characters.',
  type: 'Choose a valid redeem type.',
  valueLabel: 'Value label is required (max 40 characters).',
  codeSecret: 'Code secret must be 8-80 characters.',
  status: 'Choose a valid status.',
  cadence: 'Choose a valid cadence.',
  stock: 'Stock must be 0 or 1.',
  coinCost: 'Coin cost must be 0 or higher.',
  expiresLabel: 'Expires label must be at most 40 characters.',
  tip: 'Tip must be at most 120 characters.',
  redeemUrl: 'Redeem URL must be at most 200 characters.',
  password: 'Current password must be 6-128 characters.',
} as const;

export class CreateRedeemCodeDto {
  @IsString()
  @MinLength(2, { message: MSG.title })
  @MaxLength(80, { message: MSG.title })
  title!: string;

  @IsEnum(RedeemType, { message: MSG.type })
  type!: RedeemType;

  @IsString()
  @MinLength(1, { message: MSG.valueLabel })
  @MaxLength(40, { message: MSG.valueLabel })
  valueLabel!: string;

  @IsString()
  @MinLength(8, { message: MSG.codeSecret })
  @MaxLength(80, { message: MSG.codeSecret })
  codeSecret!: string;

  @IsEnum(RedeemCodeStatus, { message: MSG.status })
  status!: RedeemCodeStatus;

  @IsEnum(RedeemCadence, { message: MSG.cadence })
  cadence!: RedeemCadence;

  @IsInt()
  @Min(0, { message: MSG.stock })
  @Max(1, { message: MSG.stock })
  stockLeft!: number;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt({ message: MSG.coinCost })
  @Min(0, { message: MSG.coinCost })
  @Max(999999, { message: MSG.coinCost })
  coinCost?: number | null;

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
  @IsEnum(RedeemType, { message: MSG.type })
  type?: RedeemType;

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
  @IsEnum(RedeemCodeStatus, { message: MSG.status })
  status?: RedeemCodeStatus;

  @IsOptional()
  @IsEnum(RedeemCadence, { message: MSG.cadence })
  cadence?: RedeemCadence;

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

export class RevealRedeemCodeDto {
  @IsOptional()
  @IsString()
  @MinLength(6, { message: MSG.password })
  @MaxLength(128, { message: MSG.password })
  currentPassword?: string;
}
