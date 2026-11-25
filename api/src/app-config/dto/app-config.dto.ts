import {
  Allow,
  IsBoolean,
  IsEmail,
  IsInt,
  IsObject,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Start: App remote config live wire (Sachin) ---
export class AppStatusDto {
  @IsBoolean()
  maintenanceMode!: boolean;

  @IsString()
  @MaxLength(400)
  maintenanceMessage!: string;

  @IsBoolean()
  forceUpdate!: boolean;

  @IsBoolean()
  softUpdatePrompt!: boolean;

  @IsInt()
  @Min(1)
  @Max(999999)
  minVersionCode!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(32)
  minVersionName!: string;
}

export class AppLinksDto {
  @IsString()
  @MinLength(8)
  @MaxLength(300)
  playStoreUrl!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(300)
  privacyUrl!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(300)
  websiteUrl!: string;

  @IsEmail()
  @MaxLength(120)
  supportEmail!: string;
}

export class SaveAppConfigDto {
  @ValidateNested()
  @Type(() => AppStatusDto)
  status!: AppStatusDto;

  @IsObject()
  features!: Record<string, boolean>;

  @IsObject()
  navigation!: Record<string, boolean>;

  @ValidateNested()
  @Type(() => AppLinksDto)
  links!: AppLinksDto;

  /** GET /admin/app also returns ads; ignore on PUT (Ads desk owns writes). */
  @IsOptional()
  @Allow()
  ads?: unknown;

  /** Reserved / ignored — ProMax desk owns writes. */
  @IsOptional()
  @Allow()
  promax?: unknown;
}
// --- End: App remote config live wire (Sachin) ---
