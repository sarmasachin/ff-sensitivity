import {
  ArrayMinSize,
  IsArray,
  IsIn,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from 'class-validator';

// --- Start: Staff admin live wire (Sachin) ---
export class StaffInviteDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  name!: string;

  @IsString()
  @MinLength(3)
  @MaxLength(120)
  email!: string;

  @IsIn(['ADMIN', 'SUB_ADMIN', 'VIEWER'])
  role!: 'ADMIN' | 'SUB_ADMIN' | 'VIEWER';

  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  modules!: string[];

  @IsOptional()
  @IsString()
  @MinLength(6)
  @MaxLength(128)
  currentPassword?: string;
}

export class StaffModulesDto {
  @IsArray()
  @ArrayMinSize(1)
  @IsString({ each: true })
  modules!: string[];
}
// --- End: Staff admin live wire (Sachin) ---
