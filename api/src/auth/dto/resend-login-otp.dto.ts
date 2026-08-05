import { IsString, Length } from 'class-validator';

export class ResendLoginOtpDto {
  @IsString()
  @Length(32, 128)
  challengeId!: string;
}
