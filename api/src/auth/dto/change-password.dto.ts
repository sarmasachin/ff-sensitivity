import { IsString, MaxLength, MinLength } from 'class-validator';

// --- Start: Admin profile live wire (Sachin) ---
export class ChangePasswordDto {
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(128)
  newPassword!: string;
}
// --- End: Admin profile live wire (Sachin) ---
