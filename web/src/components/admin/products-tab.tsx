'use client';

import React, { useState, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
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
  Package, Plus, Search, Filter, Edit2, Trash2, Upload, AlertCircle,
  CheckCircle2, XCircle, Image as ImageIcon, Loader2, Bookmark
} from 'lucide-react';
import { formatDate } from '@/lib/utils';

export function AdminProductsTab() {
  const queryClient = useQueryClient();

  // Filters & Pagination
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('ALL');
  const [status, setStatus] = useState('ALL');
  const [stockStatus, setStockStatus] = useState('ALL');
  const [page, setPage] = useState(1);
  const [sortBy, setSortBy] = useState('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Modals state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any | null>(null);
  const [deletingProductId, setDeletingProductId] = useState<string | null>(null);

  // Form state
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    category: 'Gaming Gear',
    price: '',
    stock: '',
    images: [] as string[],
    sizes: '' as string,
    colors: '' as string,
    status: 'ACTIVE',
  });

  // Image Upload state
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch products query
  const { data, isLoading } = useQuery({
    queryKey: ['admin-products', page, search, category, status, stockStatus, sortBy, sortOrder],
    queryFn: async () => {
      const params = new URLSearchParams();
      params.append('page', page.toString());
      params.append('limit', '15');
      if (search) params.append('search', search);
      if (category !== 'ALL') params.append('category', category);
      if (status !== 'ALL') params.append('status', status);
      if (stockStatus !== 'ALL') params.append('stockStatus', stockStatus);
      params.append('sortBy', sortBy);
      params.append('sortOrder', sortOrder);

      const res = await api.get(`/admin/products?${params.toString()}`);
      return res.data;
    },
  });

  const products = data?.data || [];
  const meta = data?.meta || { total: 0, totalPages: 1 };

  // Mutations
  const createProductMutation = useMutation({
    mutationFn: (payload: any) => api.post('/admin/products', payload),
    onSuccess: () => {
      toast.success('Product created successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      closeModals();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to create product');
    },
  });

  const updateProductMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: any }) => api.put(`/admin/products/${id}`, payload),
    onSuccess: () => {
      toast.success('Product updated successfully');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      closeModals();
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || err.response?.data?.error || 'Failed to update product');
    },
  });

  const deleteProductMutation = useMutation({
    mutationFn: (id: string) => api.delete(`/admin/products/${id}`),
    onSuccess: (res: any) => {
      toast.success(res.data?.message || 'Product removed');
      queryClient.invalidateQueries({ queryKey: ['admin-products'] });
      queryClient.invalidateQueries({ queryKey: ['admin-stats'] });
      setDeletingProductId(null);
    },
    onError: (err: any) => {
      toast.error(err.response?.data?.message || 'Failed to delete product');
    },
  });

  // Image Upload handler
  const handleImageFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate type and size (max 10MB)
    const validTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!validTypes.includes(file.type)) {
      toast.error('Invalid image file. Only JPEG, PNG, WEBP, and GIF are permitted.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('Image exceeds maximum permitted file size of 10MB.');
      return;
    }

    const form = new FormData();
    form.append('image', file);

    setIsUploading(true);
    try {
      const res = await api.post('/admin/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      const url = res.data?.data?.url;
      if (url) {
        setFormData((prev) => ({
          ...prev,
          images: [url, ...prev.images],
        }));
        toast.success('Image uploaded and verified');
      }
    } catch (err: any) {
      toast.error(err.response?.data?.message || 'Failed to upload image');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const removeImage = (index: number) => {
    setFormData((prev) => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index),
    }));
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      description: '',
      category: 'Gaming Gear',
      price: '',
      stock: '10',
      images: [],
      sizes: '',
      colors: '',
      status: 'ACTIVE',
    });
    setEditingProduct(null);
    setIsAddModalOpen(true);
  };

  const openEditModal = (prod: any) => {
    setEditingProduct(prod);
    setFormData({
      name: prod.name,
      description: prod.description || '',
      category: prod.category,
      price: prod.price.toString(),
      stock: prod.stock.toString(),
      images: prod.images || [],
      sizes: (prod.sizes || []).join(', '),
      colors: (prod.colors || []).join(', '),
      status: prod.status,
    });
    setIsAddModalOpen(true);
  };

  const closeModals = () => {
    setIsAddModalOpen(false);
    setEditingProduct(null);
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim()) {
      toast.error('Product name is required');
      return;
    }
    const priceNum = parseFloat(formData.price);
    if (isNaN(priceNum) || priceNum < 0) {
      toast.error('Valid positive price required');
      return;
    }
    const stockNum = parseInt(formData.stock, 10);
    if (isNaN(stockNum) || stockNum < 0) {
      toast.error('Valid non-negative stock count required');
      return;
    }

    const payload = {
      name: formData.name.trim(),
      description: formData.description.trim() || undefined,
      category: formData.category.trim(),
      price: priceNum,
      stock: stockNum,
      images: formData.images,
      sizes: formData.sizes
        ? formData.sizes.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      colors: formData.colors
        ? formData.colors.split(',').map((c) => c.trim()).filter(Boolean)
        : [],
      status: formData.status,
    };

    if (editingProduct) {
      updateProductMutation.mutate({ id: editingProduct.id, payload });
    } else {
      createProductMutation.mutate(payload);
    }
  };

  const getStockBadge = (stock: number) => {
    if (stock === 0) {
      return <Badge variant="destructive" className="text-[10px]">Out of Stock</Badge>;
    }
    if (stock <= 5) {
      return (
        <Badge variant="outline" className="border-amber-500/40 text-amber-400 bg-amber-500/10 text-[10px]">
          Low Stock ({stock})
        </Badge>
      );
    }
    return (
      <Badge variant="outline" className="border-emerald-500/30 text-emerald-400 bg-emerald-500/10 text-[10px]">
        In Stock ({stock})
      </Badge>
    );
  };

  return (
    <div className="space-y-5">
      {/* Action and Filter Bar */}
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
              placeholder="Search products by name or category..."
              className="pl-9 h-9 text-xs bg-muted/40"
            />
          </div>

          <Select value={category} onValueChange={(val) => { setCategory(val); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-xs bg-muted/40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Categories</SelectItem>
              <SelectItem value="Gaming Gear">Gaming Gear</SelectItem>
              <SelectItem value="Digital Items">Digital Items</SelectItem>
              <SelectItem value="Merchandise">Merchandise</SelectItem>
              <SelectItem value="Coaching">Coaching</SelectItem>
              <SelectItem value="Hardware">Hardware</SelectItem>
            </SelectContent>
          </Select>

          <Select value={status} onValueChange={(val) => { setStatus(val); setPage(1); }}>
            <SelectTrigger className="h-9 w-32 text-xs bg-muted/40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Status</SelectItem>
              <SelectItem value="ACTIVE">Active</SelectItem>
              <SelectItem value="DRAFT">Draft</SelectItem>
              <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              <SelectItem value="ARCHIVED">Archived</SelectItem>
            </SelectContent>
          </Select>

          <Select value={stockStatus} onValueChange={(val) => { setStockStatus(val); setPage(1); }}>
            <SelectTrigger className="h-9 w-32 text-xs bg-muted/40">
              <SelectValue placeholder="Stock" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">All Stock</SelectItem>
              <SelectItem value="in">In Stock (&gt;5)</SelectItem>
              <SelectItem value="low">Low Stock (≤5)</SelectItem>
              <SelectItem value="out">Out of Stock</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <Button
          onClick={openAddModal}
          size="sm"
          className="h-9 gap-1.5 text-xs bg-primary hover:bg-primary/90 text-primary-foreground font-semibold shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" /> Add Product
        </Button>
      </div>

      {/* Products Table Card */}
      <Card className="glass-card">
        <CardContent className="p-0">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-16 space-y-3">
              <Loader2 className="h-8 w-8 text-primary animate-spin" />
              <p className="text-xs text-muted-foreground">Loading catalog items...</p>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-16 space-y-3">
              <Package className="h-12 w-12 mx-auto text-muted-foreground/30" />
              <h3 className="font-semibold text-foreground text-sm">No products found</h3>
              <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                No items match your query. Click "Add Product" to add gaming items, apparel, or digital goods to the platform.
              </p>
              <Button onClick={openAddModal} size="sm" variant="outline" className="text-xs mt-2">
                <Plus className="h-3.5 w-3.5 mr-1" /> Add First Product
              </Button>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-border/60 bg-muted/30 text-muted-foreground font-semibold uppercase tracking-wider">
                    <th className="p-3.5">Product</th>
                    <th className="p-3.5">Category</th>
                    <th className="p-3.5">Price</th>
                    <th className="p-3.5">Inventory</th>
                    <th className="p-3.5">Status</th>
                    <th className="p-3.5">Orders</th>
                    <th className="p-3.5 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {products.map((prod: any) => (
                    <tr key={prod.id} className="hover:bg-muted/20 transition-colors">
                      <td className="p-3.5">
                        <div className="flex items-center gap-3 min-w-[200px]">
                          {prod.images && prod.images[0] ? (
                            <img
                              src={prod.images[0]}
                              alt={prod.name}
                              className="h-10 w-10 rounded-lg object-cover border border-border/50 shrink-0"
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-muted flex items-center justify-center text-muted-foreground/40 shrink-0 border border-border/40">
                              <Package className="h-5 w-5" />
                            </div>
                          )}
                          <div className="min-w-0">
                            <p className="font-bold text-foreground truncate">{prod.name}</p>
                            <p className="text-[11px] text-muted-foreground truncate line-clamp-1">
                              {prod.description || 'No description provided'}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <span className="inline-flex items-center gap-1 font-medium text-muted-foreground">
                          <Bookmark className="h-3 w-3 text-primary" /> {prod.category}
                        </span>
                      </td>
                      <td className="p-3.5 whitespace-nowrap font-bold text-foreground">
                        ${prod.price.toFixed(2)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        {getStockBadge(prod.stock)}
                      </td>
                      <td className="p-3.5 whitespace-nowrap">
                        <Badge
                          variant="outline"
                          className={`text-[10px] font-semibold ${
                            prod.status === 'ACTIVE'
                              ? 'border-emerald-500/30 text-emerald-400 bg-emerald-500/10'
                              : prod.status === 'OUT_OF_STOCK'
                              ? 'border-red-500/30 text-red-400 bg-red-500/10'
                              : 'border-muted-foreground/30 text-muted-foreground'
                          }`}
                        >
                          {prod.status}
                        </Badge>
                      </td>
                      <td className="p-3.5 whitespace-nowrap text-muted-foreground">
                        {prod._count?.orderItems || 0} sold
                      </td>
                      <td className="p-3.5 text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => openEditModal(prod)}
                            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
                          >
                            <Edit2 className="h-3.5 w-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setDeletingProductId(prod.id)}
                            className="h-8 w-8 p-0 text-destructive hover:bg-destructive/10"
                          >
                            <Trash2 className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {meta.totalPages > 1 && (
            <div className="flex items-center justify-between p-4 border-t border-border/50 text-xs">
              <span className="text-muted-foreground">
                Showing page {page} of {meta.totalPages} ({meta.total} products)
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

      {/* Add / Edit Product Modal */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-lg flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              {editingProduct ? 'Edit Catalog Product' : 'Add New Catalog Product'}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Manage product details, pricing, inventory stock, and product imagery.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleFormSubmit} className="space-y-4 pt-2">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Product Name *</label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="e.g. Pro Gaming Mechanical Keyboard RGB"
                required
                className="text-xs h-9"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Category *</label>
                <Select
                  value={formData.category}
                  onValueChange={(val) => setFormData({ ...formData, category: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Gaming Gear">Gaming Gear</SelectItem>
                    <SelectItem value="Digital Items">Digital Items</SelectItem>
                    <SelectItem value="Merchandise">Merchandise</SelectItem>
                    <SelectItem value="Coaching">Coaching</SelectItem>
                    <SelectItem value="Hardware">Hardware</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Status</label>
                <Select
                  value={formData.status}
                  onValueChange={(val) => setFormData({ ...formData, status: val })}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="ACTIVE">Active</SelectItem>
                    <SelectItem value="DRAFT">Draft</SelectItem>
                    <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
                    <SelectItem value="ARCHIVED">Archived</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Price ($ USD) *</label>
                <Input
                  type="number"
                  step="0.01"
                  min="0"
                  value={formData.price}
                  onChange={(e) => setFormData({ ...formData, price: e.target.value })}
                  placeholder="29.99"
                  required
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Stock Inventory Count *</label>
                <Input
                  type="number"
                  min="0"
                  value={formData.stock}
                  onChange={(e) => setFormData({ ...formData, stock: e.target.value })}
                  placeholder="100"
                  required
                  className="text-xs h-9"
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Description</label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Product specifications, features, in-game perks, or delivery details..."
                rows={3}
                className="text-xs"
              />
            </div>

            {/* Images Upload & Previews */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-xs font-semibold text-foreground">Product Images</label>
                <span className="text-[10px] text-muted-foreground">JPEG, PNG, WEBP, GIF (Max 10MB)</span>
              </div>

              <div className="flex flex-wrap items-center gap-3">
                {formData.images.map((imgUrl, idx) => (
                  <div key={idx} className="relative group w-16 h-16 rounded-xl border border-border overflow-hidden bg-muted">
                    <img src={imgUrl} alt="Preview" className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="absolute inset-0 bg-black/60 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity text-white"
                    >
                      <Trash2 className="h-4 w-4 text-red-400" />
                    </button>
                  </div>
                ))}

                <button
                  type="button"
                  disabled={isUploading}
                  onClick={() => fileInputRef.current?.click()}
                  className="w-16 h-16 rounded-xl border-2 border-dashed border-border/80 hover:border-primary/50 flex flex-col items-center justify-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {isUploading ? (
                    <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  ) : (
                    <>
                      <Upload className="h-4 w-4" />
                      <span className="text-[9px]">Upload</span>
                    </>
                  )}
                </button>
                <input
                  type="file"
                  ref={fileInputRef}
                  onChange={handleImageFileChange}
                  accept="image/jpeg,image/png,image/webp,image/gif"
                  className="hidden"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Sizes (comma-separated)</label>
                <Input
                  value={formData.sizes}
                  onChange={(e) => setFormData({ ...formData, sizes: e.target.value })}
                  placeholder="S, M, L, XL"
                  className="text-xs h-9"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-foreground">Colors (comma-separated)</label>
                <Input
                  value={formData.colors}
                  onChange={(e) => setFormData({ ...formData, colors: e.target.value })}
                  placeholder="Black, Purple, Neon"
                  className="text-xs h-9"
                />
              </div>
            </div>

            <DialogFooter className="pt-3">
              <Button type="button" variant="outline" size="sm" onClick={closeModals} className="text-xs">
                Cancel
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={createProductMutation.isPending || updateProductMutation.isPending}
                className="text-xs font-semibold"
              >
                {createProductMutation.isPending || updateProductMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-1" />
                ) : null}
                {editingProduct ? 'Save Changes' : 'Create Product'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Modal */}
      <Dialog open={!!deletingProductId} onOpenChange={() => setDeletingProductId(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base flex items-center gap-2 text-destructive">
              <AlertCircle className="h-5 w-5" /> Confirm Product Removal
            </DialogTitle>
            <DialogDescription className="text-xs">
              Are you sure you want to remove this product? If the product has historical customer orders, it will be safely archived to preserve customer records and database integrity.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <Button variant="outline" size="sm" onClick={() => setDeletingProductId(null)} className="text-xs">
              Cancel
            </Button>
            <Button
              variant="destructive"
              size="sm"
              disabled={deleteProductMutation.isPending}
              onClick={() => deletingProductId && deleteProductMutation.mutate(deletingProductId)}
              className="text-xs font-semibold"
            >
              {deleteProductMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-1" /> : null}
              Confirm Delete / Archive
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
