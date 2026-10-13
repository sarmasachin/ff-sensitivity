import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
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
}
