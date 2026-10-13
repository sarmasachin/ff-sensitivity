import { IsBoolean } from 'class-validator';

export class RedeemVoteDto {
  @IsBoolean()
  worked!: boolean;
}
