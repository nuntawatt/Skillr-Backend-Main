import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
  Request,
  Query,
  UnauthorizedException,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { JwtAuthGuard, RolesGuard, Roles } from '@auth';
import type { AuthUser } from '@auth';
import { UserRole } from '@common/enums';

type RequestWithUser = {
  user?: AuthUser;
};

function getUserIdOrThrow(user?: AuthUser): string {
  const raw = user?.id ?? user?.sub;
  if (typeof raw === 'string' || typeof raw === 'number') {
    return String(raw);
  }
  throw new UnauthorizedException();
}

@Controller('payments')
@UseGuards(JwtAuthGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  @Post()
  create(
    @Body() createPaymentDto: CreatePaymentDto,
    @Request() req: RequestWithUser,
  ) {
    return this.paymentsService.create(
      createPaymentDto,
      getUserIdOrThrow(req.user),
    );
  }

  @Get('my')
  getMyPayments(@Request() req: RequestWithUser) {
    return this.paymentsService.findByUser(getUserIdOrThrow(req.user));
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
  webhook(@Body() payload: unknown) {
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
