import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { CreatePaymentDto } from './dto/create-payment.dto';
import { UpdatePaymentDto } from './dto/update-payment.dto';
import { FilterPaymentDto } from './dto/filter-payment.dto';
import { PaymentStatus, NotificationType } from '@prisma/client';
import { randomBytes } from 'crypto';
import { format } from 'date-fns';

// ─── Shared includes ──────────────────────────────────────────────────────────
const PAYMENT_INCLUDE = {
  appointment: {
    select: {
      id: true,
      appointmentDate: true,
      appointmentType: true,
      status: true,
      patient: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          email: true,
          phone: true,
        },
      },
      doctor: {
        select: {
          id: true,
          firstName: true,
          lastName: true,
          specialization: true,
        },
      },
    },
  },
  service: true,
} as const;

const TRANSACTION_INCLUDE = {
  patient: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
    },
  },
  appointment: {
    select: {
      id: true,
      appointmentDate: true,
      appointmentType: true,
      status: true,
    },
  },
  service: {
    select: { id: true, name: true, type: true },
  },
  payment: {
    select: {
      id: true,
      method: true,
      status: true,
      paidAt: true,
    },
  },
} as const;

@Injectable()
export class PaymentsService {
  constructor(
    private prisma: PrismaService,
    private notificationsService: NotificationsService,
  ) {}

  // ─── Generate reference number ────────────────────────────────────────────
  private generateReference(): string {
    const date = format(new Date(), 'yyyyMMdd');
    const random = randomBytes(4).toString('hex').toUpperCase();
    return `TXN-${date}-${random}`;
  }

  // ─── Create payment ───────────────────────────────────────────────────────
  async create(patientId: number, dto: CreatePaymentDto) {
    // 1. Load appointment
    const appointment = await this.prisma.appointment.findUnique({
      where: { id: dto.appointmentId },
      include: {
        patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
        service: true,
      },
    });

    if (!appointment) {
      throw new NotFoundException('Appointment not found');
    }
    if (appointment.patientId !== patientId) {
      throw new ForbiddenException('You can only pay for your own appointments');
    }
    if (appointment.status === 'CANCELLED' || appointment.status === 'COMPLETED') {
      throw new BadRequestException(`Cannot process payment for a ${appointment.status} appointment`);
    }

    // 2. Check for existing completed payment
    const existingPayment = await this.prisma.payment.findUnique({
      where: { appointmentId: dto.appointmentId },
    });
    if (existingPayment && existingPayment.status === PaymentStatus.COMPLETED) {
      throw new BadRequestException('This appointment has already been paid');
    }

    // 3. Resolve amount — use service price or existing appointment service
    let serviceId = dto.serviceId ?? appointment.serviceId ?? null;
    let amount: number;
    let serviceName = 'Medical Service';

    if (serviceId) {
      const service = await this.prisma.service.findUnique({ where: { id: serviceId } });
      if (!service) throw new NotFoundException(`Service #${serviceId} not found`);
      amount = Number(service.price);
      serviceName = service.name;
    } else {
      // Fallback: find the default service for this appointment type
      const defaultService = await this.prisma.service.findFirst({
        where: { type: appointment.appointmentType, isActive: true },
        orderBy: { price: 'asc' },
      });
      if (defaultService) {
        amount = Number(defaultService.price);
        serviceName = defaultService.name;
        serviceId = defaultService.id;
      } else {
        throw new BadRequestException(
          `No active service configured for ${appointment.appointmentType}. Please contact admin.`,
        );
      }
    }

    // 4. Create or update Payment + Transaction in a transaction
    const now = new Date();
    const referenceNumber = this.generateReference();

    const [payment] = await this.prisma.$transaction(async (tx) => {
      // Upsert payment (in case there was a prior PENDING one)
      let pay: any;
      if (existingPayment) {
        pay = await tx.payment.update({
          where: { id: existingPayment.id },
          data: {
            amount,
            status: PaymentStatus.COMPLETED,
            method: dto.method,
            transactionId: dto.externalRef ?? null,
            patientId,
            serviceId,
            notes: dto.notes,
            paidAt: now,
          },
          include: PAYMENT_INCLUDE,
        });
        // Update existing transaction
        await tx.transaction.updateMany({
          where: { paymentId: pay.id },
          data: {
            amount,
            paymentMethod: dto.method,
            status: PaymentStatus.COMPLETED,
            externalRef: dto.externalRef,
            processedAt: now,
          },
        });
      } else {
        pay = await tx.payment.create({
          data: {
            amount,
            status: PaymentStatus.COMPLETED,
            method: dto.method,
            transactionId: dto.externalRef ?? null,
            appointmentId: dto.appointmentId,
            patientId,
            serviceId,
            notes: dto.notes,
            currency: 'KES',
            paidAt: now,
          },
          include: PAYMENT_INCLUDE,
        });
        await tx.transaction.create({
          data: {
            referenceNumber,
            paymentId: pay.id,
            patientId,
            appointmentId: dto.appointmentId,
            serviceId,
            amount,
            currency: 'KES',
            paymentMethod: dto.method,
            status: PaymentStatus.COMPLETED,
            externalRef: dto.externalRef,
            description: `Payment for ${appointment.appointmentType.replace('_', ' ')} — ${serviceName}`,
            processedAt: now,
          },
        });
      }

      // Link service to appointment if not already set
      if (!appointment.serviceId && serviceId) {
        await tx.appointment.update({
          where: { id: dto.appointmentId },
          data: { serviceId },
        });
      }

      return [pay];
    });

    // 5. Send notifications (fire-and-forget)
    this.sendPaymentNotifications(payment, referenceNumber, serviceName).catch(
      (err) => console.error('Payment notification failed:', err),
    );

    return { payment, referenceNumber };
  }

  // ─── Notifications after payment ─────────────────────────────────────────
  private async sendPaymentNotifications(
    payment: any,
    referenceNumber: string,
    serviceName: string,
  ) {
    const appt = payment.appointment;
    const patient = appt.patient;
    if (!patient) return;

    const patientName = `${patient.firstName} ${patient.lastName}`;
    const amount = `KES ${Number(payment.amount).toLocaleString()}`;
    const apptDate = format(new Date(appt.appointmentDate), 'MMMM dd, yyyy');
    const apptTime = format(new Date(appt.appointmentDate), 'hh:mm a');

    // In-app
    await this.notificationsService.create({
      userId: patient.id,
      appointmentId: appt.id,
      notificationType: NotificationType.IN_APP,
      title: '✅ Payment Confirmed',
      message: `Your payment of ${amount} for ${serviceName} has been received. Ref: ${referenceNumber}`,
      recipientEmail: patient.email,
      recipientPhone: patient.phone,
    });

    // Email
    await this.notificationsService.create({
      userId: patient.id,
      appointmentId: appt.id,
      notificationType: NotificationType.EMAIL,
      title: 'Payment Receipt — SHAMS',
      message: `
        <div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;">
          <div style="background:linear-gradient(135deg,#10b981,#059669);padding:30px;text-align:center;border-radius:10px 10px 0 0;">
            <h1 style="color:#fff;margin:0;">✅ Payment Confirmed</h1>
          </div>
          <div style="background:#f9f9f9;padding:30px;border-radius:0 0 10px 10px;">
            <h2>Hello ${patientName}!</h2>
            <p>Your payment has been successfully processed.</p>
            <div style="background:#fff;border-left:4px solid #10b981;padding:20px;margin:20px 0;">
              <p><strong>Reference:</strong> ${referenceNumber}</p>
              <p><strong>Service:</strong> ${serviceName}</p>
              <p><strong>Amount:</strong> ${amount}</p>
              <p><strong>Appointment:</strong> ${apptDate} at ${apptTime}</p>
              <p><strong>Status:</strong> CONFIRMED</p>
            </div>
            <p>Please keep this reference number for your records. Your appointment is now pending confirmation by our staff.</p>
          </div>
        </div>
      `,
      recipientEmail: patient.email,
      recipientPhone: patient.phone,
    });

    // SMS
    await this.notificationsService.create({
      userId: patient.id,
      appointmentId: appt.id,
      notificationType: NotificationType.SMS,
      title: 'Payment Receipt',
      message: `SHAMS: Payment of ${amount} received for ${serviceName} on ${apptDate}. Ref: ${referenceNumber}. Your appointment is awaiting confirmation.`,
      recipientEmail: patient.email,
      recipientPhone: patient.phone,
    });
  }

  // ─── Get payment for appointment ──────────────────────────────────────────
  async getByAppointment(appointmentId: number, userId: number, userRole: string) {
    const payment = await this.prisma.payment.findUnique({
      where: { appointmentId },
      include: {
        ...PAYMENT_INCLUDE,
        transaction: true,
      },
    });
    if (!payment) throw new NotFoundException('No payment found for this appointment');

    if (userRole === 'PATIENT' && payment.patientId !== userId) {
      throw new ForbiddenException('Access denied');
    }
    return payment;
  }

  // ─── Find All (admin) ─────────────────────────────────────────────────────
  async findAll(filterDto: FilterPaymentDto, userId: number, userRole: string) {
    const { page = 1, limit = 20, ...filters } = filterDto;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (userRole === 'PATIENT') {
      where.patientId = userId;
    } else {
      if (filters.patientId) where.patientId = filters.patientId;
    }

    if (filters.status) where.status = filters.status;
    if (filters.method) where.method = filters.method;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate) where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.payment.findMany({
        where,
        skip,
        take: limit,
        include: PAYMENT_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.payment.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Master transactions list ─────────────────────────────────────────────
  async getTransactions(filterDto: FilterPaymentDto) {
    const { page = 1, limit = 20, ...filters } = filterDto;
    const skip = (page - 1) * limit;
    const where: any = {};

    if (filters.patientId) where.patientId = filters.patientId;
    if (filters.status)    where.status    = filters.status;
    if (filters.method)    where.paymentMethod = filters.method;

    if (filters.startDate || filters.endDate) {
      where.createdAt = {};
      if (filters.startDate) where.createdAt.gte = new Date(filters.startDate);
      if (filters.endDate)   where.createdAt.lte = new Date(filters.endDate);
    }

    const [data, total] = await Promise.all([
      this.prisma.transaction.findMany({
        where,
        skip,
        take: limit,
        include: TRANSACTION_INCLUDE,
        orderBy: { createdAt: 'desc' },
      }),
      this.prisma.transaction.count({ where }),
    ]);

    return {
      data,
      pagination: { total, page, limit, totalPages: Math.ceil(total / limit) },
    };
  }

  // ─── Payment statistics ───────────────────────────────────────────────────
  async getStats() {
    const [
      totalRevenue,
      pendingCount,
      completedCount,
      refundedCount,
      failedCount,
      revenueByMethod,
      recentTransactions,
    ] = await Promise.all([
      this.prisma.payment.aggregate({
        _sum: { amount: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.payment.count({ where: { status: 'PENDING' } }),
      this.prisma.payment.count({ where: { status: 'COMPLETED' } }),
      this.prisma.payment.count({ where: { status: 'REFUNDED' } }),
      this.prisma.payment.count({ where: { status: 'FAILED' } }),
      this.prisma.payment.groupBy({
        by: ['method'],
        _sum: { amount: true },
        _count: { id: true },
        where: { status: 'COMPLETED' },
      }),
      this.prisma.transaction.findMany({
        take: 5,
        orderBy: { createdAt: 'desc' },
        include: TRANSACTION_INCLUDE,
      }),
    ]);

    // Monthly revenue (last 6 months)
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const monthlyData = await this.prisma.$queryRaw<any[]>`
      SELECT
        DATE_TRUNC('month', created_at) AS month,
        SUM(amount)::float AS revenue,
        COUNT(id)::int AS count
      FROM payments
      WHERE status = 'COMPLETED'
        AND created_at >= ${sixMonthsAgo}
      GROUP BY DATE_TRUNC('month', created_at)
      ORDER BY month ASC
    `;

    return {
      totalRevenue: Number(totalRevenue._sum.amount ?? 0),
      counts: {
        pending: pendingCount,
        completed: completedCount,
        refunded: refundedCount,
        failed: failedCount,
        total: pendingCount + completedCount + refundedCount + failedCount,
      },
      revenueByMethod,
      monthlyRevenue: monthlyData,
      recentTransactions,
    };
  }

  // ─── Admin: refund ────────────────────────────────────────────────────────
  async refund(id: number, dto: UpdatePaymentDto) {
    const payment = await this.prisma.payment.findUnique({
      where: { id },
      include: {
        appointment: {
          include: {
            patient: { select: { id: true, firstName: true, lastName: true, email: true, phone: true } },
          },
        },
        service: true,
      },
    });
    if (!payment) throw new NotFoundException('Payment not found');
    if (payment.status !== PaymentStatus.COMPLETED) {
      throw new BadRequestException('Only completed payments can be refunded');
    }

    const [updated] = await this.prisma.$transaction(async (tx) => {
      const up = await tx.payment.update({
        where: { id },
        data: { status: PaymentStatus.REFUNDED },
        include: PAYMENT_INCLUDE,
      });
      await tx.transaction.updateMany({
        where: { paymentId: id },
        data: { status: PaymentStatus.REFUNDED },
      });
      return [up];
    });

    // Notify patient
    const patient = payment.appointment.patient;
    if (patient) {
      await this.notificationsService.create({
        userId: patient.id,
        appointmentId: payment.appointmentId,
        notificationType: NotificationType.IN_APP,
        title: '💰 Refund Processed',
        message: `A refund of KES ${Number(payment.amount).toLocaleString()} has been processed for your appointment.`,
        recipientEmail: patient.email,
        recipientPhone: patient.phone,
      });
    }

    return updated;
  }
}