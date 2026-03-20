import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@components/common/Card/Card';
import { Loader } from '@components/common/Loader/Loader';
import { Button } from '@components/common/Button/Button';
import { Alert } from '@components/common/Alert/Alert';
import { appointmentService } from '@services/api/appointment.service';
import type { Appointment } from '@types';
import { PaymentModal } from '@components/modals/PaymentModal';
import {
  Calendar,
  CreditCard,
  AlertCircle,
  RefreshCw,
  Clock,
} from 'lucide-react';

const STATUS_STYLES: Record<string, { bg: string; text: string }> = {
  SCHEDULED:   { bg: 'bg-blue-100 dark:bg-blue-900/20',  text: 'text-blue-700 dark:text-blue-300' },
  CONFIRMED:   { bg: 'bg-green-100 dark:bg-green-900/20',text: 'text-green-700 dark:text-green-300' },
  IN_PROGRESS: { bg: 'bg-amber-100 dark:bg-amber-900/20',text: 'text-amber-700 dark:text-amber-300' },
  COMPLETED:   { bg: 'bg-teal-100 dark:bg-teal-900/20',  text: 'text-teal-700 dark:text-teal-300' },
  CANCELLED:   { bg: 'bg-gray-100 dark:bg-gray-800',     text: 'text-gray-500' },
  NO_SHOW:     { bg: 'bg-red-100 dark:bg-red-900/20',    text: 'text-red-700 dark:text-red-300' },
  RESCHEDULED: { bg: 'bg-amber-100 dark:bg-amber-900/20',text: 'text-amber-700 dark:text-amber-300' },
};

export const MyAppointmentsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [silentLoading, setSilentLoading] = useState(false);

  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const [appointments, setAppointments] = useState<Appointment[]>([]);

  // payment modal state
  const [payOpen, setPayOpen] = useState(false);
  const [payFor, setPayFor] = useState<Appointment | null>(null);

  const load = async (silent = false) => {
    try {
      silent ? setSilentLoading(true) : setLoading(true);
      setError('');
      const res = await appointmentService.getAll();
      setAppointments(res.data ?? []);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load appointments');
      setAppointments([]);
    } finally {
      setLoading(false);
      setSilentLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const unpaid = useMemo(() => {
    return appointments.filter((a: any) => {
      const p = a?.payment;
      return a.status !== 'CANCELLED' && a.status !== 'COMPLETED' && (!p || p.status !== 'COMPLETED');
    });
  }, [appointments]);

  const openPay = (apt: Appointment) => {
    setPayFor(apt);
    setPayOpen(true);
    setSuccess('');
    setError('');
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-neutral-bg dark:bg-gray-950 p-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">My Appointments</h1>
          <p className="text-neutral dark:text-gray-400">
            Pay immediately after booking to allow confirmation.
          </p>
        </div>
        <div className="flex items-center gap-2">
          {silentLoading && <RefreshCw className="w-4 h-4 animate-spin text-[#0D47A1]" />}
          <Button variant="outline" onClick={() => load(true)}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {unpaid.length > 0 && (
        <div className="mb-6 p-4 rounded-xl border border-amber-200 dark:border-amber-800 bg-amber-50 dark:bg-amber-900/20 flex gap-2">
          <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="text-sm text-amber-800 dark:text-amber-200">
            <strong>Payment Required:</strong> You have {unpaid.length} appointment(s) that are not yet paid.
            They cannot be confirmed until payment is completed.
          </div>
        </div>
      )}

      <Card title={`Appointments (${appointments.length})`} className="border-l-4 border-l-[#1976D2]">
        {appointments.length === 0 ? (
          <div className="text-center py-12">
            <Calendar className="w-16 h-16 text-gray-300 mx-auto mb-3" />
            <p className="text-neutral">No appointments found.</p>
          </div>
        ) : (
          <div className="space-y-3">
            {appointments.map((apt: any) => {
              const style = STATUS_STYLES[apt.status] ?? STATUS_STYLES.SCHEDULED;
              const apptDate = new Date(apt.appointmentDate);

              const paymentStatus = apt?.payment?.status ?? null;
              const isPaid = paymentStatus === 'COMPLETED';

              const canPay =
                apt.status !== 'CANCELLED' &&
                apt.status !== 'COMPLETED' &&
                !isPaid;

              return (
                <div
                  key={apt.id}
                  className="rounded-xl border-2 border-gray-200 dark:border-gray-700 p-4 hover:border-[#0D47A1]/40 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="flex flex-col items-center justify-center w-14 h-14 shrink-0
                                 bg-[#0D47A1]/10 rounded-xl border-l-4 border-l-[#0D47A1]"
                    >
                      <div className="text-xl font-extrabold text-gray-900 dark:text-white">
                        {apptDate.getDate()}
                      </div>
                      <div className="text-xs font-bold text-[#0D47A1] uppercase">
                        {apptDate.toLocaleDateString('en-US', { month: 'short' })}
                      </div>
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <div className="font-extrabold text-gray-900 dark:text-white truncate">
                            {apt.appointmentType?.replace(/_/g, ' ')}
                          </div>
                          <div className="text-sm text-gray-600 dark:text-gray-400 flex items-center gap-2 mt-1">
                            <Clock className="w-4 h-4" />
                            {apptDate.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
                            <span className="mx-1">·</span>
                            {apt.doctor
                              ? `Dr. ${apt.doctor.firstName} ${apt.doctor.lastName}`
                              : 'Doctor: Unassigned'}
                          </div>

                          <div className="text-xs mt-2 flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded-full font-bold ${style.bg} ${style.text}`}>
                              {apt.status}
                            </span>

                            <span className="flex items-center gap-1">
                              <CreditCard className="w-4 h-4" />
                              <span className={isPaid ? 'text-green-600 font-bold' : 'text-amber-600 font-bold'}>
                                {isPaid ? 'PAID' : 'UNPAID'}
                              </span>
                              {paymentStatus && (
                                <span className="text-gray-500 dark:text-gray-400">
                                  ({paymentStatus})
                                </span>
                              )}
                            </span>
                          </div>

                          {!isPaid && apt.status === 'SCHEDULED' && (
                            <div className="mt-2 text-xs text-amber-700 dark:text-amber-300">
                              ⚠️ Pay now to allow confirmation.
                            </div>
                          )}
                        </div>

                        <div className="flex flex-col gap-2 shrink-0">
                          {canPay && (
                            <Button
                              variant="primary"
                              className="bg-[#0D47A1]"
                              onClick={() => openPay(apt)}
                            >
                              <CreditCard className="w-4 h-4 mr-2" />
                              Pay Now
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </Card>

      {/* Payment Modal */}
      <PaymentModal
        isOpen={payOpen}
        onClose={() => setPayOpen(false)}
        appointment={payFor}
        onSuccess={(ref) => {
          setPayOpen(false);
          setSuccess(`✅ Payment completed. Ref: ${ref}`);
          void load(true);
        }}
      />
    </div>
  );
};
