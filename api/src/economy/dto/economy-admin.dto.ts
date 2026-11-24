import { Type } from 'class-transformer';
import {
  IsBoolean,
  IsInt,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class EconomyEarnDto {
  @IsInt()
  @Min(0)
  @Max(100_000)
  checkInCoins!: number;

  @IsInt()
  @Min(0)
  @Max(9999)
  quizCorrectCoins!: number;

  /** Magnitude. Stored as a wallet deduction on a wrong answer. */
  @IsInt()
  @Min(0)
  @Max(9999)
  quizWrongCoins!: number;

  @IsInt()
  @Min(0)
  @Max(100_000)
  adBonusCoins!: number;
}

export class EconomyLimitsDto {
  @IsInt()
  @Min(100)
  @Max(9_999_999)
  walletCap!: number;

  @IsInt()
  @Min(0)
  @Max(9_999_999)
  dailyEarnCap!: number;
}

/** Coin cost + which unlock paths the app shows. */
export class EconomyPremiumUnlockDto {
  @IsInt()
  @Min(0)
  @Max(100_000)
  bestPremium!: number;

  @IsInt()
  @Min(0)
  @Max(100_000)
  premiumProMax!: number;

  @IsInt()
  @Min(0)
  @Max(100_000)
  oneTapPremium!: number;

  /** Show “Unlock with coins” in the app dialog. */
  @IsBoolean()
  coinUnlockEnabled!: boolean;

  /** Show “Watch ad to unlock” in the app dialog. */
  @IsBoolean()
  adUnlockEnabled!: boolean;
}

export class SaveEconomyDto {
  @ValidateNested()
  @Type(() => EconomyEarnDto)
  earn!: EconomyEarnDto;

  @ValidateNested()
  @Type(() => EconomyLimitsDto)
  limits!: EconomyLimitsDto;

  @ValidateNested()
  @Type(() => EconomyPremiumUnlockDto)
  premiumUnlock!: EconomyPremiumUnlockDto;

  @IsBoolean()
  checkInEnabled!: boolean;

  @IsBoolean()
  quizEnabled!: boolean;

  @IsBoolean()
  adBonusEnabled!: boolean;
}
