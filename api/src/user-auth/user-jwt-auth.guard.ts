import { Injectable } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';

// --- Start: Redeem live wire (Sachin) ---
@Injectable()
export class UserJwtAuthGuard extends AuthGuard('user-jwt') {}
// --- End: Redeem live wire (Sachin) ---
