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

export class SaveEconomyDto {
  @ValidateNested()
  @Type(() => EconomyEarnDto)
  earn!: EconomyEarnDto;

  @ValidateNested()
  @Type(() => EconomyLimitsDto)
  limits!: EconomyLimitsDto;

  @IsBoolean()
  checkInEnabled!: boolean;

  @IsBoolean()
  quizEnabled!: boolean;

  @IsBoolean()
  adBonusEnabled!: boolean;
}
