import { IsIn, IsOptional, IsString, MaxLength } from 'class-validator';

// --- Start: Users admin live wire (Sachin) ---
export class UserNoteDto {
  @IsString()
  @MaxLength(400)
  note!: string;
}

export class UserStatusDto {
  @IsIn(['restrict', 'suspend', 'restore'])
  action!: 'restrict' | 'suspend' | 'restore';

  @IsOptional()
  @IsString()
  @MaxLength(400)
  note?: string;
}
// --- End: Users admin live wire (Sachin) ---
