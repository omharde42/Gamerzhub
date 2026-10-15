'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import api from '@/lib/api';
import toast from 'react-hot-toast';
import {
  ShoppingBag, Search, Filter, Eye, CheckCircle, Clock,
  XCircle, AlertTriangle, User, DollarSign, Package, Loader2, ArrowRight
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AdminOrdersTab() {
  const queryClient = useQueryClient();

  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [paymentStatus, setPaymentStatus] = useState('ALL');
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);

  // Status transition state
  const [newStatus, setNewStatus] = useState<string>('');
  const [adminNotes, setAdminNotes] = useState<string>('');

  const { data, isLoading } = useQuery({
    queryKey: ['admin-orders', page, search, status, paymentStatus],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (status !== 'ALL') params.append('status', status);
      if (paymentStatus !== 'ALL') params.append('paymentStatus', paymentStatus);

      const res = await api.get(`/admin/orders?${params.toString()}`);
      return res.data;
    },
  });

  const { data: orderDetail, isLoading: detailLoading } = useQuery({
    queryKey: ['admin-order-detail', selectedOrderId],
    queryFn: async () => {
      if (!selectedOrderId) return null;
      const res = await api.get(`/admin/orders/${selectedOrderId}`);
      return res.data.data;
    },
    enabled: !!selectedOrderId,
  });

  const orders = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status, notes }: { id: string; status: string; notes?: string }) =>
      api.patch(`/admin/orders/${id}/status`, { status, notes }),
    onSuccess: () => {
      toast.success('Order status updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-orders'] });
      queryClient.invalidateQueries({ queryKey: ['admin-order-detail'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setNewStatus('');
      setAdminNotes('');
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to update order status');
    },
  });

  const openOrderDetail = (order: any) => {
    setSelectedOrderId(order.id);
    setNewStatus(order.status);
    setAdminNotes('');
  };

  const getStatusBadge = (orderStatus: string) => {
    switch (orderStatus) {
      case 'PENDING':
        return <Badge variant="outline" className="border-amber-500/30 text-amber-400 bg-amber-500/10 text-[10px] font-semibold"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>;
      case 'PROCESSING':
        return <Badge variant="outline" className="border-blue-500/30 text-blue-400 bg-blue-500/10 text-[10px] font-semibold"><Package className="h-3 w-3 mr-1" /> Processing</Badge>;
      case 'SHIPPED':
        return <Badge variant="outline" className="border-purple-500/30 text-purple-400 bg-purple-500/10 text-[10px] font-semibold"><Package className="h-3 w-3 mr-1" /> Shipped</Badge>;
      case 'DELIVERED':
        return <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px] font-semibold"><CheckCircle className="h-3 w-3 mr-1" /> Delivered</Badge>;
      case 'CANCELLED':
        return <Badge variant="outline" className="border-red-500/30 text-red-400 bg-red-500/10 text-[10px] font-semibold"><XCircle className="h-3 w-3 mr-1" /> Cancelled</Badge>;
      case 'REFUNDED':
        return <Badge variant="outline" className="border-gray-500/30 text-gray-400 bg-gray-500/10 text-[10px] font-semibold">Refunded</Badge>;
      default:
        return <Badge variant="outline" className="text-[10px]">{orderStatus}</Badge>;
    }
  };

  const getPaymentBadge = (payStatus: string) => {
    switch (payStatus) {
      case 'PAID':
        return <span className="inline-flex items-center text-emerald-400 font-semibold text-xs"><CheckCircle className="h-3.5 w-3.5 mr-1" /> Paid</span>;
      case 'PENDING':
        return <span className="inline-flex items-center text-amber-400 font-semibold text-xs"><Clock className="h-3.5 w-3.5 mr-1" /> Payment Pending</span>;
      case 'FAILED':
        return <span className="inline-flex items-center text-red-400 font-semibold text-xs"><XCircle className="h-3.5 w-3.5 mr-1" /> Payment Failed</span>;
      case 'REFUNDED':
        return <span className="inline-flex items-center text-muted-foreground font-semibold text-xs">Refunded</span>;
      default:
        return <span className="text-muted-foreground text-xs">{payStatus}</span>;
    }
  };

  return (
    <div className="space-y-5">
      {/* Search and Filters */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-card/30 p-4 rounded-2xl border border-border/50">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search by Order # or Customer..."
              className="pl-9 h-9 text-xs bg-muted/40"
            />
          </div>

          <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-xs bg-muted/40">
              <SelectValue placeholder="Fulfillment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="PENDING">Pending</SelectItem>
              <SelectItem value="PROCESSING">Processing</SelectItem>
              <SelectItem value="SHIPPED">Shipped</SelectItem>
              <SelectItem value="DELIVERED">Delivered</SelectItem>
              <SelectItem value="CANCELLED">Cancelled</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>

          <Select value={paymentStatus} onValueChange={(val) => { setPaymentStatus(val); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-xs bg-muted/40">
              <SelectValue placeholder="Payment" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Payments</SelectItem>
              <SelectItem value="PAID">Paid</SelectItem>
              <SelectItem value="PENDING">Payment Pending</SelectItem>
              <SelectItem value="FAILED">Failed</SelectItem>
              <SelectItem value="REFUNDED">Refunded</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Orders Table */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading orders...</p>
            </div>
          ) : orders.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <ShoppingBag className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <h3 className="font-semibold text-foreground text-sm">No orders recorded yet</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                Customer purchases and digital orders will appear here automatically with real-time status tracking.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="p-3.5">Order #</th>
                    <th className="p-3.5">Customer</th>
                    <th className="p-3.5">Date</th>
                    <th className="p-3.5">Items</th>
                    <th className="p-3.5">Total Amount</th>
                    <th className="p-3.5">Payment</th>
                    <th className="p-3.5">Fulfillment</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {orders.map((ord: any) => (
                    <tr key={ord.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5 font-mono font-bold text-primary">
                        {ord.orderNumber}
                      </td>
                      <td className="p-3.5">
                        <div className="min-w-[140px]">
                          <p className="font-semibold text-foreground truncate">
                            {ord.user?.profile?.username || 'Gamer'}
                          </p>
                          <p className="text-[11px] text-muted-foreground truncate">{ord.user?.email}</p>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        {formatDate(ord.createdAt)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="font-medium">{ord.items?.length || 0} item(s)</span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-bold text-foreground">
                        ${ord.totalAmount.toFixed(2)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {getPaymentBadge(ord.paymentStatus)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {getStatusBadge(ord.status)}
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openOrderDetail(ord)}
                          className="h-8 text-xs gap-1 border-primary/20 hover:border-primary/50 text-foreground"
                        >
                          <Eye className="h-3.5 w-3.5" /> Details
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50 text-xs">
              <span className="text-muted-foreground">
                Showing page {page} of {meta.totalPages} ({meta.total} orders)
              </span>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                  className="h-8 text-xs"
                >
                  Previous
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= meta.totalPages}
                  onClick={() => setPage((p) => p + 1)}
                  className="h-8 text-xs"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Order Details & Status Transition Dialog */}
      <Dialog open={!!selectedOrderId} onOpenChange={() => setSelectedOrderId(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2 font-mono">
              <ShoppingBag className="h-5 w-5 text-primary" />
              Order #{orderDetail?.orderNumber}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Placed on {orderDetail ? formatDate(orderDetail.createdAt) : ''}
            </DialogDescription>
          </DialogHeader>

          {detailLoading || !orderDetail ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
            </div>
          ) : (
            <div className="space-y-5 pt-2">
              {/* Order summary bar */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3.5 rounded-xl bg-card border border-border/50 text-xs">
                <div>
                  <span className="text-muted-foreground block text-[11px]">Customer</span>
                  <span className="font-semibold text-foreground truncate block">
                    {orderDetail.user?.profile?.username || orderDetail.user?.email}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Total Paid</span>
                  <span className="font-bold text-foreground block text-sm">
                    ${orderDetail.totalAmount.toFixed(2)} {orderDetail.currency}
                  </span>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Payment</span>
                  <div className="mt-0.5">{getPaymentBadge(orderDetail.paymentStatus)}</div>
                </div>
                <div>
                  <span className="text-muted-foreground block text-[11px]">Fulfillment</span>
                  <div className="mt-0.5">{getStatusBadge(orderDetail.status)}</div>
                </div>
              </div>

              {/* Items List */}
              <div className="space-y-2">
                <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Order Items</h4>
                <div className="rounded-xl border border-border/50 divide-y divide-border/40 overflow-hidden bg-card/40">
                  {orderDetail.items?.map((item: any) => (
                    <div key={item.id} className="flex items-center justify-between p-3 text-xs gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        {item.product?.images && item.product.images[0] ? (
                          <img
                            src={item.product.images[0]}
                            alt={item.product.name}
                            className="h-10 w-10 rounded-lg object-cover border border-border/50 shrink-0"
                          />
                        ) : (
                          <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/30 shrink-0">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="font-semibold text-foreground truncate">{item.product?.name || 'Item'}</p>
                          <p className="text-[11px] text-muted-foreground">
                            Qty: {item.quantity} {item.size ? `• Size: ${item.size}` : ''} {item.color ? `• Color: ${item.color}` : ''}
                          </p>
                        </div>
                      </div>
                      <div className="text-right whitespace-nowrap">
                        <p className="font-bold text-foreground">${item.totalPrice.toFixed(2)}</p>
                        <p className="text-[10px] text-muted-foreground">${item.unitPrice.toFixed(2)} each</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Shipping Address */}
              {orderDetail.shippingAddress && (
                <div className="p-3.5 rounded-xl border border-border/50 bg-card/30 text-xs space-y-1">
                  <h4 className="font-bold text-foreground">Delivery Information</h4>
                  <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap font-sans">
                    {typeof orderDetail.shippingAddress === 'string'
                      ? orderDetail.shippingAddress
                      : JSON.stringify(orderDetail.shippingAddress, null, 2)}
                  </pre>
                </div>
              )}

              {/* Order Status Transition Form */}
              <div className="p-4 rounded-xl border border-primary/20 bg-primary/5 space-y-3">
                <h4 className="text-xs font-bold text-foreground flex items-center gap-2">
                  <Package className="h-4 w-4 text-primary" /> Update Fulfillment Status
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">New Status</label>
                    <Select value={newStatus} onValueChange={setNewStatus}>
                      <SelectTrigger className="h-9 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="PENDING">PENDING</SelectItem>
                        <SelectItem value="PROCESSING">PROCESSING</SelectItem>
                        <SelectItem value="SHIPPED">SHIPPED</SelectItem>
                        <SelectItem value="DELIVERED">DELIVERED</SelectItem>
                        <SelectItem value="CANCELLED">CANCELLED</SelectItem>
                        <SelectItem value="REFUNDED">REFUNDED</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[11px] font-semibold text-muted-foreground">Fulfillment Note (optional)</label>
                    <Input
                      value={adminNotes}
                      onChange={(e) => setAdminNotes(e.target.value)}
                      placeholder="e.g. Tracking # or reason"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>

                <div className="flex justify-end pt-1">
                  <Button
                    size="sm"
                    disabled={updateStatusMutation.isPending || newStatus === orderDetail.status}
                    onClick={() =>
                      updateStatusMutation.mutate({
                        id: orderDetail.id,
                        status: newStatus,
                        notes: adminNotes || undefined,
                      })
                    }
                    className="text-xs gap-1 font-semibold"
                  >
                    {updateStatusMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : null}
                    Confirm Status Change
                  </Button>
                </div>
              </div>
            </div>
          )}

          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedOrderId(null)} className="text-xs">
              Close
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
