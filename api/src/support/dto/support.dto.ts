import {
  IsEmail,
  IsIn,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// --- Start: Support live wire (Sachin) ---
export const SUPPORT_SUBJECTS = [
  'REPORT',
  'REDEEM_CODE_ISSUE',
  'BUG',
  'FEATURE',
  'FEEDBACK',
  'OTHER',
] as const;

export class StartSupportThreadDto {
  @IsString()
  @MinLength(1)
  @MaxLength(40)
  name!: string;

  @IsEmail()
  @MaxLength(80)
  email!: string;

  @IsIn(SUPPORT_SUBJECTS)
  subject!: (typeof SUPPORT_SUBJECTS)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(40)
  appVersion!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  deviceLabel!: string;
}

export class SupportMessageDto {
  @IsString()
  @MinLength(1)
  @MaxLength(1000)
  message!: string;
}

export class AdminSupportReplyDto {
  @IsString()
  @MinLength(1)
  @MaxLength(2000)
  message!: string;
}
// --- End: Support live wire (Sachin) ---
