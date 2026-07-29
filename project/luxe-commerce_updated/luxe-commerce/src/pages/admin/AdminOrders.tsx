import { useState, useEffect } from 'react';
import { 
  Search, Eye, Truck, CheckCircle2, XCircle, RotateCcw, 
  DollarSign, Clock, MapPin, User, Mail, Phone, Edit3, RefreshCw 
} from 'lucide-react';
import { useAdminTable } from '@/hooks/useAdminTable';
import { useBarcodeScanner } from '@/hooks/useBarcodeScanner';
import { queueOfflineSale, syncOfflineSales } from '@/lib/offlineSync';
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
  const { rows, loading, refetch } = useAdminTable<Order>('orders', 'created_at', false);
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

  // Refund Modal State
  const [refundModal, setRefundModal] = useState(false);
  const [refundAmount, setRefundAmount] = useState('');
  const [refundReason, setRefundReason] = useState('customer_request');

  // Tracking Modal State
  const [trackingModal, setTrackingModal] = useState(false);
  const [carrier, setCarrier] = useState('');
  const [trackingNumber, setTrackingNumber] = useState('');
 // Generic POS / Manual Order Checkout Handler (Supports Offline Sync & Supabase RPC)
const handleCheckout = async (
  items: Array<{ product_id: string; variant_id?: string; quantity: number; unit_price: number }>,
  branchId?: string,
  customerId?: string | null,
  discountAmount: number = 0,
  taxAmount: number = 0,
  paymentMethod: string = 'cash'
) => {
  if (!items || items.length === 0) {
    toast('No items to checkout', 'error');
    return;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const payload = {
    p_branch_id: branchId || Object.keys(branches)[0] || '',
    p_cashier_id: user?.id || '',
    p_customer_id: customerId || null,
    p_items: items.map((item) => ({
      product_id: item.product_id,
      variant_id: item.variant_id || null,
      quantity: item.quantity,
      unit_price: item.unit_price,
      batch_number: null,
      serial_number: null,
    })),
    p_discount_amount: discountAmount,
    p_tax_amount: taxAmount,
    p_payment_method: paymentMethod,
  };

  // 1. Offline Mode: Save to IndexedDB if network drops
  if (!navigator.onLine) {
    try {
      await queueOfflineSale(payload);
      toast('Offline mode active: Order queued locally! It will sync when connected.', 'warning');
    } catch (err) {
      toast('Failed to save offline sale locally', 'error');
    }
    return;
  }

  // 2. Online Mode: Execute Atomic RPC Checkout
  try {
    const { data, error } = await supabase.rpc('process_pos_checkout', payload);

    if (error) {
      toast(`Checkout error: ${error.message}`, 'error');
      return;
    }

    toast(`Order #${data.order_number} successfully processed!`, 'success');
    refetch(); // Reload orders table
  } catch (err: any) {
    toast(`Unexpected checkout error: ${err.message}`, 'error');
  }
};
  useEffect(() => {
    (async () => {
      const { data } = await supabase.from('branches').select('*');
      setBranches(Object.fromEntries((data ?? []).map((b) => [b.id, b])));
    })();
  }, []);
// 1. Listen for standard USB/Bluetooth barcode scanner input
useBarcodeScanner({
  onScan: async (scannedCode) => {
    // Look up product by barcode, QR code, or SKU via Supabase RPC
    const { data, error } = await supabase.rpc('lookup_product_by_code', {
      p_code: scannedCode,
    });

    if (error || !data || data.length === 0) {
      toast(`No product found for barcode: ${scannedCode}`, 'error');
      return;
    }

    const item = data[0];
    toast(`Scanned: ${item.name} (${formatCurrency(item.price)})`, 'success');

    // If an order detail modal is currently open or a checkout cart is active, 
    // update your selection/cart here.
  },
});
  const filtered = rows.filter((o) => {
    const matchesQuery = [o.order_number, o.status, o.source, o.customer_name ?? '', o.customer_email ?? '']
      .join(' ')
      .toLowerCase()
      .includes(query.toLowerCase());
    const matchesStatus = !statusFilter || o.status === statusFilter;
    const matchesSource = !sourceFilter || o.source === sourceFilter;
    return matchesQuery && matchesStatus && matchesSource;
  });

  const totalRevenue = rows
    .filter((o) => o.status !== 'cancelled' && o.status !== 'refunded')
    .reduce((s, o) => s + Number(o.grand_total), 0);
  const pendingCount = rows.filter((o) => o.status === 'pending' || o.status === 'processing').length;
  const deliveredCount = rows.filter((o) => o.status === 'delivered').length;
  const cancelledCount = rows.filter((o) => o.status === 'cancelled').length;

  const view = async (o: Order) => {
    setSelected(o);
    setCarrier(o.carrier ?? '');
    setTrackingNumber(o.tracking_number ?? '');
    setDetailLoading(true);
    try {
      const [itemsRes, timelineRes, refundsRes] = await Promise.all([
        supabase.from('order_items').select('*').eq('order_id', o.id),
        supabase.from('order_timeline').select('*').eq('order_id', o.id).order('created_at', { ascending: true }),
        supabase.from('order_refunds').select('*').eq('order_id', o.id).order('created_at', { ascending: false }),
      ]);
      setItems((itemsRes.data ?? []) as OrderItem[]);
      setTimeline((timelineRes.data ?? []) as OrderTimelineEntry[]);
      setRefunds((refundsRes.data ?? []) as OrderRefund[]);
    } catch (err) {
      console.error('Failed to load order details:', err);
    } finally {
      setDetailLoading(false);
    }
  };

  const updateStatus = async (orderId: string, status: string) => {
    setUpdating(true);
    const { error } = await supabase.rpc('update_order_status', { p_order_id: orderId, p_status: status });
    setUpdating(false);
    if (error) {
      toast('Could not update status: ' + error.message, 'error');
    } else {
      toast(`Order marked as ${status}`, 'success');
      setSelected((prev) => (prev ? { ...prev, status: status as Order['status'] } : prev));
      refetch();
      if (selected) view({ ...selected, status: status as Order['status'] });
    }
  };

  const cancelOrder = async (orderId: string) => {
    if (!confirm('Are you sure you want to cancel this order? Stock will be restored.')) return;
    setUpdating(true);
    const { error } = await supabase.rpc('cancel_order', { p_order_id: orderId });
    setUpdating(false);
    if (error) {
      toast('Could not cancel order: ' + error.message, 'error');
    } else {
      toast('Order cancelled — inventory restored', 'success');
      setSelected((prev) => (prev ? { ...prev, status: 'cancelled' } : prev));
      refetch();
      if (selected) view({ ...selected, status: 'cancelled' });
    }
  };

  const issueRefund = async () => {
    if (!selected || !refundAmount) return;
    const numericAmount = parseFloat(refundAmount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      toast('Please enter a valid refund amount', 'error');
      return;
    }

    setUpdating(true);
    const { error } = await supabase.rpc('issue_refund', {
      p_order_id: selected.id,
      p_amount: numericAmount,
      p_reason: refundReason,
    });
    setUpdating(false);

    if (error) {
      toast('Could not issue refund: ' + error.message, 'error');
    } else {
      toast('Refund issued successfully', 'success');
      setRefundModal(false);
      setRefundAmount('');
      refetch();
      view(selected);
    }
  };

  const updateTracking = async () => {
    if (!selected) return;
    setUpdating(true);
    const { error } = await supabase
      .from('orders')
      .update({ carrier, tracking_number: trackingNumber, status: 'shipped' })
      .eq('id', selected.id);

    setUpdating(false);
    if (error) {
      toast('Could not update tracking: ' + error.message, 'error');
    } else {
      toast('Tracking details updated', 'success');
      setTrackingModal(false);
      refetch();
      view({ ...selected, carrier, tracking_number: trackingNumber, status: 'shipped' });
    }
  };

  const EVENT_ICONS: Record<string, typeof Clock> = {
    created: Clock,
    paid: CheckCircle2,
    payment_failed: XCircle,
    shipped: Truck,
    delivered: MapPin,
    cancelled: XCircle,
    returned: RotateCcw,
    refund_issued: DollarSign,
    processing: Clock,
    fulfilled: CheckCircle2,
    status_changed: Clock,
  };

  return (
    <div>
      <AdminPageHeader title="Orders" subtitle={`${rows.length} total orders recorded`} />

      {/* KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28" />)
        ) : (
          <>
            <StatCard icon={DollarSign} label="Net Revenue" value={formatCurrency(totalRevenue)} accent="gold" />
            <StatCard icon={Clock} label="Pending / Processing" value={pendingCount} accent="warning" />
            <StatCard icon={CheckCircle2} label="Delivered" value={deliveredCount} accent="accent" />
            <StatCard icon={XCircle} label="Cancelled" value={cancelledCount} accent="error" />
          </>
        )}
      </div>

      {/* Controls & Search */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex flex-wrap items-center gap-3 flex-1">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-ink-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search by order #, customer, or status…"
              className="input pl-11"
            />
          </div>
          <Select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="w-auto">
            <option value="">All statuses</option>
            {ORDER_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </Select>
          <Select value={sourceFilter} onChange={(e) => setSourceFilter(e.target.value)} className="w-auto">
            <option value="">All sources</option>
            <option value="website">Website</option>
            <option value="pos">POS / Branch</option>
            <option value="phone">Phone</option>
          </Select>
        </div>

        <button onClick={() => refetch()} className="btn-secondary py-2 px-2.5 text-xs" title="Refresh">
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Main Table */}
      <DataTable<Order>
        loading={loading}
        rows={filtered}
        columns={[
          { key: 'order_number', label: 'Order #', render: (o) => <span className="font-mono text-gold-300 font-medium">{o.order_number}</span> },
          { key: 'customer', label: 'Customer', render: (o) => (
            <div>
              <p className="text-sm font-medium text-ink-100">{o.customer_name ?? 'Guest'}</p>
              <p className="text-xs text-ink-400">{o.customer_email ?? '—'}</p>
            </div>
          )},
          { key: 'source', label: 'Source', render: (o) => <Badge color={o.source === 'pos' ? 'accent' : 'neutral'}>{o.source === 'pos' ? 'Branch' : o.source}</Badge> },
          { key: 'placed_at', label: 'Date', render: (o) => <span className="text-ink-300 text-xs">{formatDateTime(o.placed_at)}</span> },
          { key: 'status', label: 'Status', render: (o) => <Badge color={o.status === 'delivered' ? 'success' : o.status === 'cancelled' ? 'error' : o.status === 'refunded' ? 'warning' : 'gold'}>{o.status}</Badge> },
          { key: 'payment_status', label: 'Payment', render: (o) => <Badge color={o.payment_status === 'paid' ? 'accent' : 'warning'}>{o.payment_status}</Badge> },
          { key: 'branch_id', label: 'Branch', render: (o) => <span className="text-ink-400 text-xs">{o.branch_id ? (branches[o.branch_id]?.name ?? '—') : '—'}</span> },
          { key: 'grand_total', label: 'Total', render: (o) => <span className="font-semibold text-ink-100">{formatCurrency(o.grand_total)}</span> },
          { key: 'actions', label: '', render: (o) => <button onClick={() => view(o)} className="text-gold-300 hover:text-gold-200 p-1"><Eye className="w-4 h-4" /></button> },
        ]}
      />

      {/* Order Detail Modal */}
      <Modal open={!!selected} onClose={() => setSelected(null)} title={`Order ${selected?.order_number ?? ''}`} size="xl">
        {selected && (
          <div className="space-y-5">
            {/* Summary Banner */}
            <div className="grid sm:grid-cols-3 gap-4">
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
                <p className="text-xs text-ink-500 uppercase mb-2">Customer</p>
                <p className="text-sm font-semibold text-ink-100 flex items-center gap-1.5"><User className="w-3.5 h-3.5 text-gold-400" /> {selected.customer_name ?? 'Guest'}</p>
                {selected.customer_email && <p className="text-xs text-ink-400 flex items-center gap-1.5 mt-1"><Mail className="w-3.5 h-3.5 text-ink-500" /> {selected.customer_email}</p>}
                {selected.customer_phone && <p className="text-xs text-ink-400 flex items-center gap-1.5 mt-1"><Phone className="w-3.5 h-3.5 text-ink-500" /> {selected.customer_phone}</p>}
              </div>

              <div className="glass rounded-xl p-4">
                <p className="text-xs text-ink-500 uppercase mb-2">Total & Date</p>
                <p className="text-2xl font-bold text-gold-300">{formatCurrency(selected.grand_total)}</p>
                <p className="text-xs text-ink-400 mt-1">Placed {formatDateTime(selected.placed_at)}</p>
              </div>
            </div>

            {/* Action Bar */}
            {selected.status !== 'cancelled' && selected.status !== 'refunded' && (
              <div className="flex flex-wrap items-center gap-2 pt-2 border-t border-white/5">
                <span className="text-xs text-ink-400 font-medium mr-2">Change Status:</span>
                <Select value={selected.status} onChange={(e) => updateStatus(selected.id, e.target.value)} className="w-auto text-xs py-1" disabled={updating}>
                  {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
                </Select>
                <Button variant="secondary" size="sm" onClick={() => setTrackingModal(true)}>
                  <Truck className="w-3.5 h-3.5" /> Shipment & Tracking
                </Button>
                <Button variant="secondary" size="sm" onClick={() => setRefundModal(true)}>
                  <DollarSign className="w-3.5 h-3.5" /> Issue Refund
                </Button>
                <Button variant="ghost" size="sm" onClick={() => cancelOrder(selected.id)} disabled={updating} className="text-error-400 hover:text-error-300">
                  <XCircle className="w-3.5 h-3.5" /> Cancel Order
                </Button>
              </div>
            )}

            {/* Tracking Info Panel */}
            {selected.tracking_number && (
              <div className="glass rounded-xl p-4 flex items-center justify-between">
                <div>
                  <p className="text-xs text-ink-500 uppercase mb-1">Shipment Tracking</p>
                  <p className="text-sm text-ink-100 font-mono"><span className="text-ink-400 font-sans">{selected.carrier ?? 'Carrier'}:</span> {selected.tracking_number}</p>
                </div>
                <button onClick={() => setTrackingModal(true)} className="text-gold-300 hover:text-gold-200 text-xs flex items-center gap-1">
                  <Edit3 className="w-3.5 h-3.5" /> Edit
                </button>
              </div>
            )}

            {/* Line Items */}
            <div>
              <h4 className="font-semibold text-ink-50 mb-2">Order Items</h4>
              <div className="space-y-2 glass rounded-xl p-4">
                {items.map((it) => (
                  <div key={it.id} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                    <div>
                      <p className="text-ink-100 font-medium">{it.product_name}</p>
                      {it.variant_name && <p className="text-ink-400 text-xs">{it.variant_name}</p>}
                      <p className="text-ink-400 text-xs">Qty {it.quantity} × {formatCurrency(it.price)}</p>
                    </div>
                    <span className="text-ink-100 font-semibold">{formatCurrency(it.line_total)}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Refund Log */}
            {refunds.length > 0 && (
              <div>
                <h4 className="font-semibold text-ink-50 mb-2">Refund History</h4>
                <div className="space-y-2 glass rounded-xl p-4">
                  {refunds.map((r) => (
                    <div key={r.id} className="flex justify-between items-center text-sm border-b border-white/5 last:border-0 pb-2 last:pb-0">
                      <div>
                        <p className="font-mono text-gold-300 text-xs">{r.refund_number}</p>
                        <p className="text-ink-400 text-xs">{formatDateTime(r.created_at)} · Reason: {r.reason}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge color={r.status === 'completed' ? 'accent' : 'warning'}>{r.status}</Badge>
                        <span className="text-ink-100 font-semibold">{formatCurrency(r.amount)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Timeline Log */}
            <div>
              <h4 className="font-semibold text-ink-50 mb-3">Order History & Timeline</h4>
              {detailLoading ? (
                <Skeleton className="h-32" />
              ) : timeline.length === 0 ? (
                <p className="text-ink-400 text-sm">No timeline events recorded.</p>
              ) : (
                <div className="space-y-3 glass rounded-xl p-4">
                  {timeline.map((t) => {
                    const Icon = EVENT_ICONS[t.event] ?? Clock;
                    return (
                      <div key={t.id} className="flex items-start gap-3">
                        <div className="w-7 h-7 rounded-full bg-gold-500/10 flex items-center justify-center text-gold-400 shrink-0 mt-0.5">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1">
                          <p className="text-xs font-medium text-ink-100 capitalize">{t.event.replace(/_/g, ' ')}</p>
                          {t.description && <p className="text-xs text-ink-400">{t.description}</p>}
                          <p className="text-[10px] text-ink-500 mt-0.5">{formatDateTime(t.created_at)}</p>
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

      {/* Issue Refund Modal */}
      <Modal open={refundModal} onClose={() => setRefundModal(false)} title="Issue Refund" size="sm">
        <div className="space-y-4">
          <div className="glass rounded-xl p-3">
            <p className="text-xs text-ink-500">Order Grand Total</p>
            <p className="text-lg font-bold text-gold-300">{selected ? formatCurrency(selected.grand_total) : '—'}</p>
          </div>
          <div>
            <label className="label">Refund Amount ($)</label>
            <input
              type="number"
              step="0.01"
              max={selected?.grand_total}
              value={refundAmount}
              onChange={(e) => setRefundAmount(e.target.value)}
              placeholder="0.00"
              className="input"
            />
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
          <Button onClick={issueRefund} disabled={updating || !refundAmount} className="w-full">
            <DollarSign className="w-4 h-4" /> {updating ? 'Processing…' : 'Issue Refund'}
          </Button>
        </div>
      </Modal>

      {/* Shipment & Tracking Modal */}
      <Modal open={trackingModal} onClose={() => setTrackingModal(false)} title="Update Shipment & Tracking" size="sm">
        <div className="space-y-4">
          <div>
            <label className="label">Carrier Name</label>
            <input
              value={carrier}
              onChange={(e) => setCarrier(e.target.value)}
              placeholder="e.g. DHL, FedEx, Aramex"
              className="input"
            />
          </div>
          <div>
            <label className="label">Tracking Number</label>
            <input
              value={trackingNumber}
              onChange={(e) => setTrackingNumber(e.target.value)}
              placeholder="Enter tracking number"
              className="input"
            />
          </div>
          <Button onClick={updateTracking} disabled={updating || !trackingNumber} className="w-full">
            <Truck className="w-4 h-4" /> {updating ? 'Saving…' : 'Save Shipment Details'}
          </Button>
        </div>
      </Modal>
    </div>
  );
}