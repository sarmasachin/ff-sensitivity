import { Module } from '@nestjs/common';
import { AppConfigModule } from '../app-config/app-config.module';
import { CompareController } from './compare.controller';
import { CompareService } from './compare.service';

@Module({
  imports: [AppConfigModule],
  controllers: [CompareController],
  providers: [CompareService],
})
export class CompareModule {}
