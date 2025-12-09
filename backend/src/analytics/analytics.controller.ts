import { Controller, Get, Query } from '@nestjs/common';
import { AnalyticsService, PaymentMetrics, TrendData } from './analytics.service';

@Controller('api/analytics')
export class AnalyticsController {
  constructor(private readonly analyticsService: AnalyticsService) {}

  @Get('metrics')
  async getMetrics(
    @Query('tenantId') tenantId = 'tenant_1',
  ): Promise<PaymentMetrics> {
    return this.analyticsService.getMetrics(tenantId);
  }

  @Get('trends')
  async getTrends(
    @Query('tenantId') tenantId = 'tenant_1',
    @Query('period') period: 'day' | 'week' | 'month' = 'day',
  ): Promise<TrendData[]> {
    return this.analyticsService.getTrends(tenantId, period);
  }
}
