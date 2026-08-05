import {
  IsBoolean,
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

// --- Start: Ops settings live wire (Sachin) ---
export class PreferencesDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  defaultLanding!: string;

  @IsBoolean()
  compactTables!: boolean;

  @IsBoolean()
  showInlineNotices!: boolean;

  @IsBoolean()
  denseSidebar!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(64)
  timezoneLabel!: string;
}

export class SessionDto {
  @IsNumber()
  idleTimeoutMinutes!: number;

  @IsNumber()
  absoluteSessionHours!: number;

  @IsNumber()
  rememberDeviceDays!: number;

  @IsBoolean()
  logoutOnBrowserClose!: boolean;

  @IsBoolean()
  singleSessionOnly!: boolean;
}

export class SecurityDto {
  @IsBoolean()
  requireReauthForReveal!: boolean;

  @IsBoolean()
  requireReauthForStaffInvite!: boolean;

  @IsBoolean()
  requireReauthForWalletAdjust!: boolean;

  @IsBoolean()
  allowViewerCsvExport!: boolean;

  @IsString()
  @MinLength(1)
  @MaxLength(500)
  ipAllowlistNote!: string;

  @IsNumber()
  @Min(7)
  @Max(3650)
  auditRetentionDays!: number;

  @IsBoolean()
  auditAutoPurge!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  lastAuditPurgeAt?: string | null;
}

export class SaveOpsSettingsDto {
  @ValidateNested()
  @Type(() => PreferencesDto)
  preferences!: PreferencesDto;

  @ValidateNested()
  @Type(() => SessionDto)
  session!: SessionDto;

  @ValidateNested()
  @Type(() => SecurityDto)
  security!: SecurityDto;
}
// --- End: Ops settings live wire (Sachin) ---
