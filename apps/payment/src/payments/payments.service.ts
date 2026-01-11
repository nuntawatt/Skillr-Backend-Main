import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Payment, PaymentStatus } from './entities/payment.entity';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class PaymentsService {
  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    private readonly configService: ConfigService,
  ) {}

  async create(
    createPaymentDto: CreatePaymentDto,
    userId: string,
  ): Promise<Payment> {
    const numericUserId = Number(userId);
    const isFree = Number(createPaymentDto.amount) <= 0;
    const payment = this.paymentRepository.create({
      ...createPaymentDto,
      userId: numericUserId,
      courseId: Number(createPaymentDto.courseId),
      status: isFree ? PaymentStatus.COMPLETED : PaymentStatus.PENDING,
      paidAt: isFree ? new Date() : undefined,
    });

    const saved = await this.paymentRepository.save(payment);

    if (isFree) {
      await this.enrollUser(numericUserId, Number(createPaymentDto.courseId));
    }

    return saved;
  }

  async findByUser(userId: string): Promise<Payment[]> {
    const numericUserId = Number(userId);
    return this.paymentRepository.find({
      where: { userId: numericUserId },
      order: { createdAt: 'DESC' },
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
      where: status ? { status: status as PaymentStatus } : undefined,
      order: { createdAt: 'DESC' },
    });
  }

  async handleWebhook(payload: unknown): Promise<{ received: boolean }> {
    const record =
      typeof payload === 'object' && payload !== null
        ? (payload as Record<string, unknown>)
        : undefined;

    const paymentIdRaw = record?.['paymentId'];
    const statusRaw = record?.['status'];
    const providerRefRaw = record?.['providerRef'];

    const paymentId =
      typeof paymentIdRaw === 'string' || typeof paymentIdRaw === 'number'
        ? String(paymentIdRaw)
        : undefined;
    const status = typeof statusRaw === 'string' ? statusRaw : undefined;
    const providerRef =
      typeof providerRefRaw === 'string' ? providerRefRaw : undefined;

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

    const saved = await this.paymentRepository.save(payment);
    await this.enrollUser(payment.userId, payment.courseId);
    return saved;
  }

  async cancelPayment(id: string): Promise<Payment> {
    const payment = await this.findOne(id);
    payment.status = PaymentStatus.CANCELLED;
    return this.paymentRepository.save(payment);
  }

  private async enrollUser(userId: number, courseId: number) {
    const baseUrl =
      this.configService.get<string>('LEARNING_SERVICE_URL') ||
      process.env.LEARNING_SERVICE_URL;
    const secret =
      this.configService.get<string>('INTERNAL_API_SECRET') ||
      process.env.INTERNAL_API_SECRET;

    if (!baseUrl || !secret) {
      // Fail silently? better to log and return
      // In absence of logger, throw to surface misconfiguration
      throw new Error('LEARNING_SERVICE_URL or INTERNAL_API_SECRET not set');
    }

    const url = `${baseUrl.replace(/\/+$/, '')}/enrollments/internal/enroll`;
    await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-internal-secret': secret,
      },
      body: JSON.stringify({ userId, courseId }),
    });
  }
}
