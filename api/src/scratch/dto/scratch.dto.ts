import {
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Start: Scratch live wire (Sachin) ---
export class ScratchOutcomeOddsDto {
  @IsInt()
  @Min(0)
  @Max(100)
  coinsPercent!: number;

  @IsInt()
  @Min(0)
  @Max(100)
  redeemPercent!: number;

  @IsInt()
  @Min(0)
  @Max(100_000)
  coinAmount!: number;
}

export class ScratchPolicyDto {
  @IsInt()
  @Min(1)
  @Max(365)
  retentionDays!: number;

  @IsBoolean()
  autoPurge!: boolean;

  @IsBoolean()
  showExpired!: boolean;
}

export class ScratchPrizeDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(240)
  detail!: string;

  @IsIn(['MILESTONE', 'REDEEM', 'SHOP', 'GIFT'])
  kind!: 'MILESTONE' | 'REDEEM' | 'SHOP' | 'GIFT';

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  rewardLabel!: string;

  @IsInt()
  @Min(0)
  @Max(100_000)
  coinReward!: number;

  @IsNumber()
  @Min(0)
  @Max(100)
  oddsPercent!: number;

  @IsBoolean()
  enabled!: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  streakDays?: number | null;
}

export class SaveScratchDto {
  @ValidateNested()
  @Type(() => ScratchOutcomeOddsDto)
  outcomeOdds!: ScratchOutcomeOddsDto;

  @ValidateNested()
  @Type(() => ScratchPolicyDto)
  policy!: ScratchPolicyDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => ScratchPrizeDto)
  prizes!: ScratchPrizeDto[];
}
// --- End: Scratch live wire (Sachin) ---
