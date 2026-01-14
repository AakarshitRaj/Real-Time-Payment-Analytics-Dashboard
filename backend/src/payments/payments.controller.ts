import { Controller, Get, Post, Param } from '@nestjs/common';
import { PaymentsService } from './payments.service';

@Controller('payments')
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Get(':tenantId')
  async getPayments(@Param('tenantId') tenantId: string) {
    return this.paymentsService.findAll(tenantId);
  }

  @Post('seed')
  async seed() {
    return this.paymentsService.seedData();
  }

  @Post('clear-and-reseed')
  async clearAndReseed() {
    return this.paymentsService.clearAndReseed();
  }
}