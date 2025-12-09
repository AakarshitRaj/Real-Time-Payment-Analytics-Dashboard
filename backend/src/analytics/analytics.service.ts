import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, PipelineStage } from 'mongoose';
import { Payment, PaymentDocument } from '../payments/schemas/payment.schema';

export interface PaymentMetrics {
  totalVolume: number;
  successRate: number;
  averageAmount: number;
  peakHour: number;
  topPaymentMethod: string;
  totalPayments: number;
}

export interface TrendData {
  timestamp: Date;
  amount: number;
  count: number;
  successRate: number;
}

@Injectable()
export class AnalyticsService {
  constructor(
    @InjectModel(Payment.name) private paymentModel: Model<PaymentDocument>,
  ) {}

  async getMetrics(tenantId: string): Promise<PaymentMetrics> {
    const payments = await this.paymentModel.find({ tenantId }).exec();

    const totalVolume = payments.reduce((sum, p) => sum + p.amount, 0);
    const successCount = payments.filter(p => p.status === 'success').length;
    const successRate =
      payments.length > 0 ? (successCount / payments.length) * 100 : 0;
    const averageAmount =
      payments.length > 0 ? totalVolume / payments.length : 0;

    const hourCounts = new Array(24).fill(0);
    payments.forEach(p => {
      const hour = new Date(p.createdAt).getHours();
      hourCounts[hour]++;
    });
    const peakHour = hourCounts.indexOf(Math.max(...hourCounts));

    const methodCounts = payments.reduce((acc, p) => {
      acc[p.method] = (acc[p.method] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const topPaymentMethod =
      Object.entries(methodCounts).sort((a, b) => b[1] - a[1])[0]?.[0] ||
      'N/A';

    return {
      totalVolume,
      successRate,
      averageAmount,
      peakHour,
      topPaymentMethod,
      totalPayments: payments.length,
    };
  }

  async getTrends(
    tenantId: string,
    period: 'day' | 'week' | 'month' = 'day',
  ): Promise<TrendData[]> {
    const now = new Date();

    const pipeline: PipelineStage[] = [
      {
        $match: {
          tenantId,
          createdAt: {
            $gte: new Date(
              now.getTime() -
                (period === 'day'
                  ? 24 * 60 * 60 * 1000
                  : period === 'week'
                  ? 7 * 24 * 60 * 60 * 1000
                  : 30 * 24 * 60 * 60 * 1000),
            ),
          },
        },
      },
      {
        $group: {
          _id:
            period === 'day'
              ? {
                  $dateToString: {
                    format: '%Y-%m-%d-%H',
                    date: '$createdAt',
                  },
                }
              : {
                  $dateToString: {
                    format: '%Y-%m-%d',
                    date: '$createdAt',
                  },
                },
          amount: { $sum: '$amount' },
          count: { $sum: 1 },
          successCount: {
            $sum: {
              $cond: [{ $eq: ['$status', 'success'] }, 1, 0],
            },
          },
        },
      },
      { $sort: { _id: 1 as 1 } }, // enforce TS type
    ];

    const results = await this.paymentModel.aggregate(pipeline).exec();

    return results.map(r => ({
      timestamp: new Date(
        r._id.replace(/-(\d{2})$/, 'T$1:00:00'),
      ),
      amount: r.amount,
      count: r.count,
      successRate: r.count > 0 ? (r.successCount / r.count) * 100 : 0,
    }));
  }
}
