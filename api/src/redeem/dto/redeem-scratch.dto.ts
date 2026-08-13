import { IsString, MaxLength, MinLength } from 'class-validator';

export class ScratchRedeemDto {
  @IsString()
  @MinLength(8, { message: 'Scratch attempt key must be 8-64 characters.' })
  @MaxLength(64, { message: 'Scratch attempt key must be 8-64 characters.' })
  attemptKey!: string;
}
