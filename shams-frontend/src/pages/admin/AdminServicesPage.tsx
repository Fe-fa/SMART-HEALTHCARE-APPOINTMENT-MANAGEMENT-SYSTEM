import React, { useEffect, useMemo, useState } from 'react';
import { Card } from '@components/common/Card/Card';
import { Button } from '@components/common/Button/Button';
import { Alert } from '@components/common/Alert/Alert';
import { Loader } from '@components/common/Loader/Loader';
import { servicesApiService } from '@services/api/services.service';
import type { Service, CreateServiceData, UpdateServiceData } from '@types';
import { AppointmentType } from '@types';
import {
  Plus,
  RefreshCw,
  Edit3,
  ToggleLeft,
  ToggleRight,
  Trash2,
  Tag,
} from 'lucide-react';

const money = (n: number) => `KES ${Number(n).toLocaleString()}`;

export const AdminServicesPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<number | null>(null);

  const [services, setServices] = useState<Service[]>([]);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  // modal-ish inline form state
  const [showForm, setShowForm] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);

  const [form, setForm] = useState<CreateServiceData>({
    name: '',
    description: '',
    price: 0,
    type: AppointmentType.CONSULTATION,
    isActive: true,
  });

  const grouped = useMemo(() => {
    const map = new Map<string, Service[]>();
    for (const s of services) {
      const key = s.type;
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [services]);

  const load = async () => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const list = await servicesApiService.getAll();
      setServices(list);
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Failed to load services');
      setServices([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const openCreate = () => {
    setEditing(null);
    setForm({
      name: '',
      description: '',
      price: 0,
      type: AppointmentType.CONSULTATION,
      isActive: true,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const openEdit = (s: Service) => {
    setEditing(s);
    setForm({
      name: s.name,
      description: s.description ?? '',
      price: Number(s.price),
      type: s.type,
      isActive: s.isActive,
    });
    setShowForm(true);
    setError('');
    setSuccess('');
  };

  const submit = async () => {
    setError('');
    setSuccess('');

    if (!form.name.trim()) {
      setError('Service name is required');
      return;
    }
    if (Number(form.price) < 0) {
      setError('Price must be >= 0');
      return;
    }

    try {
      if (editing) {
        const payload: UpdateServiceData = {
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          price: Number(form.price),
          type: form.type,
          isActive: form.isActive,
        };
        await servicesApiService.update(editing.id, payload);
        setSuccess('✅ Service updated');
      } else {
        const payload: CreateServiceData = {
          name: form.name.trim(),
          description: form.description?.trim() || undefined,
          price: Number(form.price),
          type: form.type,
          isActive: form.isActive,
        };
        await servicesApiService.create(payload);
        setSuccess('✅ Service created');
      }
      setShowForm(false);
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Save failed');
    }
  };

  const toggle = async (id: number) => {
    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      await servicesApiService.toggleActive(id);
      setSuccess('✅ Updated');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Toggle failed');
    } finally {
      setBusyId(null);
    }
  };

  const remove = async (id: number) => {
    const ok = window.confirm('Delete this service? If already used, it will be deactivated instead.');
    if (!ok) return;

    setBusyId(id);
    setError('');
    setSuccess('');
    try {
      await servicesApiService.delete(id);
      setSuccess('✅ Deleted/Deactivated');
      await load();
    } catch (e: any) {
      setError(e?.response?.data?.message ?? 'Delete failed');
    } finally {
      setBusyId(null);
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="min-h-screen bg-neutral-bg dark:bg-gray-950 p-6">
      <div className="flex items-start justify-between gap-3 mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Service Pricing</h1>
          <p className="text-neutral dark:text-gray-400">
            Admin configures payment types and amounts (Consultation, Laboratory, etc.)
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={load}>
            <RefreshCw className="w-4 h-4 mr-2" /> Refresh
          </Button>
          <Button variant="primary" onClick={openCreate} className="bg-[#0D47A1]">
            <Plus className="w-4 h-4 mr-2" /> Add Service
          </Button>
        </div>
      </div>

      {error && <Alert type="error" message={error} onClose={() => setError('')} />}
      {success && <Alert type="success" message={success} onClose={() => setSuccess('')} />}

      {showForm && (
        <Card className="mb-6 border-l-4 border-l-[#0D47A1]">
          <div className="flex items-center justify-between mb-4">
            <div className="font-bold text-gray-900 dark:text-white">
              {editing ? 'Edit Service' : 'Create Service'}
            </div>
            <Button variant="outline" onClick={() => setShowForm(false)}>
              Close
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Name</label>
              <input
                value={form.name}
                onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))}
                className="w-full mt-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                placeholder="e.g. General Consultation"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Type</label>
              <select
                value={form.type}
                onChange={(e) => setForm((p) => ({ ...p, type: e.target.value as AppointmentType }))}
                className="w-full mt-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
              >
                {Object.values(AppointmentType).map((t) => (
                  <option key={t} value={t}>
                    {t.replace(/_/g, ' ')}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">Price (KES)</label>
              <input
                type="number"
                value={form.price}
                onChange={(e) => setForm((p) => ({ ...p, price: Number(e.target.value) }))}
                className="w-full mt-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white"
                min={0}
              />
            </div>

            <div className="flex items-end gap-3">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Active
              </label>
              <input
                type="checkbox"
                checked={!!form.isActive}
                onChange={(e) => setForm((p) => ({ ...p, isActive: e.target.checked }))}
                className="w-5 h-5"
              />
            </div>

            <div className="md:col-span-2">
              <label className="text-sm font-semibold text-gray-700 dark:text-gray-300">
                Description (optional)
              </label>
              <textarea
                rows={3}
                value={form.description}
                onChange={(e) => setForm((p) => ({ ...p, description: e.target.value }))}
                className="w-full mt-1 px-4 py-2.5 border-2 border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-white resize-none"
                placeholder="Short description..."
              />
            </div>
          </div>

          <div className="flex gap-2 mt-5">
            <Button variant="outline" onClick={() => setShowForm(false)} className="flex-1">
              Cancel
            </Button>
            <Button variant="primary" onClick={submit} className="flex-1 bg-[#0D47A1]">
              {editing ? 'Save Changes' : 'Create'}
            </Button>
          </div>
        </Card>
      )}

      <Card title={`Services (${services.length})`} className="border-l-4 border-l-[#1976D2]">
        {services.length === 0 ? (
          <div className="text-sm text-neutral">No services configured.</div>
        ) : (
          <div className="space-y-4">
            {grouped.map(([type, list]) => (
              <div key={type} className="rounded-xl border border-gray-200 dark:border-gray-700 p-4">
                <div className="flex items-center gap-2 mb-3">
                  <Tag className="w-4 h-4 text-[#0D47A1]" />
                  <div className="font-extrabold text-gray-900 dark:text-white">
                    {type.replace(/_/g, ' ')}
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    ({list.length} configured)
                  </div>
                </div>

                <div className="space-y-2">
                  {list.map((s) => (
                    <div
                      key={s.id}
                      className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 p-3 rounded-xl bg-gray-50 dark:bg-gray-800/40 border border-gray-200 dark:border-gray-700"
                    >
                      <div className="min-w-0">
                        <div className="font-bold text-gray-900 dark:text-white truncate">
                          {s.name}{' '}
                          {!s.isActive && (
                            <span className="ml-2 text-xs font-bold text-red-600">
                              INACTIVE
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-600 dark:text-gray-400">
                          {money(Number(s.price))}
                        </div>
                        {s.description && (
                          <div className="text-xs text-gray-500 dark:text-gray-400 truncate">
                            {s.description}
                          </div>
                        )}
                      </div>

                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          onClick={() => openEdit(s)}
                          disabled={busyId === s.id}
                        >
                          <Edit3 className="w-4 h-4 mr-1" />
                          Edit
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => toggle(s.id)}
                          disabled={busyId === s.id}
                        >
                          {s.isActive ? (
                            <>
                              <ToggleRight className="w-4 h-4 mr-1 text-green-600" />
                              Active
                            </>
                          ) : (
                            <>
                              <ToggleLeft className="w-4 h-4 mr-1 text-red-600" />
                              Inactive
                            </>
                          )}
                        </Button>

                        <Button
                          variant="outline"
                          onClick={() => remove(s.id)}
                          disabled={busyId === s.id}
                          className="border-red-300 text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
    </div>
  );
};
