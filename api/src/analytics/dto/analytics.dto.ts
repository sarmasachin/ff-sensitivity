import { IsObject, IsOptional, IsString, MaxLength } from 'class-validator';

// --- Start: App analytics P1 live wire (Sachin) ---
export class TrackAnalyticsEventDto {
  @IsString()
  @MaxLength(64)
  name!: string;

  @IsOptional()
  @IsString()
  @MaxLength(64)
  installId?: string;

  @IsOptional()
  @IsObject()
  props?: Record<string, unknown>;
}

export class AnonOpenDto {
  @IsString()
  @MaxLength(64)
  installId!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  appVersion?: string;
}
// --- End: App analytics P1 live wire (Sachin) ---
