import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Put,
  UseGuards,
} from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentAdmin } from '../auth/current-admin.decorator';
import type { AuthAdmin } from '../auth/current-admin.decorator';
import { ScratchModuleGuard } from './scratch-module.guard';
import { ScratchService } from './scratch.service';
import { ScratchAdminPrizesService } from './scratch-admin-prizes.service';
import { SaveScratchDto, ScratchPrizeDto } from './dto/scratch.dto';

@Controller('api/v1/admin/scratch')
@UseGuards(JwtAuthGuard, ScratchModuleGuard)
export class ScratchAdminController {
  constructor(
    private readonly scratch: ScratchService,
    private readonly prizes: ScratchAdminPrizesService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.scratch.adminGetBundle();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveScratchDto) {
    return this.scratch.adminSave(admin.id, dto);
  }

  @Post('prizes')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  createPrize(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() dto: ScratchPrizeDto,
  ) {
    return this.prizes.create(admin.id, dto);
  }

  @Put('prizes/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  updatePrize(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: ScratchPrizeDto,
  ) {
    return this.prizes.update(admin.id, id, dto);
  }

  @Delete('prizes/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  deletePrize(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.prizes.delete(admin.id, id);
  }
}
