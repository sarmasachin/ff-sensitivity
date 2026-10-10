import { IsBoolean, IsString, MaxLength } from 'class-validator';

export class UpdateProfileDto {
  @IsString()
  @MaxLength(40)
  displayName!: string;

  @IsString()
  @MaxLength(15)
  ffUid!: string;

  @IsString()
  @MaxLength(40)
  playRole!: string;

  @IsString()
  @MaxLength(40)
  region!: string;

  @IsBoolean()
  notifyPush!: boolean;
}
