import { Type } from 'class-transformer';
import {
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

export class SensitivityValuesDto {
  @IsInt()
  @Min(0)
  @Max(200)
  general!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  redDot!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  scope2x!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  scope4x!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  sniper!: number;

  @IsInt()
  @Min(0)
  @Max(200)
  freeLook!: number;

  @IsInt()
  @Min(1)
  @Max(100)
  fireButton!: number;
}

export class SaveCompareDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  deviceLabel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  fingers!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  role!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  dpiPreference!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  screenGuard!: string;

  @IsIn(['too_slow', 'perfect', 'too_fast'])
  feedback!: 'too_slow' | 'perfect' | 'too_fast';

  @ValidateNested()
  @Type(() => SensitivityValuesDto)
  suggested!: SensitivityValuesDto;

  @ValidateNested()
  @Type(() => SensitivityValuesDto)
  actual!: SensitivityValuesDto;

  /** Optional — Pro Max peer matching (legacy clients omit). */
  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(0.5)
  @Max(64)
  ramGb?: number;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  processorBrand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  processorType?: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  gpuLabel?: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  gpuVendor?: string;

  @IsOptional()
  @Type(() => Number)
  @IsNumber()
  @Min(30)
  @Max(360)
  refreshHz?: number;

  /**
   * Product bucket for peer isolation:
   * one_tap | promax | best_premium | classic
   */
  @IsOptional()
  @IsIn(['one_tap', 'promax', 'best_premium', 'classic', 'one_tap_premium', 'premium_pro_max'])
  engine?: string;
}
