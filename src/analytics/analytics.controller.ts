import { Controller, Get, Param, UseGuards } from '@nestjs/common';
import { AnalyticsService } from './analytics.service';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { RolesGuard } from '../common/guards/roles.guard';
import { Roles } from '../common/decorators/roles.decorator';

@Controller('analytics')
@UseGuards(JwtAuthGuard, RolesGuard)
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('overview')
  @Roles('manager', 'admin')
  getOverview() {
    return this.analyticsService.getOverview();
  }

  @Get('tasks/trending')
  @Roles('manager', 'admin')
  getTrendingTasks() {
    return this.analyticsService.getTrendingTasks();
  }

  @Get('user/:userId')
  @Roles('manager', 'admin')
  getUserProductivity(@Param('userId') userId: string) {
    return this.analyticsService.getUserProductivity(userId);
  }
}
