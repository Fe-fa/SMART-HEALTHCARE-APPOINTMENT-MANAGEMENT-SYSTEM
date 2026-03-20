import React, { useEffect, useMemo, useState } from 'react';
import { servicesApiService } from '@services/api/services.service';
import { paymentService } from '@services/api/payment.service';
import { Button } from '@components/common/Button/Button';
import { Alert } from '@components/common/Alert/Alert';
import type { Appointment, Service } from '@types';
import { PaymentMethod } from '@types';
import {
  X,
  CreditCard,
  Smartphone,
  Banknote,
  ShieldCheck,
  CheckCircle,
  Loader2,
  Receipt,
  Calendar,
  Clock,
  Stethoscope,
} from 'lucide-react';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  appointment: Appointment | null;
  onSuccess: (referenceNumber: string) => void;
}

const METHOD_OPTIONS = [
  {
    value: PaymentMethod.MOBILE_MONEY,
    label: 'M-Pesa / Mobile Money',
    icon: Smartphone,
    color: 'text-green-700 dark:text-green-300',
    border: 'border-green-300 dark:border-green-700',
    bg: 'bg-green-50 dark:bg-green-900/20',
    hint: 'Pay via mobile money. Enter your phone and reference (optional).',
  },
  {
    value: PaymentMethod.CASH,
    label: 'Cash',
    icon: Banknote,
    color: 'text-amber-700 dark:text-amber-300',
    border: 'border-amber-300 dark:border-amber-700',
    bg: 'bg-amber-50 dark:bg-amber-900/20',
    hint: 'Pay at reception (still logs transaction as completed).',
  },
  {
    value: PaymentMethod.INSURANCE,
    label: 'Insurance',
    icon: ShieldCheck,
    color: 'text-blue-700 dark:text-blue-300',
    border: 'border-blue-300 dark:border-blue-700',
    bg: 'bg-blue-50 dark:bg-blue-900/20',
    hint: 'Insurance coverage. Add notes/reference if any.',
  },
  {
    value: PaymentMethod.CREDIT_CARD,
    label: 'Credit / Debit Card',
    icon: CreditCard,
    color: 'text-purple-700 dark:text-purple-300',
    border: 'border-purple-300 dark:border-purple-700',
    bg: 'bg-purple-50 dark:bg-purple-900/20',
    hint: 'Card payment (integration-ready). Enter reference if available.',
  },
];

export const PaymentModal: React.FC<Props> = ({
  isOpen,
  onClose,
  appointment,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [loadingService, setLoadingService] = useState(false);

  const [services, setServices] = useState<Service[]>([]);
  const [selectedServiceId, setSelectedServiceId] = useState<number | null>(null);

  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod>(
    PaymentMethod.MOBILE_MONEY,
  );

  // Optional fields for references/notes
  const [mpesaPhone, setMpesaPhone] = useState('');
  const [externalRef, setExternalRef] = useState('');
  const [notes, setNotes] = useState('');

  const [error, setError] = useState('');
  const [receiptRef, setReceiptRef] = useState('');
  const [paidSuccess, setPaidSuccess] = useState(false);

  const selectedService = useMemo(() => {
    if (!selectedServiceId) return null;
    return services.find((s) => s.id === selectedServiceId) ?? null;
  }, [services, selectedServiceId]);

  useEffect(() => {
    if (!isOpen || !appointment) return;

    // reset state on open
    setError('');
    setReceiptRef('');
    setPaidSuccess(false);
    setExternalRef('');
    setNotes('');
    setMpesaPhone('');
    setSelectedMethod(PaymentMethod.MOBILE_MONEY);

    void fetchServicesForAppointment();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, appointment?.id]);

  const fetchServicesForAppointment = async () => {
    if (!appointment) return;
    setLoadingService(true);
    setError('');

    try {
      const list = await servicesApiService.getByType(appointment.appointmentType);
      setServices(list);

      // pick default (cheapest) if exists
      const defaultService = list[0] ?? null;
      setSelectedServiceId(defaultService?.id ?? null);

      if (!defaultService) {
        setError(
          `No active pricing configured for ${appointment.appointmentType.replace(
            /_/g,
            ' ',
          )}. Please contact admin.`,
        );
      }
    } catch (e: any) {
      setError('Failed to fetch pricing. Please retry.');
    } finally {
      setLoadingService(false);
    }
  };

  const formatMoney = (n: number) => `KES ${Number(n).toLocaleString()}`;

  const apptDate = appointment ? new Date(appointment.appointmentDate) : null;
  const apptTypeName = appointment
    ? appointment.appointmentType.replace(/_/g, ' ')
    : '';

  const methodMeta = METHOD_OPTIONS.find((m) => m.value === selectedMethod);

  const handlePay = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!appointment) {
      setError('No appointment loaded.');
      return;
    }
    if (!selectedService) {
      setError('Please select a service/price to pay for.');
      return;
    }
    if (selectedMethod === PaymentMethod.MOBILE_MONEY && !mpesaPhone.trim()) {
      setError('Please enter your mobile money phone number.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const res = await paymentService.create({
        appointmentId: appointment.id,
        method: selectedMethod,
        serviceId: selectedService.id,
        externalRef: externalRef.trim() || undefined,
        notes:
          [
            selectedMethod === PaymentMethod.MOBILE_MONEY
              ? `Mobile phone: ${mpesaPhone.trim()}`
              : null,
            notes.trim() ? notes.trim() : null,
          ]
            .filter(Boolean)
            .join(' | ') || undefined,
      });

      setReceiptRef(res.referenceNumber);
      setPaidSuccess(true);

      // after a short UX delay, notify parent (parent can refresh appointments/payments)
      setTimeout(() => {
        onSuccess(res.referenceNumber);
      }, 1600);
    } catch (err: any) {
      setError(err?.response?.data?.message ?? 'Payment failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen || !appointment) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-xl max-h-[92vh] overflow-y-auto border border-gray-200 dark:border-gray-700 animate-slide-up">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200 dark:border-gray-700 sticky top-0 bg-white dark:bg-gray-900 z-10">
          <div>
            <h2 className="text-xl font-bold text-gray-900 dark:text-white">
              Pay to Confirm Appointment
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Your appointment will only be confirmed after payment is completed.
            </p>
          </div>
          <button
            onClick={onClose}
            disabled={loading}
            className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 disabled:opacity-50"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>

        <div className="p-6 space-y-6">
          {error && <Alert type="error" message={error} onClose={() => setError('')} />}

          {/* Appointment Summary */}
          <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/40">
            <div className="flex items-center gap-2 mb-2">
              <Stethoscope className="w-4 h-4 text-teal-600" />
              <div className="font-bold text-gray-900 dark:text-white">
                {apptTypeName}
              </div>
            </div>
            <div className="text-sm text-gray-600 dark:text-gray-300 space-y-1">
              <div className="flex items-center gap-2">
                <Calendar className="w-4 h-4 text-blue-600" />
                <span>
                  {apptDate?.toLocaleDateString('en-US', {
                    weekday: 'long',
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="w-4 h-4 text-amber-600" />
                <span>
                  {apptDate?.toLocaleTimeString('en-US', {
                    hour: '2-digit',
                    minute: '2-digit',
                  })}
                </span>
              </div>
              <div className="text-xs mt-2 text-gray-500 dark:text-gray-400">
                Appointment ID: <span className="font-semibold">#{appointment.id}</span>
              </div>
            </div>
          </div>

          {/* Success receipt */}
          {paidSuccess ? (
            <div className="p-5 rounded-xl border border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <h3 className="text-lg font-bold text-green-800 dark:text-green-200">
                  Payment Completed
                </h3>
              </div>
              <div className="mt-3 text-sm text-green-700 dark:text-green-300">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4" />
                  <span>
                    Reference: <span className="font-bold">{receiptRef}</span>
                  </span>
                </div>
                <div className="mt-2">
                  You will receive confirmation via <strong>email</strong>, <strong>SMS</strong> and{' '}
                  <strong>in-app</strong> notification.
                </div>
              </div>
              <div className="mt-4">
                <Button variant="primary" onClick={onClose}>
                  Close
                </Button>
              </div>
            </div>
          ) : (
            <form onSubmit={handlePay} className="space-y-6">
              {/* Service selection */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Select Service / Price
                </label>

                {loadingService ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Loading pricing...
                  </div>
                ) : (
                  <select
                    value={selectedServiceId ?? ''}
                    onChange={(e) => setSelectedServiceId(Number(e.target.value))}
                    className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
                    disabled={services.length === 0}
                  >
                    {services.length === 0 ? (
                      <option value="">No active pricing configured</option>
                    ) : (
                      services.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name} — {formatMoney(Number(s.price))}
                        </option>
                      ))
                    )}
                  </select>
                )}

                {selectedService && (
                  <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                    {selectedService.description ?? 'No description provided.'}
                  </div>
                )}
              </div>

              {/* Amount display */}
              <div className="p-4 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                    Amount
                  </span>
                  <span className="text-lg font-extrabold text-gray-900 dark:text-white">
                    {selectedService ? formatMoney(Number(selectedService.price)) : '—'}
                  </span>
                </div>
                <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                  Currency: KES
                </div>
              </div>

              {/* Payment method */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-2">
                  Payment Method
                </label>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {METHOD_OPTIONS.map((m) => {
                    const Icon = m.icon;
                    const isSelected = selectedMethod === m.value;
                    return (
                      <button
                        key={m.value}
                        type="button"
                        onClick={() => setSelectedMethod(m.value)}
                        className={[
                          'p-4 rounded-xl border-2 text-left transition-all',
                          isSelected
                            ? `${m.border} ${m.bg} shadow-sm`
                            : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 hover:border-blue-300',
                        ].join(' ')}
                      >
                        <div className="flex items-center gap-2">
                          <Icon className={`w-5 h-5 ${m.color}`} />
                          <span className="font-bold text-gray-900 dark:text-white">
                            {m.label}
                          </span>
                        </div>
                        <div className="mt-2 text-xs text-gray-600 dark:text-gray-400">
                          {m.hint}
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Method-specific inputs */}
              {selectedMethod === PaymentMethod.MOBILE_MONEY && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Mobile Money Phone Number <span className="text-red-500">*</span>
                    </label>
                    <input
                      value={mpesaPhone}
                      onChange={(e) => setMpesaPhone(e.target.value)}
                      placeholder="e.g. +2547XXXXXXXX"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-green-500 transition-all"
                    />
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      We log this for audit + receipt. (STK push integration can be added here later.)
                    </div>
                  </div>
                </div>
              )}

              {(selectedMethod === PaymentMethod.CREDIT_CARD ||
                selectedMethod === PaymentMethod.INSURANCE ||
                selectedMethod === PaymentMethod.MOBILE_MONEY) && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Transaction Reference (optional)
                    </label>
                    <input
                      value={externalRef}
                      onChange={(e) => setExternalRef(e.target.value)}
                      placeholder="e.g. MPesa code / Insurance ref / Stripe ID"
                      className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                      Notes (optional)
                    </label>
                    <textarea
                      rows={3}
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      placeholder="Add any extra details for the cashier/admin..."
                      className="w-full px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white focus:outline-none focus:border-blue-500 transition-all resize-none"
                    />
                  </div>
                </div>
              )}

              {/* Footer Actions */}
              <div className="flex gap-3 pt-2">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  className="flex-1"
                  disabled={loading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  variant="primary"
                  className="flex-1"
                  loading={loading}
                >
                  {methodMeta?.label ? `Pay with ${methodMeta.label}` : 'Pay'}
                </Button>
              </div>

              {/* Small warning */}
              <div className="text-xs text-gray-500 dark:text-gray-400">
                By completing payment, your appointment becomes eligible for confirmation by Admin/Nurse.
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
