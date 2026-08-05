import {
  IsBoolean,
  IsEmail,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// --- Start: Admin profile live wire (Sachin) ---
export class UpdateProfileDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  displayName!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  jobTitle!: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  deskLabel!: string;

  @IsEmail()
  @MaxLength(120)
  notifyEmail!: string;

  @IsOptional()
  @IsString()
  @MaxLength(32)
  phone?: string;

  @IsString()
  @MinLength(2)
  @MaxLength(64)
  timezoneLabel!: string;

  @IsBoolean()
  digestDaily!: boolean;

  @IsBoolean()
  digestSecurity!: boolean;
}
// --- End: Admin profile live wire (Sachin) ---
