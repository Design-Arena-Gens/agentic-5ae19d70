"use client";

import { useEffect, useMemo, useState } from 'react';
import { format } from 'date-fns';
import { create } from 'zustand';
import clsx from 'clsx';

// Types
export type Status = 'New' | 'Diagnosing' | 'Awaiting Parts' | 'In Progress' | 'Ready' | 'Picked Up' | 'Cancelled';
export interface Customer {
  id: string;
  name: string;
  phone?: string;
  email?: string;
}
export interface Technician {
  id: string;
  name: string;
}
export interface Device {
  id: string;
  type: string; // Laptop, Desktop, Phone, Tablet
  brand?: string;
  model?: string;
  serial?: string;
}
export interface Ticket {
  id: string;
  createdAt: string; // ISO
  updatedAt: string; // ISO
  customerId: string;
  deviceId: string;
  problemDescription: string;
  status: Status;
  technicianId?: string;
  estimatedCost?: number;
  notes?: string;
}

interface DataState {
  customers: Customer[];
  technicians: Technician[];
  devices: Device[];
  tickets: Ticket[];
  hydrate: () => void;
  save: () => void;
  addCustomer: (c: Omit<Customer, 'id'>) => void;
  addTechnician: (t: Omit<Technician, 'id'>) => void;
  addDevice: (d: Omit<Device, 'id'>) => void;
  addTicket: (t: Omit<Ticket, 'id' | 'createdAt' | 'updatedAt'>) => void;
  updateTicket: (id: string, updates: Partial<Ticket>) => void;
  removeTicket: (id: string) => void;
  importAll: (json: string) => string | null;
  exportAll: () => string;
}

const STORAGE_KEY = 'crm_local_storage_v1';

const useDataStore = create<DataState>((set, get) => ({
  customers: [],
  technicians: [],
  devices: [],
  tickets: [],
  hydrate: () => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw);
      set({
        customers: parsed.customers ?? [],
        technicians: parsed.technicians ?? [],
        devices: parsed.devices ?? [],
        tickets: parsed.tickets ?? [],
      });
    } catch (e) {
      console.error('Failed to hydrate', e);
    }
  },
  save: () => {
    const { customers, technicians, devices, tickets } = get();
    localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({ customers, technicians, devices, tickets }, null, 2)
    );
  },
  addCustomer: (c) =>
    set((s) => {
      const item = { id: crypto.randomUUID(), ...c } as Customer;
      const customers = [item, ...s.customers];
      const next = { ...s, customers };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers, technicians: s.technicians, devices: s.devices, tickets: s.tickets })
      );
      return next;
    }),
  addTechnician: (t) =>
    set((s) => {
      const item = { id: crypto.randomUUID(), ...t } as Technician;
      const technicians = [item, ...s.technicians];
      const next = { ...s, technicians };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers: s.customers, technicians, devices: s.devices, tickets: s.tickets })
      );
      return next;
    }),
  addDevice: (d) =>
    set((s) => {
      const item = { id: crypto.randomUUID(), ...d } as Device;
      const devices = [item, ...s.devices];
      const next = { ...s, devices };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers: s.customers, technicians: s.technicians, devices, tickets: s.tickets })
      );
      return next;
    }),
  addTicket: (t) =>
    set((s) => {
      const now = new Date().toISOString();
      const item: Ticket = { id: crypto.randomUUID(), createdAt: now, updatedAt: now, ...t };
      const tickets = [item, ...s.tickets];
      const next = { ...s, tickets };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers: s.customers, technicians: s.technicians, devices: s.devices, tickets })
      );
      return next;
    }),
  updateTicket: (id, updates) =>
    set((s) => {
      const tickets = s.tickets.map((tk) =>
        tk.id === id ? { ...tk, ...updates, updatedAt: new Date().toISOString() } : tk
      );
      const next = { ...s, tickets };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers: s.customers, technicians: s.technicians, devices: s.devices, tickets })
      );
      return next;
    }),
  removeTicket: (id) =>
    set((s) => {
      const tickets = s.tickets.filter((tk) => tk.id !== id);
      const next = { ...s, tickets };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers: s.customers, technicians: s.technicians, devices: s.devices, tickets })
      );
      return next;
    }),
  importAll: (json: string) => {
    try {
      const parsed = JSON.parse(json);
      const customers = parsed.customers ?? [];
      const technicians = parsed.technicians ?? [];
      const devices = parsed.devices ?? [];
      const tickets = parsed.tickets ?? [];
      set({ customers, technicians, devices, tickets });
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers, technicians, devices, tickets }, null, 2)
      );
      return null;
    } catch (e: any) {
      return e?.message ?? 'Invalid JSON';
    }
  },
  exportAll: () => {
    const { customers, technicians, devices, tickets } = get();
    return JSON.stringify({ customers, technicians, devices, tickets }, null, 2);
  },
}));

function Section({ title, children, right }: { title: string; children: React.ReactNode; right?: React.ReactNode }) {
  return (
    <section className="section">
      <div className="sectionHeader">
        <h2>{title}</h2>
        <div>{right}</div>
      </div>
      {children}
    </section>
  );
}

export default function HomePage() {
  const {
    customers,
    technicians,
    devices,
    tickets,
    hydrate,
    addCustomer,
    addTechnician,
    addDevice,
    addTicket,
    updateTicket,
    removeTicket,
    importAll,
    exportAll,
  } = useDataStore();

  const [filter, setFilter] = useState<Status | 'All'>('All');
  const [search, setSearch] = useState('');

  useEffect(() => {
    hydrate();
  }, [hydrate]);

  // Demo seed if empty
  useEffect(() => {
    if (customers.length === 0 && technicians.length === 0 && devices.length === 0 && tickets.length === 0) {
      const cust = { id: crypto.randomUUID(), name: 'John Doe', phone: '555-0100', email: 'john@example.com' };
      const tech = { id: crypto.randomUUID(), name: 'Alice' };
      const dev = { id: crypto.randomUUID(), type: 'Laptop', brand: 'Dell', model: 'XPS 13', serial: 'ABC123' };
      const now = new Date().toISOString();
      const tk: Ticket = {
        id: crypto.randomUUID(),
        createdAt: now,
        updatedAt: now,
        customerId: cust.id,
        deviceId: dev.id,
        problemDescription: 'Won\'t boot, possible SSD failure',
        status: 'Diagnosing',
        technicianId: tech.id,
        estimatedCost: 150,
        notes: 'Run diagnostics, check SSD health',
      };
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ customers: [cust], technicians: [tech], devices: [dev], tickets: [tk] }, null, 2)
      );
      hydrate();
    }
  }, [customers.length, devices.length, technicians.length, tickets.length, hydrate]);

  const filteredTickets = useMemo(() => {
    return tickets.filter((t) => {
      const statusOk = filter === 'All' || t.status === filter;
      if (!statusOk) return false;
      if (!search) return true;
      const cust = customers.find((c) => c.id === t.customerId);
      const dev = devices.find((d) => d.id === t.deviceId);
      const tech = technicians.find((u) => u.id === t.technicianId);
      const hay = [
        t.problemDescription,
        cust?.name,
        cust?.phone,
        cust?.email,
        dev?.brand,
        dev?.model,
        dev?.serial,
        tech?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return hay.includes(search.toLowerCase());
    });
  }, [tickets, filter, search, customers, devices, technicians]);

  // Form state
  const [newCustomer, setNewCustomer] = useState({ name: '', phone: '', email: '' });
  const [newTechnician, setNewTechnician] = useState({ name: '' });
  const [newDevice, setNewDevice] = useState({ type: 'Laptop', brand: '', model: '', serial: '' });
  const [newTicket, setNewTicket] = useState({ customerId: '', deviceId: '', problemDescription: '', status: 'New' as Status, technicianId: '', estimatedCost: '' });

  const [importText, setImportText] = useState('');
  const [showImport, setShowImport] = useState(false);

  return (
    <div className="grid">
      <Section
        title="Tickets"
        right={
          <div className="toolbar">
            <select value={filter} onChange={(e) => setFilter(e.target.value as any)}>
              {['All', 'New', 'Diagnosing', 'Awaiting Parts', 'In Progress', 'Ready', 'Picked Up', 'Cancelled'].map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
            <input className="input" placeholder="Search..." value={search} onChange={(e) => setSearch(e.target.value)} />
            <button className="btn" onClick={() => {
              const data = exportAll();
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `repair-data-${Date.now()}.json`;
              a.click();
              URL.revokeObjectURL(url);
            }}>Export</button>
            <button className="btn" onClick={() => setShowImport((s) => !s)}>{showImport ? 'Close Import' : 'Import'}</button>
          </div>
        }
      >
        {showImport && (
          <div className="card" style={{ marginBottom: 16 }}>
            <textarea
              className="textarea"
              placeholder="Paste exported JSON here"
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
            />
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end' }}>
              <button className="btn secondary" onClick={() => setImportText('')}>Clear</button>
              <button
                className="btn"
                onClick={() => {
                  const err = importAll(importText);
                  if (err) alert(err);
                  else setImportText('');
                }}
              >Import Data</button>
            </div>
          </div>
        )}

        <div className="list">
          {filteredTickets.map((t) => {
            const cust = customers.find((c) => c.id === t.customerId);
            const dev = devices.find((d) => d.id === t.deviceId);
            const tech = technicians.find((u) => u.id === t.technicianId);
            return (
              <div key={t.id} className="card">
                <div className="row between">
                  <div className="row gap">
                    <span className={clsx('badge', `status-${t.status.replace(/\s/g, '').toLowerCase()}`)}>{t.status}</span>
                    <strong>#{t.id.slice(0, 6)}</strong>
                  </div>
                  <div className="muted">Created {format(new Date(t.createdAt), 'PP p')}</div>
                </div>
                <div className="row gap wrap" style={{ marginTop: 8 }}>
                  <div>
                    <div className="label">Customer</div>
                    <div>{cust?.name} {cust?.phone ? `(${cust.phone})` : ''}</div>
                  </div>
                  <div>
                    <div className="label">Device</div>
                    <div>{dev?.type} {dev?.brand} {dev?.model} {dev?.serial ? `SN:${dev.serial}` : ''}</div>
                  </div>
                  <div>
                    <div className="label">Technician</div>
                    <div>{tech?.name ?? 'Unassigned'}</div>
                  </div>
                  <div>
                    <div className="label">Estimated Cost</div>
                    <div>{typeof t.estimatedCost === 'number' ? `$${t.estimatedCost.toFixed(2)}` : '?'}</div>
                  </div>
                </div>
                <p style={{ marginTop: 8 }}>{t.problemDescription}</p>
                {t.notes && <p className="muted">Notes: {t.notes}</p>}
                <div className="row gap wrap" style={{ marginTop: 12 }}>
                  <select value={t.status} onChange={(e) => updateTicket(t.id, { status: e.target.value as Status })}>
                    {['New', 'Diagnosing', 'Awaiting Parts', 'In Progress', 'Ready', 'Picked Up', 'Cancelled'].map((s) => (
                      <option key={s} value={s}>{s}</option>
                    ))}
                  </select>
                  <select value={t.technicianId ?? ''} onChange={(e) => updateTicket(t.id, { technicianId: e.target.value || undefined })}>
                    <option value="">Unassigned</option>
                    {technicians.map((x) => (
                      <option key={x.id} value={x.id}>{x.name}</option>
                    ))}
                  </select>
                  <input
                    className="input"
                    type="number"
                    placeholder="Estimated Cost"
                    value={t.estimatedCost ?? ''}
                    onChange={(e) => updateTicket(t.id, { estimatedCost: e.target.value ? Number(e.target.value) : undefined })}
                    style={{ maxWidth: 160 }}
                  />
                  <button className="btn danger" onClick={() => removeTicket(t.id)}>Delete</button>
                  <button className="btn secondary" onClick={() => window.print()}>Print</button>
                </div>
              </div>
            );
          })}
          {filteredTickets.length === 0 && (
            <div className="empty">No tickets found.</div>
          )}
        </div>
      </Section>

      <Section title="Create New Ticket">
        <div className="card">
          <div className="row gap wrap">
            <select value={newTicket.customerId} onChange={(e) => setNewTicket((s) => ({ ...s, customerId: e.target.value }))}>
              <option value="">Select Customer</option>
              {customers.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select value={newTicket.deviceId} onChange={(e) => setNewTicket((s) => ({ ...s, deviceId: e.target.value }))}>
              <option value="">Select Device</option>
              {devices.map((d) => (
                <option key={d.id} value={d.id}>{d.type} {d.brand} {d.model}</option>
              ))}
            </select>
            <select value={newTicket.technicianId} onChange={(e) => setNewTicket((s) => ({ ...s, technicianId: e.target.value }))}>
              <option value="">Assign Technician (optional)</option>
              {technicians.map((u) => (
                <option key={u.id} value={u.id}>{u.name}</option>
              ))}
            </select>
            <select value={newTicket.status} onChange={(e) => setNewTicket((s) => ({ ...s, status: e.target.value as Status }))}>
              {['New', 'Diagnosing', 'Awaiting Parts', 'In Progress', 'Ready', 'Picked Up', 'Cancelled'].map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            <input className="input" placeholder="Problem description" value={newTicket.problemDescription} onChange={(e) => setNewTicket((s) => ({ ...s, problemDescription: e.target.value }))} />
            <input className="input" type="number" placeholder="Estimated cost (optional)" value={newTicket.estimatedCost} onChange={(e) => setNewTicket((s) => ({ ...s, estimatedCost: e.target.value }))} />
          </div>
          <div className="row end" style={{ marginTop: 8 }}>
            <button
              className="btn"
              onClick={() => {
                if (!newTicket.customerId || !newTicket.deviceId || !newTicket.problemDescription) {
                  alert('Customer, device and description are required');
                  return;
                }
                addTicket({
                  customerId: newTicket.customerId,
                  deviceId: newTicket.deviceId,
                  problemDescription: newTicket.problemDescription,
                  status: newTicket.status,
                  technicianId: newTicket.technicianId || undefined,
                  estimatedCost: newTicket.estimatedCost ? Number(newTicket.estimatedCost) : undefined,
                  notes: undefined,
                });
                setNewTicket({ customerId: '', deviceId: '', problemDescription: '', status: 'New', technicianId: '', estimatedCost: '' });
              }}
            >Add Ticket</button>
          </div>
        </div>
      </Section>

      <Section title="Customers">
        <div className="card">
          <div className="row gap wrap">
            <input className="input" placeholder="Name" value={newCustomer.name} onChange={(e) => setNewCustomer((s) => ({ ...s, name: e.target.value }))} />
            <input className="input" placeholder="Phone" value={newCustomer.phone} onChange={(e) => setNewCustomer((s) => ({ ...s, phone: e.target.value }))} />
            <input className="input" placeholder="Email" value={newCustomer.email} onChange={(e) => setNewCustomer((s) => ({ ...s, email: e.target.value }))} />
            <button className="btn" onClick={() => {
              if (!newCustomer.name) return alert('Name required');
              addCustomer({ name: newCustomer.name, phone: newCustomer.phone || undefined, email: newCustomer.email || undefined });
              setNewCustomer({ name: '', phone: '', email: '' });
            }}>Add Customer</button>
          </div>
          <div className="list compact">
            {customers.map((c) => (
              <div key={c.id} className="row between item">
                <div>
                  <strong>{c.name}</strong> {c.phone && <span className="muted">({c.phone})</span>} {c.email && <span className="muted">{c.email}</span>}
                </div>
                <div className="muted">ID: {c.id.slice(0,6)}</div>
              </div>
            ))}
            {customers.length === 0 && <div className="empty">No customers yet.</div>}
          </div>
        </div>
      </Section>

      <Section title="Devices">
        <div className="card">
          <div className="row gap wrap">
            <select value={newDevice.type} onChange={(e) => setNewDevice((s) => ({ ...s, type: e.target.value }))}>
              {['Laptop', 'Desktop', 'Phone', 'Tablet', 'Other'].map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <input className="input" placeholder="Brand" value={newDevice.brand} onChange={(e) => setNewDevice((s) => ({ ...s, brand: e.target.value }))} />
            <input className="input" placeholder="Model" value={newDevice.model} onChange={(e) => setNewDevice((s) => ({ ...s, model: e.target.value }))} />
            <input className="input" placeholder="Serial" value={newDevice.serial} onChange={(e) => setNewDevice((s) => ({ ...s, serial: e.target.value }))} />
            <button className="btn" onClick={() => {
              if (!newDevice.type) return;
              addDevice({ type: newDevice.type, brand: newDevice.brand || undefined, model: newDevice.model || undefined, serial: newDevice.serial || undefined });
              setNewDevice({ type: 'Laptop', brand: '', model: '', serial: '' });
            }}>Add Device</button>
          </div>
          <div className="list compact">
            {devices.map((d) => (
              <div key={d.id} className="row between item">
                <div>{d.type} {d.brand} {d.model} {d.serial && <span className="muted">SN:{d.serial}</span>}</div>
                <div className="muted">ID: {d.id.slice(0,6)}</div>
              </div>
            ))}
            {devices.length === 0 && <div className="empty">No devices yet.</div>}
          </div>
        </div>
      </Section>

      <Section title="Technicians">
        <div className="card">
          <div className="row gap wrap">
            <input className="input" placeholder="Name" value={newTechnician.name} onChange={(e) => setNewTechnician((s) => ({ ...s, name: e.target.value }))} />
            <button className="btn" onClick={() => {
              if (!newTechnician.name) return;
              addTechnician({ name: newTechnician.name });
              setNewTechnician({ name: '' });
            }}>Add Technician</button>
          </div>
          <div className="list compact">
            {technicians.map((t) => (
              <div key={t.id} className="row between item">
                <div>{t.name}</div>
                <div className="muted">ID: {t.id.slice(0,6)}</div>
              </div>
            ))}
            {technicians.length === 0 && <div className="empty">No technicians yet.</div>}
          </div>
        </div>
      </Section>
    </div>
  );
}
