import {
  IsArray,
  IsBoolean,
  IsInt,
  IsOptional,
  IsString,
  Max,
  MaxLength,
  Min,
  MinLength,
  ValidateNested,
  ArrayMinSize,
  ArrayMaxSize,
} from 'class-validator';
import { Type } from 'class-transformer';

// --- Start: Challenge live wire (Sachin) ---
export class ChallengeRulesDto {
  @IsBoolean()
  missDayResetsStreak!: boolean;

  @IsBoolean()
  requireCheckIn!: boolean;

  @IsBoolean()
  requireQuiz!: boolean;

  @IsBoolean()
  adBonusOptional!: boolean;

  @IsInt()
  @Min(0)
  @Max(20)
  scratchCardsPerDay!: number;

  @IsBoolean()
  cardExpiresSameDay!: boolean;

  @IsInt()
  @Min(1)
  @Max(365)
  firstMilestoneDays!: number;

  @IsInt()
  @Min(1)
  @Max(72)
  wrongAnswerLockHours!: number;

  @IsInt()
  @Min(1)
  @Max(48)
  quizOpenWindowHours!: number;

  @IsInt()
  @Min(0)
  @Max(9999)
  quizCorrectCoins!: number;

  @IsInt()
  @Min(-9999)
  @Max(9999)
  quizWrongCoins!: number;
}

export class QuizQuestionDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(400)
  question!: string;

  @IsArray()
  @ArrayMinSize(4)
  @ArrayMaxSize(4)
  @IsString({ each: true })
  options!: string[];

  @IsInt()
  @Min(0)
  @Max(3)
  correctIndex!: number;

  @IsBoolean()
  enabled!: boolean;
}

export class MilestoneDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  id!: string;

  @IsInt()
  @Min(1)
  @Max(365)
  days!: number;

  @IsString()
  @MinLength(1)
  @MaxLength(80)
  title!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(120)
  rewardLabel!: string;

  @IsInt()
  @Min(0)
  @Max(100_000)
  coinReward!: number;

  @IsOptional()
  @IsString()
  @MaxLength(80)
  badge?: string | null;

  @IsBoolean()
  enabled!: boolean;
}

export class SaveChallengeDto {
  @ValidateNested()
  @Type(() => ChallengeRulesDto)
  rules!: ChallengeRulesDto;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => QuizQuestionDto)
  quiz!: QuizQuestionDto[];

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => MilestoneDto)
  milestones!: MilestoneDto[];
}

export class SubmitQuizDto {
  @IsString()
  @MinLength(1)
  @MaxLength(64)
  questionId!: string;

  @IsInt()
  @Min(0)
  @Max(3)
  selectedIndex!: number;
}
// --- End: Challenge live wire (Sachin) ---
