import { IsNumber, Max, Min, ValidateNested } from 'class-validator';
import { Type } from 'class-transformer';

export class ShareConflictKnobsDto {
  @IsNumber()
  @Min(0)
  @Max(50)
  softGap!: number;

  @IsNumber()
  @Min(1)
  @Max(100)
  hardGap!: number;

  @IsNumber()
  @Min(0)
  @Max(0.95)
  maxShrink!: number;
}

export class SaveProMaxConfigDto {
  @ValidateNested()
  @Type(() => ShareConflictKnobsDto)
  shareConflict!: ShareConflictKnobsDto;
}
