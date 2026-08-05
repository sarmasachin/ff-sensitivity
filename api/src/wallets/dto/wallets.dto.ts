import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// --- Start: Wallets admin live wire (Sachin) ---
export class WalletAdjustDto {
  @IsInt()
  @Min(1)
  @Max(100_000)
  amount!: number;

  @IsString()
  @MinLength(3)
  @MaxLength(200)
  reason!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(80)
  requestId!: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword?: string;
}

export class WalletFreezeDto {
  @IsIn(['freeze', 'unfreeze'])
  action!: 'freeze' | 'unfreeze';
}
// --- End: Wallets admin live wire (Sachin) ---
