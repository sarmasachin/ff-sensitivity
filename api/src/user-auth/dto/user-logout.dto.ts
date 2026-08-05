import { IsOptional, IsString, MaxLength } from 'class-validator';

// --- Start: App analytics P2 logout (Sachin) ---
export class UserLogoutDto {
  @IsOptional()
  @IsString()
  @MaxLength(64)
  installId?: string;
}
// --- End: App analytics P2 logout (Sachin) ---
