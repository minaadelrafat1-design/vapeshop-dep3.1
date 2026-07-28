import { useState, useEffect } from 'react';
import { Search, Eye, Truck, CheckCircle2, XCircle, RotateCcw, DollarSign, Clock, MapPin } from 'lucide-react';
import { useAdminTable } from '@/hooks/useAdminTable';
import { AdminPageHeader } from '@/components/admin/AdminLayout';
import { DataTable, StatCard } from '@/components/admin/AdminComponents';
import { Badge, Skeleton } from '@/components/ui/Card';
import { Modal } from '@/components/ui/Modal';
import { Select } from '@/components/ui/Input';
import { Button } from '@/components/ui/Button';
import { useToast } from '@/context/ToastContext';
import { supabase } from '@/lib/supabase';
import type { Order, OrderItem, OrderTimelineEntry, OrderRefund, Branch } from '@/types';
import { formatCurrency, formatDateTime } from '@/lib/utils';

const ORDER_STATUSES = ['pending', 'processing', 'shipped', 'delivered', 'cancelled', 'refunded'] as const;

export default function AdminOrders() {
  const { rows, loading } = useAdminTable<Order>('orders', 'created_at', false);
  const { toast } = useToast();
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [sourceFilter, setSourceFilter] = useState('');
  const [selected, setSelected] = useState<Order | null>(null);
  const [items, setItems] = useState<OrderItem[]>([]);
  const [timeline, setTimeline] = useState<OrderTimelineEntry[]>([]);
  const [refunds, setRefunds] = useState<OrderRefund[]>([]);
  const [branches, setBranches] = useState<Record<string, Branch>>({});
  const [detailLoading, setDetailLoading] = useState(false);
  const [updating, setUpdating] = useState(false);
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('customer_request');

  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('branches').select('*');
      setBranches(Object.fromEntries((data ?? []).map((b) => [b.id, b])));
    })();
  }, []);

  const filtered = rows.filter((o) => {
    const matchesQuery = [o.order_number, o.status, o.source].join(' ').toLowerCase().includes(query.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const matchesSource = !sourceFilter || o.source === sourceFilter;
    return matchesQuery && matchesStatus && matchesSource;
  });

  const totalRevenue = rows.filter((o) => o.status !== 'cancelled' && o.status !== 'refunded').reduce((s, o) => s + Number(o.grand_total), 0);
  const pendingCount = rows.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const deliveredCount = rows.filter((o) => o.status === 'delivered').length;
  const cancelledCount = rows.filter((o) => o.status === 'cancelled').length;

  const view = async (o: Order) => {
    setSelected(o);
    setDetailLoading(true);
    const [itemsRes, timelineRes, refundsRes] = await Promise.all([
      supabase.from('order_items').select('*').eq('order_id', o.id),
      supabase.from('order_timeline').select('*').eq('order_id', o.id).order('created_at', { ascending: true }),
      supabase.from('order_refunds').select('*').eq('order_id', o.id).order('created_at', { ascending: false }),
    ]);
    setItems((itemsRes.data ?? []) as OrderItem[]);
    setTimeline((timelineRes.data ?? []) as OrderTimelineEntry[]);
    setRefunds((refundsRes.data ?? []) as OrderRefund[]);
    setDetailLoading(false);
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    const { error } = await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: status });
    setUpdating(false);
    if (error) toast('Could not update status', 'error');
    else {
      toast(`Order marked as ${status}`, 'success');
      setSelected((prev) => (prev ? { ...prev, status: status as Order['status'] } : prev));
      setTimeline((prev) => [...prev, {
        id: crypto.randomUUID(), order_id: orderId, event: 'status_changed',
        description: `Status changed to ${status}`, actor_id: null, metadata: null, created_at: new Date().toISOString(),
      }]);
    }
  };

  const cancelOrder = async (orderId: string) => {
    setUpdating(true);
    const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
    setUpdating(false);
    if (error) toast('Could not cancel order', 'error');
    else {
      toast('Order cancelled — inventory restored', 'success');
      setSelected((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
    }
  };

  const issueRefund = async () => {
    if (!selected || !refundAmount) return;
    setUpdating(true);
    const { error } = await supabase.rpc('issue_refund', {
      p_order_id: selected.id, p_amount: parseFloat(refundAmount), p_reason: refundReason,
    });
    setUpdating(false);
    if (error) toast('Could not issue refund', 'error');
    else {
      toast('Refund issued', 'success');
      setRefundModal(false);
      setRefundAmount('');
      view(selected);
    }
  };

  const EVENT_ICONS: Record<string, typeof Clock> = {
    created: Clock, paid: CheckCircle2, payment_failed: XCircle, shipped: Truck,
    delivered: MapPin, cancelled: XCircle, returned: RotateCcw, refund_issued: DollarSign,
    processing: Clock, fulfilled: CheckCircle2, status_changed: Clock,
  };

  return (
    <div>
      <AdminPageHeader title="Orders" subtitle={`${rows.length} total orders`} />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />) : (
          <>
            <StatCard icon={DollarSign} label="Revenue" value={formatCurrency(totalRevenue)} accent="gold" />
            <StatCard icon={Clock} label="Pending" value={pendingCount} accent="warning" />
            <StatCard icon={CheckCircle2} label="Delivered" value={deliveredCount} accent="accent" />
            <StatCard icon={XCircle} label="Cancelled" value={cancelledCount} accent="error" />
          </>
        )}
      </div>

      <div className="flex flex-wrap gap-3 mb-4">
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search orders…" className="input pl-11" />
        </div>
        <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
          <option value="">All statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </Select>
        <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="w-auto">
          <option value="">All sources</option>
          <option value="website">Website</option>
          <option value="pos">POS / Branch</option>
          <option value="phone">Phone</option>
        </Select>
      </div>

      <DataTable<Order>
        loading={loading}
        rows={filtered}
        columns={[
          { key: 'order_number', label: 'Order #', render: (o) => <span className="font-mono text-gold-300">{o.order_number}</span> },
          { key: 'source', label: 'Source', render: (o) => <Badge color={o.source === 'pos' ? 'accent' : 'neutral'}>{o.source === 'pos' ? 'Branch' : o.source}</Badge> },
          { key: 'placed_at', label: 'Date', render: (o) => <span className="text-ink-300 text-xs">{formatDateTime(o.placed_at)}</span> },
          { key: 'status', label: 'Status', render: (o) => <Badge color={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'error' : o.status === 'refunded' ? 'warning' : 'gold'}>{o.status}</Badge> },
          { key: 'payment_status', label: 'Payment', render: (o) => <Badge color={o.payment_status === 'paid' ? 'accent' : 'warning'}>{o.payment_status}</Badge> },
          { key: 'branch_id', label: 'Branch', render: (o) => <span className="text-ink-400 text-xs">{o.branch_id ? (branches[o.branch_id]?.name ?? '—') : '—'}</span> },
          { key: 'grand_total', label: 'Total', render: (o) => <span className="font-semibold text-ink-100">{formatCurrency(o.grand_total)}</span> },
          { key: 'actions', label: '', render: (o) => <button onClick={() => view(o)} className="text-gold-300 hover:text-gold-200"><Eye className="w-4 h-4" /></button> },
        ]}
      />

      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.order_number ?? ''}`} size="xl">
        {selected && (
          <div className="space-y-5">
            {/* Status & actions */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-ink-500 uppercase mb-2">Order Status</p>
                <div className="flex items-center gap-2 flex-wrap">
                  <Badge color={selected.status === 'delivered' ? 'success' : selected.status === 'cancelled' ? 'error' : 'gold'}>{selected.status}</Badge>
                  <Badge color={selected.payment_status === 'paid' ? 'accent' : 'warning'}>{selected.payment_status}</Badge>
                  <Badge color="neutral">{selected.source}</Badge>
                </div>
                {selected.branch_id && <p className="text-xs text-ink-400 mt-2">Branch: {branches[selected.branch_id]?.name ?? '—'}</p>}
              </div>
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-ink-500 uppercase mb-2">Total</p>
                <p className="text-2xl font-bold text-gold-300">{formatCurrency(selected.grand_total)}</p>
                <p className="text-xs text-ink-400 mt-1">Placed {formatDateTime(selected.placed_at)}</p>
              </div>
            </div>

            {/* Action buttons */}
            {selected.status !== 'cancelled' && selected.status !== 'refunded' && (
              <div className="flex flex-wrap gap-2">
                <Select value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)} className="w-auto" disabled={updating}>
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Button variant="secondary" size="sm" onClick={() => setRefundModal(true)}><DollarSign className="w-4 h-4" /> Issue Refund</Button>
                <Button variant="ghost" size="sm" onClick={() => cancelOrder(selected.id)} disabled={updating}><XCircle className="w-4 h-4" /> Cancel</Button>
              </div>
            )}

            {selected.tracking_number && (
              <div className="glass rounded-xl p-4">
                <p className="text-xs text-ink-500 uppercase mb-1">Tracking</p>
                <p className="text-ink-100">{selected.carrier ?? ''} {selected.tracking_number}</p>
              </div>
            )}

            {/* Items */}
            <div>
              <h4 className="font-semibold text-ink-50 mb-2">Items</h4>
              <div className="space-y-2">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between text-sm border-b border-white/5 pb-2">
                    <div><p className="text-ink-100">{it.product_name}</p>{it.variant_name && <p className="text-ink-400 text-xs">{it.variant_name}</p>}<p className="text-ink-400 text-xs">Qty {it.quantity} × {formatCurrency(it.price)}</p></div>
                    <span className="text-ink-100">{formatCurrency(it.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Refunds */}
            {refunds.length > 0 && (
              <div>
                <h4 className="font-semibold text-ink-50 mb-2">Refunds</h4>
                <div className="space-y-2">
                  {refunds.map((r) => (
                    <div key={r.id} className="flex justify-between text-sm border-b border-white/5 pb-2">
                      <div><p className="font-mono text-gold-300">{r.refund_number}</p><p className="text-ink-400 text-xs">{formatDateTime(r.created_at)} · {r.reason}</p></div>
                      <div className="flex items-center gap-2"><Badge color={r.status === 'completed' ? 'accent' : 'warning'}>{r.status}</Badge><span className="text-ink-100">{formatCurrency(r.amount)}</span></div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline */}
            <div>
              <h4 className="font-semibold text-ink-50 mb-3">Order Timeline</h4>
              {detailLoading ? <Skeleton className="h-32" /> : timeline.length === 0 ? (
                <p className="text-ink-400 text-sm">No timeline events recorded.</p>
              ) : (
                <div className="space-y-3">
                  {timeline.map((t) => {
                    const Icon = EVENT_ICONS[t.event] ?? Clock;
                    return (
                      <div key={t.id} className="flex items-start gap-3">
                        <div className="w-8 h-8 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-400 shrink-0">
                          <Icon className="w-4 h-4" />
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium text-ink-100 capitalize">{t.event.replace(/_/g, ' ')}</p>
                          {t.description && <p className="text-xs text-ink-400">{t.description}</p>}
                          <p className="text-xs text-ink-500 mt-0.5">{formatDateTime(t.created_at)}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </Modal>

      {/* Refund modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Issue Refund" size="sm">
        <div className="space-y-4">
          <div className="glass rounded-xl p-3"><p className="text-xs text-ink-500">Order Total</p><p className="text-lg font-bold text-gold-300">{selected ? formatCurrency(selected.grand_total) : '—'}</p></div>
          <div>
            <label className="label">Refund Amount ($)</label>
            <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(e.target.value)} placeholder="0.00" className="input" />
          </div>
          <div>
            <label className="label">Reason</label>
            <select value={refundReason} onChange={(e) => setRefundReason(e.target.value)} className="input">
              <option value="customer_request">Customer Request</option>
              <option value="damaged_goods">Damaged Goods</option>
              <option value="wrong_item">Wrong Item</option>
              <option value="overcharge">Overcharge</option>
              <option value="cancellation">Cancellation</option>
              <option value="other">Other</option>
            </select>
          </div>
          <Button onClick={issueRefund} disabled={updating || !refundAmount} className="w-full"><DollarSign className="w-4 h-4" /> {updating ? 'Processing…' : 'Issue Refund'}</Button>
        </div>
      </Modal>
    </div>
  );
}
