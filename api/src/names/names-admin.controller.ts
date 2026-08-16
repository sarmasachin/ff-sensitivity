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
import { NamesModuleGuard } from './names-module.guard';
import { NamesService } from './names.service';
import { NamesAdminItemsService } from './names-admin-items.service';
import { NameFontDto, NameFrameDto, SaveNamesDto } from './dto/names.dto';

@Controller('api/v1/admin/names')
@UseGuards(JwtAuthGuard, NamesModuleGuard)
export class NamesAdminController {
  constructor(
    private readonly names: NamesService,
    private readonly items: NamesAdminItemsService,
  ) {}

  @Get()
  @Throttle({ default: { limit: 60, ttl: 60_000 } })
  get() {
    return this.names.adminGetBundle();
  }

  @Put()
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  save(@CurrentAdmin() admin: AuthAdmin, @Body() dto: SaveNamesDto) {
    return this.names.adminSave(admin.id, dto);
  }

  @Post('frames')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  createFrame(
    @CurrentAdmin() admin: AuthAdmin,
    @Body() dto: NameFrameDto,
  ) {
    return this.items.createFrame(admin.id, dto);
  }

  @Put('frames/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  updateFrame(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: NameFrameDto,
  ) {
    return this.items.updateFrame(admin.id, id, dto);
  }

  @Delete('frames/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  deleteFrame(@CurrentAdmin() admin: AuthAdmin, @Param('id') id: string) {
    return this.items.deleteFrame(admin.id, id);
  }

  @Put('fonts/:id')
  @Throttle({ default: { limit: 40, ttl: 60_000 } })
  updateFont(
    @CurrentAdmin() admin: AuthAdmin,
    @Param('id') id: string,
    @Body() dto: NameFontDto,
  ) {
    return this.items.updateFont(admin.id, id, dto);
  }
}
