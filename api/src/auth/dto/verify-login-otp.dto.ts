import { IsString, Length, Matches } from 'class-validator';

export class VerifyLoginOtpDto {
  @IsString()
  @Length(32, 128)
  challengeId!: string;

  @IsString()
  @Matches(/^\d{6}$/)
  code!: string;
}
