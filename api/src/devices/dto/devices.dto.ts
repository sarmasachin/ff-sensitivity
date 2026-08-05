import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// --- Start: Devices live wire (Sachin) ---
export class DeviceHeartbeatDto {
  @IsString()
  @MinLength(12)
  @MaxLength(64)
  installId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(40)
  brand?: string;

  @IsOptional()
  @IsString()
  @MaxLength(60)
  model?: string;

  @IsOptional()
  @IsString()
  @MaxLength(20)
  androidVersion?: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;

  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(999999)
  appVersionCode?: number;

  @IsOptional()
  @IsBoolean()
  hasFcmToken?: boolean;

  /** Masked hint only — never full FCM token. */
  @IsOptional()
  @IsString()
  @MaxLength(40)
  fcmTokenHint?: string;
}

export class PatchDeviceNoteDto {
  @IsString()
  @MaxLength(400)
  note!: string;
}
// --- End: Devices live wire (Sachin) ---
