import { IsString, MaxLength, MinLength } from 'class-validator';

export class RedeemCommentDto {
  @IsString()
  @MinLength(1)
  @MaxLength(24)
  name!: string;

  @IsString()
  @MinLength(1)
  @MaxLength(280)
  text!: string;
}
