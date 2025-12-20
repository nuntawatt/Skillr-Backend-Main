import { Controller, Get, Post, Body, Param, UseGuards, Request, Query } from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import { UserRole } from '@common/enums';

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(@Body() createPaymentDto: CreatePaymentDto, @Request() req) {
    return this.paymentsService.create(createPaymentDto, req.user.id);
  }

  @Get('my')
  getMyPayments(@Request() req) {
    return this.paymentsService.findByUser(req.user.id);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.paymentsService.findOne(id);
  }

  @Get()
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  findAll(@Query('status') status?: string) {
    return this.paymentsService.findAll(status);
  }

  // Webhook for payment confirmation (no auth required in production)
  @Post('webhook')
  webhook(@Body() payload: any) {
    return this.paymentsService.handleWebhook(payload);
  }

  // Admin confirm payment
  @Post(':id/confirm')
  @UseGuards(RolesGuard)
  @Roles(UserRole.ADMIN)
  confirmPayment(@Param('id') id: string) {
    return this.paymentsService.confirmPayment(id);
  }
}
