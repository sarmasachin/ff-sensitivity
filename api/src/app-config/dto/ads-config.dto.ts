import {
  IsBoolean,
  IsInt,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

export class AdPlacementDto {
  @IsBoolean()
  enabled!: boolean;

  @IsInt()
  @Min(0)
  @Max(168)
  cooldownHours!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  incompleteMessage!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(200)
  buttonLabel!: string;
}

export class SaveAdsConfigDto {
  @ValidateNested()
  @Type(() => AdPlacementDto)
  calculate!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  dpi!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  quiz!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  secondChance!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  adBonus!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  checkIn!: AdPlacementDto;

  @ValidateNested()
  @Type(() => AdPlacementDto)
  redeemDaily!: AdPlacementDto;
}
