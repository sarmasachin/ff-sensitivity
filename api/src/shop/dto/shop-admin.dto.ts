import {
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateIf,
} from 'class-validator';

const MSG = {
  catId:
    'Category ID must start with a letter and use A-Z, 0-9, underscore only (2-32).',
  catLabel: 'Category label must be 2-40 characters.',
  itemId:
    'Item ID must use lowercase letters, numbers, and underscores only (2-64).',
  title: 'Title must be 2-80 characters.',
  subtitle: 'Subtitle must be 2-200 characters.',
  category:
    'Category must start with a letter and use A-Z, 0-9, underscore only.',
  price: 'Price must be at least 1 coin.',
  stock: 'Stock limit must be 0 or higher (or empty for unlimited).',
  rewardTag: 'Reward tag is required (max 40 characters).',
  sortOrder: 'Sort order must be between 0 and 9999.',
} as const;

export class CreateShopCategoryDto {
  @IsString()
  @MinLength(2, { message: MSG.catId })
  @MaxLength(32, { message: MSG.catId })
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: MSG.catId })
  id!: string;

  @IsString()
  @MinLength(2, { message: MSG.catLabel })
  @MaxLength(40, { message: MSG.catLabel })
  label!: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isBoost?: boolean;
}

export class UpdateShopCategoryDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: MSG.catLabel })
  @MaxLength(40, { message: MSG.catLabel })
  label?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  isBoost?: boolean;
}

export class CreateShopItemDto {
  @IsString()
  @MinLength(2, { message: MSG.itemId })
  @MaxLength(64, { message: MSG.itemId })
  @Matches(/^[a-z0-9_]+$/, { message: MSG.itemId })
  id!: string;

  @IsString()
  @MinLength(2, { message: MSG.title })
  @MaxLength(80, { message: MSG.title })
  title!: string;

  @IsString()
  @MinLength(2, { message: MSG.subtitle })
  @MaxLength(200, { message: MSG.subtitle })
  subtitle!: string;

  @IsString()
  @MinLength(2, { message: MSG.category })
  @MaxLength(32, { message: MSG.category })
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: MSG.category })
  category!: string;

  @IsInt()
  @Min(1, { message: MSG.price })
  @Max(999999, { message: MSG.price })
  priceCoins!: number;

  @IsBoolean()
  enabled!: boolean;

  @IsBoolean()
  oneTime!: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt({ message: MSG.stock })
  @Min(0, { message: MSG.stock })
  @Max(999999, { message: MSG.stock })
  stockLimit?: number | null;

  @IsString()
  @MinLength(1, { message: MSG.rewardTag })
  @MaxLength(40, { message: MSG.rewardTag })
  rewardTag!: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;
}

export class UpdateShopItemDto {
  @IsOptional()
  @IsString()
  @MinLength(2, { message: MSG.title })
  @MaxLength(80, { message: MSG.title })
  title?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: MSG.subtitle })
  @MaxLength(200, { message: MSG.subtitle })
  subtitle?: string;

  @IsOptional()
  @IsString()
  @MinLength(2, { message: MSG.category })
  @MaxLength(32, { message: MSG.category })
  @Matches(/^[A-Z][A-Z0-9_]*$/, { message: MSG.category })
  category?: string;

  @IsOptional()
  @IsInt()
  @Min(1, { message: MSG.price })
  @Max(999999, { message: MSG.price })
  priceCoins?: number;

  @IsOptional()
  @IsBoolean()
  enabled?: boolean;

  @IsOptional()
  @IsBoolean()
  oneTime?: boolean;

  @IsOptional()
  @ValidateIf((_, v) => v !== null)
  @IsInt({ message: MSG.stock })
  @Min(0, { message: MSG.stock })
  @Max(999999, { message: MSG.stock })
  stockLimit?: number | null;

  @IsOptional()
  @IsString()
  @MinLength(1, { message: MSG.rewardTag })
  @MaxLength(40, { message: MSG.rewardTag })
  rewardTag?: string;

  @IsOptional()
  @IsInt()
  @Min(0, { message: MSG.sortOrder })
  @Max(9999, { message: MSG.sortOrder })
  sortOrder?: number;
}
