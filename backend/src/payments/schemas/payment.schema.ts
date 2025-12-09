import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type PaymentDocument = Payment & Document;

@Schema({ timestamps: true })
export class Payment {
  @Prop({ required: true, index: true })
  tenantId: string;

  @Prop({ required: true })
  amount: number;

  @Prop({ required: true, index: true })
  method: string; // card, bank_transfer, crypto, paypal

  @Prop({ required: true, index: true })
  status: string; // success, failed, refunded

  @Prop({ type: Date, default: Date.now, index: true })
  createdAt: Date;

  @Prop({ type: Date, default: Date.now })
  updatedAt: Date;
}

export const PaymentSchema = SchemaFactory.createForClass(Payment);

// Compound indexes for common queries
PaymentSchema.index({ tenantId: 1, createdAt: -1 });
PaymentSchema.index({ tenantId: 1, status: 1, createdAt: -1 });

