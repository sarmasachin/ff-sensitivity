import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  IsInt,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Start: Promos live wire (Sachin) ---
export const PROMO_PLACEMENTS = ['HOME_BANNER', 'HOME_STRIP'] as const;

export class PromoDto {
  @IsString()
  @Matches(/^[a-z0-9_]{1,64}$/)
  id!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MaxLength(160)
  subtitle!: string;

  @IsString()
  @Matches(/^[a-z0-9_-]{1,64}$/i)
  imageLabel!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  deepLink!: string;

  @IsIn(PROMO_PLACEMENTS)
  placement!: (typeof PROMO_PLACEMENTS)[number];

  @IsInt()
  @Min(1)
  @Max(100)
  sortOrder!: number;

  @IsBoolean()
  enabled!: boolean;

  /** Admin wall-clock stamp: YYYY-MM-DD HH:mm */
  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/)
  startsAt!: string;

  @IsString()
  @Matches(/^\d{4}-\d{2}-\d{2}[ T]\d{2}:\d{2}$/)
  endsAt!: string;
}

export class SavePromosDto {
  @IsArray()
  @ArrayMinSize(0)
  @ArrayMaxSize(40)
  @ValidateNested({ each: true })
  @Type(() => PromoDto)
  promos!: PromoDto[];
}

export class ReorderPromosDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(40)
  @IsString({ each: true })
  ids!: string[];
}
// --- End: Promos live wire (Sachin) ---
