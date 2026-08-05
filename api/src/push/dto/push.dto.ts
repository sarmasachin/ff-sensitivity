import {
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
  MinLength,
  ArrayMaxSize,
} from 'class-validator';

// --- Start: Push live wire (Sachin) ---
export const PUSH_AUDIENCES = ['ALL', 'ACTIVE_7D', 'NO_CLAIM', 'TOPIC'] as const;
export const PUSH_SCHEDULE_MODES = ['draft', 'later', 'now'] as const;

export class UpsertPushCampaignDto {
  @IsString()
  @Matches(/^[a-z0-9_]{1,64}$/)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(65)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(180)
  body!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  deepLink!: string;

  @IsIn(PUSH_AUDIENCES)
  audience!: (typeof PUSH_AUDIENCES)[number];

  @IsOptional()
  @IsString()
  @MaxLength(64)
  topic?: string;

  @IsIn(PUSH_SCHEDULE_MODES)
  scheduleMode!: (typeof PUSH_SCHEDULE_MODES)[number];

  @IsOptional()
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/)
  scheduledAt?: string;
}

export class RegisterPushDeviceDto {
  @IsString()
  @MinLength(8)
  @MaxLength(512)
  token!: string;

  @IsOptional()
  @IsIn(['android', 'ios'])
  platform?: 'android' | 'ios';

  @IsOptional()
  @IsArray()
  @ArrayMaxSize(20)
  @IsString({ each: true })
  @MaxLength(64, { each: true })
  topics?: string[];

  @IsOptional()
  @IsString()
  @MinLength(12)
  @MaxLength(64)
  installId?: string;
}
// --- End: Push live wire (Sachin) ---
