import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';
import { MAX_AD_COOLDOWN_MINUTES } from '../app-config-ads';

export class AdPlacementDto {
  @IsBoolean()
  enabled!: boolean;

  /** Preferred: minutes until this ad can show again (0 = every time). */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(MAX_AD_COOLDOWN_MINUTES)
  cooldownMinutes?: number;

  /** Legacy hours — used only if cooldownMinutes omitted. */
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(168)
  cooldownHours?: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  incompleteMessage!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  buttonLabel!: string;
}

export class SaveAdsConfigDto {
  @ValidateNested()
  @Type(() => AdPlacementDto)
  calculate!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  premium!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  dpi!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  quiz!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  secondChance!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  adBonus!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  checkIn!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  redeemDaily!: AdPlacementDto;
}
