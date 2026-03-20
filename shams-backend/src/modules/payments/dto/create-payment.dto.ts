import {
  IsInt,
  IsEnum,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';
import { PaymentMethod } from '@prisma/client';
import { Type } from 'class-transformer';

export class CreatePaymentDto {
  @IsInt()
  @Type(() => Number)
  appointmentId: number;

  @IsEnum(PaymentMethod)
  method: PaymentMethod;

  @IsInt()
  @IsOptional()
  @Type(() => Number)
  serviceId?: number;

  /** MPesa transaction code, Stripe charge ID, etc. */
  @IsString()
  @IsOptional()
  @MaxLength(100)
  externalRef?: string;

  @IsString()
  @IsOptional()
  @MaxLength(300)
  notes?: string;
}