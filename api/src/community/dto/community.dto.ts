import { Type } from 'class-transformer';
import {
  IsIn,
  IsInt,
  IsOptional,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
  MinLength,
} from 'class-validator';

// --- Start: Community live wire (Sachin) ---
export const COMMUNITY_RANKS = [
  'Bronze',
  'Silver',
  'Gold',
  'Platinum',
  'Diamond',
  'Heroic',
] as const;

export const COMMUNITY_ROLES = [
  'Rusher',
  'Sniper',
  'Entry',
  'Support',
  'Mixed',
] as const;

export const COMMUNITY_STATUSES = [
  'PENDING',
  'APPROVED',
  'FEATURED',
  'HIDDEN',
] as const;

export class SubmitCommunityPostDto {
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  name!: string;

  @IsString()
  @Matches(/^\d{5,15}$/)
  freeFireId!: string;

  @IsIn([...COMMUNITY_RANKS])
  rank!: (typeof COMMUNITY_RANKS)[number];

  @IsIn([...COMMUNITY_ROLES])
  role!: (typeof COMMUNITY_ROLES)[number];

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  deviceLabel!: string;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  deviceMeta?: string;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999_999)
  matches!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999_999)
  kills!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(999_999)
  headshots!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  general!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  redDot!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  scope2x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  scope4x!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  awm!: number;

  @Type(() => Number)
  @IsInt()
  @Min(0)
  @Max(200)
  freeLook!: number;
}

export class UpdateCommunityStatusDto {
  @IsIn([...COMMUNITY_STATUSES])
  status!: (typeof COMMUNITY_STATUSES)[number];
}
// --- End: Community live wire (Sachin) ---
