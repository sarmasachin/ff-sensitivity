import { IsBoolean, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';

// --- Start: Claims live wire (Sachin) ---
export class FlagClaimDto {
  @IsBoolean()
  flagged!: boolean;

  @IsOptional()
  @IsString()
  @MaxLength(280)
  note?: string;
}

export class RevealClaimDto {
  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword?: string;
}
// --- End: Claims live wire (Sachin) ---
