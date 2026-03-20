import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@components/common/Card/Card';
import { Loader } from '@components/common/Loader/Loader';
import { Button } from '@components/common/Button/Button';
import { Alert } from '@components/common/Alert/Alert';
import { paymentService } from '@services/api/payment.service';
import type { PaginatedResponse, Transaction, PaymentStats } from '@types';
import {
  RefreshCw,
  BarChart3,
  TrendingUp,
  CreditCard,
  Wallet,
  BadgeDollarSign,
  AlertCircle,
} from 'lucide-react';

const money = (n: number) => `KES ${Number(n).toLocaleString()}`;

export const AdminPaymentsPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [statsLoading, setStatsLoading] = useState(true);

  const [error, setError] = useState('');
  const [stats, setStats] = useState<PaymentStats | null>(null);

  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [pagination, setPagination] = useState<PaginatedResponse<Transaction>['pagination'] | null>(null);

  // filters
  const [status, setStatus] = useState<string>('');
  const [method, setMethod] = useState<string>('');

  const loadStats = async () => {
    setStatsLoading(true);
    try {
      const s = await paymentService.getStats();
      setStats(s);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load stats');
    } finally {
      setStatsLoading(false);
    }
  };

  const loadTransactions = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await paymentService.getTransactions({
        status: status || undefined,
        method: method || undefined,
        page: 1,
        limit: 25,
      });
      setTransactions(res.data ?? []);
      setPagination(res.pagination ?? null);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load transactions');
      setTransactions([]);
      setPagination(null);
    } finally {
      setLoading(false);
    }
  };

  const refreshAll = async () => {
    await Promise.all([loadStats(), loadTransactions()]);
  };

  useEffect(() => {
    void refreshAll();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    void loadTransactions();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status, method]);

  const revenueByMethod = useMemo(() => stats?.revenueByMethod ?? [], [stats]);

  if (loading && transactions.length === 0) return <Loader />;

  return (
    <div className="min-h-screen bg-neutral-bg dark:bg-gray-950 p-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Payments & Transactions</h1>
          <p className="text-neutral dark:text-gray-400">
            Master transactions ledger + payment reporting.
          </p>
        </div>
        <Button variant="outline" onClick={refreshAll}>
          <RefreshCw className="w-4 h-4 mr-2" /> Refresh
        </Button>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}

      {/* Stats */}
      <Card className="mb-6 border-l-4 border-l-[#0D47A1]">
        <div className="flex items-center gap-2 mb-4">
          <BarChart3 className="w-5 h-5 text-[#0D47A1]" />
          <div className="font-extrabold text-gray-900 dark:text-white">Overview</div>
          {statsLoading && <span className="text-xs text-gray-500">(loading)</span>}
        </div>

        {!stats ? (
          <div className="text-sm text-neutral">No stats available.</div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <TrendingUp className="w-4 h-4 text-green-600" />
                Total Revenue
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                {money(stats.totalRevenue)}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <BadgeDollarSign className="w-4 h-4 text-blue-600" />
                Completed
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                {stats.counts.completed}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Wallet className="w-4 h-4 text-amber-600" />
                Pending
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                {stats.counts.pending}
              </div>
            </div>

            <div className="p-4 rounded-xl bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700">
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <AlertCircle className="w-4 h-4 text-red-600" />
                Refunded / Failed
              </div>
              <div className="text-2xl font-extrabold text-gray-900 dark:text-white mt-1">
                {stats.counts.refunded + stats.counts.failed}
              </div>
            </div>
          </div>
        )}

        {stats && (
          <div className="mt-5">
            <div className="text-sm font-bold text-gray-900 dark:text-white mb-2 flex items-center gap-2">
              <CreditCard className="w-4 h-4 text-purple-600" />
              Revenue by Method
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              {revenueByMethod.map((m) => (
                <div
                  key={m.method}
                  className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700"
                >
                  <div className="text-xs text-gray-500">{m.method}</div>
                  <div className="font-extrabold text-gray-900 dark:text-white">
                    {money(Number(m._sum.amount ?? 0))}
                  </div>
                  <div className="text-xs text-gray-500">{m._count.id} txns</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </Card>

      {/* Filters + Ledger */}
      <Card title={`Transactions (${transactions.length})`} className="border-l-4 border-l-[#1976D2]">
        <div className="flex flex-col md:flex-row gap-3 mb-4">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Status</option>
            <option value="PENDING">PENDING</option>
            <option value="COMPLETED">COMPLETED</option>
            <option value="FAILED">FAILED</option>
            <option value="REFUNDED">REFUNDED</option>
          </select>

          <select
            value={method}
            onChange={(e) => setMethod(e.target.value)}
            className="px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
          >
            <option value="">All Methods</option>
            <option value="MOBILE_MONEY">MOBILE_MONEY</option>
            <option value="CASH">CASH</option>
            <option value="INSURANCE">INSURANCE</option>
            <option value="CREDIT_CARD">CREDIT_CARD</option>
          </select>

          {pagination && (
            <div className="ml-auto text-xs text-gray-500 flex items-center">
              Total: <span className="font-bold ml-1">{pagination.total}</span>
            </div>
          )}
        </div>

        {loading ? (
          <div className="text-sm text-neutral">Loading...</div>
        ) : transactions.length === 0 ? (
          <div className="text-sm text-neutral">No transactions found.</div>
        ) : (
          <div className="space-y-2">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700"
              >
                <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-2">
                  <div className="min-w-0">
                    <div className="font-extrabold text-gray-900 dark:text-white">
                      {t.referenceNumber}{' '}
                      <span className="text-xs font-bold text-gray-500 ml-2">
                        {t.status}
                      </span>
                    </div>

                    <div className="text-xs text-gray-500">
                      {new Date(t.createdAt).toLocaleString()} · {t.paymentMethod}
                    </div>

                    <div className="text-sm text-gray-700 dark:text-gray-300 mt-1">
                      Amount: <span className="font-bold">{money(Number(t.amount))}</span>
                      {t.service?.name ? (
                        <>
                          {' '}
                          · Service: <span className="font-semibold">{t.service.name}</span>
                        </>
                      ) : null}
                    </div>

                    {t.patient ? (
                      <div className="text-xs text-gray-500 mt-1">
                        Patient: {t.patient.firstName} {t.patient.lastName} ({t.patient.phone})
                      </div>
                    ) : null}

                    {t.externalRef ? (
                      <div className="text-xs text-gray-500 mt-1">
                        External Ref: <span className="font-semibold">{t.externalRef}</span>
                      </div>
                    ) : null}
                  </div>

                  <div className="text-sm font-extrabold text-gray-900 dark:text-white">
                    {money(Number(t.amount))}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
