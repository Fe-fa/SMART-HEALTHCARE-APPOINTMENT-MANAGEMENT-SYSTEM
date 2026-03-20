import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  UseGuards,
  ParseIntPipe,
} from '@nestjs/common';
import { PaymentsService } from './payments.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { JwtAuthGuard } from '../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../common/guards/roles.guard';
import { Roles } from '../../common/decorators/roles.decorator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@Controller('payments')
@UseGuards(JwtAuthGuard, RolesGuard)
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  // ─── Patient pays for appointment ─────────────────────────────────────────
  @Post()
  @Roles('PATIENT')
  create(@CurrentUser() user: any, @Body() dto: CreatePaymentDto) {
    return this.paymentsService.create(user.id, dto);
  }

  // ─── Admin: master transactions list ─────────────────────────────────────
  @Get('transactions')
  @Roles('ADMIN')
  getTransactions(@Query() filter: FilterPaymentDto) {
    return this.paymentsService.getTransactions(filter);
  }

  // ─── Admin: stats / reports ───────────────────────────────────────────────
  @Get('stats')
  @Roles('ADMIN')
  getStats() {
    return this.paymentsService.getStats();
  }

  // ─── All payments (admin: all; patient: own) ──────────────────────────────
  @Get()
  @Roles('ADMIN', 'PATIENT', 'NURSE')
  findAll(@CurrentUser() user: any, @Query() filter: FilterPaymentDto) {
    return this.paymentsService.findAll(filter, user.id, user.role);
  }

  // ─── Payment for specific appointment ─────────────────────────────────────
  @Get('appointment/:appointmentId')
  @Roles('ADMIN', 'NURSE', 'PATIENT')
  getByAppointment(
    @Param('appointmentId', ParseIntPipe) appointmentId: number,
    @CurrentUser() user: any,
  ) {
    return this.paymentsService.getByAppointment(appointmentId, user.id, user.role);
  }

  // ─── Admin: refund ────────────────────────────────────────────────────────
  @Patch(':id/refund')
  @Roles('ADMIN')
  refund(
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdatePaymentDto,
  ) {
    return this.paymentsService.refund(id, dto);
  }
}