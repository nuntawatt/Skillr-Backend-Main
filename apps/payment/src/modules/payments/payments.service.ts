import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus, PaymentMethod } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
  ) {}

  async create(createPaymentDto: CreatePaymentDto, userId: string): Promise<Payment> {
    const numericUserId = Number(userId);
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      userId: numericUserId,
      courseId: Number(createPaymentDto.courseId),
      status: PaymentStatus.PENDING
    });
    
    return this.paymentRepository.save(payment);
  }

  async findByUser(userId: string): Promise<Payment[]> {
    const numericUserId = Number(userId);
    return this.paymentRepository.find({
      where: { userId: numericUserId },
      order: { createdAt: 'DESC' }
    });
  }

  async findOne(id: string): Promise<Payment> {
    const paymentId = Number(id);
    const payment = await this.paymentRepository.findOne({
      where: { id: paymentId },
    });
    if (!payment) {
      throw new NotFoundException(`Payment with ID ${id} not found`);
    }
    return payment;
  }

  async findAll(status?: string): Promise<Payment[]> {
    return this.paymentRepository.find({
      where: status ? ({ status } as any) : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  async handleWebhook(payload: any): Promise<{ received: boolean }> {
    const { paymentId, status, providerRef } = payload;
    
    if (paymentId && status === 'success') {
      await this.confirmPayment(paymentId, providerRef);
    }
    
    return { received: true };
  }

  async confirmPayment(id: string, providerRef?: string): Promise<Payment> {
    const payment = await this.findOne(id);
    
    payment.status = PaymentStatus.COMPLETED;
    payment.paidAt = new Date();
    if (providerRef) {
      payment.providerRef = providerRef;
    }
    
    return this.paymentRepository.save(payment);
  }

  async cancelPayment(id: string): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = PaymentStatus.CANCELLED;
    return this.paymentRepository.save(payment);
  }
}
