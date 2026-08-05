import { IsBoolean, IsIn, IsInt, IsOptional, IsString, Max, Min, MinLength, MaxLength } from 'class-validator';

// --- Start: Economy live wire (Sachin) ---
export class ChallengeEarnDto {
  @IsIn(['CHECKIN', 'QUIZ', 'AD', 'MILESTONE'])
  kind!: 'CHECKIN' | 'QUIZ' | 'AD' | 'MILESTONE';

  @IsOptional()
  @IsBoolean()
  correct?: boolean;

  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  milestoneDays?: number;
}

export class ShopPurchaseDto {
  @IsString()
  @MinLength(2)
  @MaxLength(64)
  itemId!: string;

  /** Client-generated id so retries do not double-charge. */
  @IsString()
  @MinLength(8)
  @MaxLength(80)
  requestId!: string;
}
// --- End: Economy live wire (Sachin) ---
