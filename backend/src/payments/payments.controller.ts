import { Controller, Get, Post, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get()
  async findAll(@Query('tenantId') tenantId = 'tenant_1') {
    return this.paymentsService.findAll(tenantId);
  }

  @Post('seed')
  async seed() {
    return this.paymentsService.seedData();
  }
}
