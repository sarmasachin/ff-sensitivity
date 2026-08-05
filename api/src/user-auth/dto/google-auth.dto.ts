import { IsNotEmpty, IsString } from 'class-validator';

// --- Start: Redeem live wire (Sachin) ---
export class GoogleAuthDto {
  @IsString()
  @IsNotEmpty()
  idToken!: string;
}
// --- End: Redeem live wire (Sachin) ---
