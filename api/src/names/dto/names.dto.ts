import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Start: Names live wire (Sachin) ---
export class NameFrameDto {
  @IsString()
  @Matches(/^[a-z0-9_]{1,64}$/)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MaxLength(32)
  prefix!: string;

  @IsString()
  @MaxLength(32)
  suffix!: string;

  @IsBoolean()
  premium!: boolean;

  @IsBoolean()
  enabled!: boolean;
}

export class NameFontDto {
  @IsString()
  @Matches(/^[a-z0-9_]{1,64}$/)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  label!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  sample!: string;

  @IsBoolean()
  enabled!: boolean;
}

export class NamesPolicyDto {
  @IsInt()
  @Min(1)
  @Max(12)
  maxNameChars!: number;

  @IsInt()
  @Min(10)
  @Max(200)
  maxBatchSize!: number;

  @IsBoolean()
  blockSpaces!: boolean;

  @IsBoolean()
  requireStyleWrap!: boolean;

  @IsBoolean()
  remotePackEnabled!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(500)
  remotePackUrl?: string;
}

export class SaveNamesDto {
  @ValidateNested()
  @Type(() => NamesPolicyDto)
  policy!: NamesPolicyDto;

  @IsOptional()
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(80)
  @ValidateNested({ each: true })
  @Type(() => NameFrameDto)
  frames?: NameFrameDto[];

  @IsOptional()
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(20)
  @ValidateNested({ each: true })
  @Type(() => NameFontDto)
  fonts?: NameFontDto[];
}
// --- End: Names live wire (Sachin) ---
