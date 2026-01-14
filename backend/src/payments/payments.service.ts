import { Injectable, Logger } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Payment, PaymentDocument } from './schemas/payment.schema';
import { PaymentsGateway } from './payments.gateway';

@Injectable()
export class PaymentsService {
  private logger = new Logger('PaymentsService');
  private currentMethodIndex = 0;

  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
    private paymentsGateway: PaymentsGateway,
  ) {
    this.startPaymentSimulation();
  }

  private startPaymentSimulation() {
    setInterval(() => {
      this.simulatePayment();
    }, 2000);
  }

  private async simulatePayment() {
    const methods = ['card', 'bank_transfer', 'crypto', 'paypal'];
    const statuses = ['success', 'success', 'success', 'success', 'failed'];

    const method = methods[this.currentMethodIndex];
    this.currentMethodIndex = (this.currentMethodIndex + 1) % methods.length;

    // ✅ CORRECT: Generates 100 to 500
    const amount = Math.floor(Math.random() * 401) + 100;

    const payment = new this.paymentModel({
      tenantId: 'tenant_1',
      amount: amount,
      method: method,
      status: statuses[Math.floor(Math.random() * statuses.length)],
    });

    await payment.save();

    const eventType = 
      payment.status === 'failed' ? 'payment_failed' : 'payment_received';

    this.paymentsGateway.broadcastPaymentEvent({
      type: eventType,
      payment: payment.toObject(),
      timestamp: new Date(),
    });

    this.logger.debug(`Simulated payment: ${payment._id} (${payment.status}) - ${method} - ₹${amount}`);
  }

  async findAll(tenantId: string, limit = 100) {
    return this.paymentModel
      .find({ tenantId })
      .sort({ createdAt: -1 })
      .limit(limit)
      .exec();
  }

  // ✅ ADD THIS METHOD to clear and reseed
  async clearAndReseed() {
    // Delete all existing payments
    await this.paymentModel.deleteMany({});
    this.logger.log('Cleared all existing payments');

    const methods = ['card', 'bank_transfer', 'crypto', 'paypal'];
    const statuses = ['success', 'success', 'success', 'failed'];
    const payments = [];

    for (let i = 0; i < 1000; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(createdAt.getHours() - hoursAgo);

      payments.push({
        tenantId: 'tenant_1',
        amount: Math.floor(Math.random() * 401) + 100, // ✅ 100 to 500
        method: methods[Math.floor(Math.random() * methods.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt,
        updatedAt: createdAt,
      });
    }

    await this.paymentModel.insertMany(payments);
    this.logger.log(`Reseeded ${payments.length} payments with amounts 100-500`);
    
    return { 
      message: 'Cleared and reseeded successfully', 
      count: payments.length,
      amountRange: '100-500 INR'
    };
  }

  async seedData() {
    const count = await this.paymentModel.countDocuments();
    if (count > 0) {
      this.logger.log('Database already seeded');
      return { message: 'Already seeded', count };
    }

    const methods = ['card', 'bank_transfer', 'crypto', 'paypal'];
    const statuses = ['success', 'success', 'success', 'failed'];
    const payments = [];

    for (let i = 0; i < 1000; i++) {
      const daysAgo = Math.floor(Math.random() * 30);
      const hoursAgo = Math.floor(Math.random() * 24);
      
      const createdAt = new Date();
      createdAt.setDate(createdAt.getDate() - daysAgo);
      createdAt.setHours(createdAt.getHours() - hoursAgo);

      payments.push({
        tenantId: 'tenant_1',
        amount: Math.floor(Math.random() * 401) + 100, // ✅ 100 to 500
        method: methods[Math.floor(Math.random() * methods.length)],
        status: statuses[Math.floor(Math.random() * statuses.length)],
        createdAt,
        updatedAt: createdAt,
      });
    }

    await this.paymentModel.insertMany(payments);
    this.logger.log(`Seeded ${payments.length} payments`);
    
    return { 
      message: 'Seeded successfully', 
      count: payments.length,
      amountRange: '100-500 INR'
    };
  }
}