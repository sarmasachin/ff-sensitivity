import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Start: Copy CMS live wire (Sachin) ---
export class CopyRateDto {
  @IsBoolean()
  enabled!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(400)
  body!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  primaryCta!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  secondaryCta!: string;

  @IsInt()
  @Min(1)
  @Max(100)
  minSessions!: number;
}

export class CopyShareDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  sheetTitle!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(800)
  bodyTemplate!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(300)
  footerLine!: string;

  @IsString()
  @MaxLength(120)
  hashtags!: string;
}

export class CopyAboutDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  headline!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(600)
  blurb!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  versionPrefix!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  websiteCta!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  privacyCta!: string;
}

export class CopyLegalDto {
  @IsString()
  @MinLength(1)
  @MaxLength(60)
  privacyLabel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  termsLabel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  supportLabel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(60)
  storeLabel!: string;
}

export class SaveCopyConfigDto {
  @ValidateNested()
  @Type(() => CopyRateDto)
  rate!: CopyRateDto;

  @ValidateNested()
  @Type(() => CopyShareDto)
  share!: CopyShareDto;

  @ValidateNested()
  @Type(() => CopyAboutDto)
  about!: CopyAboutDto;

  @ValidateNested()
  @Type(() => CopyLegalDto)
  legal!: CopyLegalDto;
}
// --- End: Copy CMS live wire (Sachin) ---
