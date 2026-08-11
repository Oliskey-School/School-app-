import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { StoreProduct, StoreOrder } from '../../types';
import { ShoppingCartIcon, ReceiptIcon, PlusIcon, TrashIcon } from '../../constants';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import CenteredLoader from '../ui/CenteredLoader';

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });

// The backend returns snake_case rows straight from Prisma; the screen's own
// StoreProduct/StoreOrder types (types/index.ts) are camelCase. Normalize here
// so the rest of the component can keep using the typed shape.
const mapProduct = (p: any): StoreProduct => ({
    id: p.id,
    name: p.name,
    category: p.category,
    price: Number(p.price) || 0,
    imageUrl: p.imageUrl || p.image_url || '',
    stock: Number(p.stock) || 0,
});

const mapOrder = (o: any): StoreOrder => ({
    id: o.id,
    customerName: o.customerName || o.customer_name || 'Unknown',
    items: (o.items || []).map((it: any) => ({
        productName: it.productName || it.product_name,
        quantity: Number(it.quantity) || 0,
    })),
    totalAmount: Number(o.totalAmount ?? o.total_amount) || 0,
    status: o.status || 'Pending',
    orderDate: o.orderDate || o.order_date || o.created_at,
});

const ProductCard: React.FC<{ product: StoreProduct; index: number; onDelete: (id: string) => void }> = ({ product, index, onDelete }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 15) * 0.03 }} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200 relative group">
        <button
            onClick={() => onDelete(String(product.id))}
            className="absolute top-2 right-2 p-1.5 bg-white/90 rounded-full shadow-sm text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
            title="Delete product"
        >
            <TrashIcon className="w-4 h-4" />
        </button>
        {product.imageUrl && <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover" />}
        <div className="p-4">
            <h4 className="font-bold text-gray-800 truncate">{product.name}</h4>
            <p className="text-sm text-gray-500">{product.category}</p>
            <div className="flex justify-between items-center mt-3">
                <p className="font-bold text-lg text-indigo-600">{formatter.format(product.price)}</p>
                <p className={`text-sm font-semibold ${product.stock > 10 ? 'text-green-600' : 'text-red-600'}`}>
                    {product.stock} in stock
                </p>
            </div>
        </div>
    </motion.div>
);

const ORDER_STATUSES = ['Pending', 'Shipped', 'Delivered'];

const OrderRow: React.FC<{ order: StoreOrder; index: number; onStatusChange: (id: string, status: string) => void }> = ({ order, index, onStatusChange }) => {
    const statusStyles: Record<string, string> = {
        Pending: 'bg-amber-100 text-amber-800',
        Shipped: 'bg-sky-100 text-sky-800',
        Delivered: 'bg-green-100 text-green-800',
    };

    return (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 15) * 0.03 }} className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-gray-800">{order.customerName}</p>
                    <p className="text-sm text-gray-500">ID: {order.id}</p>
                </div>
                <select
                    value={order.status}
                    onChange={(e) => onStatusChange(String(order.id), e.target.value)}
                    className={`px-2 py-1 text-xs font-semibold rounded-full border-none outline-none cursor-pointer ${statusStyles[order.status] || 'bg-gray-100 text-gray-700'}`}
                >
                    {ORDER_STATUSES.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
            </div>
            <div className="mt-3 border-t pt-3">
                <ul className="text-sm text-gray-600 space-y-1">
                    {order.items.map((item, index) => (
                        <li key={index}>- {item.productName} (x{item.quantity})</li>
                    ))}
                </ul>
                <p className="text-right font-bold text-gray-800 mt-2">Total: {formatter.format(order.totalAmount)}</p>
            </div>
        </motion.div>
    );
};

const EMPTY_FORM = { name: '', category: 'Uniform', price: '', stock: '', description: '', imageUrl: '' };

const OnlineStoreScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [orders, setOrders] = useState<StoreOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);
    const [isAdding, setIsAdding] = useState(false);
    const [saving, setSaving] = useState(false);
    const [form, setForm] = useState(EMPTY_FORM);

    const load = async () => {
        setLoading(true);
        try {
            const [productsResp, ordersResp] = await Promise.all([
                api.get<any>('/store/products').catch(() => null),
                api.get<any>('/store/orders').catch(() => null),
            ]);
            if (productsResp === null && ordersResp === null) {
                setUnavailable(true);
                setProducts([]);
                setOrders([]);
            } else {
                setUnavailable(false);
                const rawProducts = Array.isArray(productsResp) ? productsResp : (productsResp?.data || []);
                const rawOrders = Array.isArray(ordersResp) ? ordersResp : (ordersResp?.data || []);
                setProducts(rawProducts.map(mapProduct));
                setOrders(rawOrders.map(mapOrder));
            }
        } catch (err: any) {
            console.error('Error loading store data:', err);
            toast.error('Failed to load store data');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        let cancelled = false;
        (async () => {
            await load();
            if (cancelled) return;
        })();
        return () => { cancelled = true; };
    }, []);

    const handleAddProduct = async () => {
        if (!form.name.trim()) { toast.error('Product name is required.'); return; }
        setSaving(true);
        try {
            await api.post('/store/products', {
                name: form.name.trim(),
                category: form.category,
                price: Number(form.price) || 0,
                stock: Number(form.stock) || 0,
                description: form.description.trim() || undefined,
                image_url: form.imageUrl.trim() || undefined,
            });
            toast.success('Product added.');
            setForm(EMPTY_FORM);
            setIsAdding(false);
            await load();
        } catch (err: any) {
            console.error('Error adding product:', err);
            toast.error(err?.message || 'Failed to add product.');
        } finally {
            setSaving(false);
        }
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm('Delete this product from the store?')) return;
        try {
            await api.delete(`/store/products/${id}`);
            setProducts(prev => prev.filter(p => String(p.id) !== id));
            toast.success('Product deleted.');
        } catch (err: any) {
            console.error('Error deleting product:', err);
            toast.error('Failed to delete product.');
        }
    };

    const handleOrderStatusChange = async (id: string, status: string) => {
        const prevOrders = orders;
        setOrders(prev => prev.map(o => String(o.id) === id ? { ...o, status: status as StoreOrder['status'] } : o));
        try {
            await api.patch(`/store/orders/${id}/status`, { status });
            toast.success('Order status updated.');
        } catch (err: any) {
            console.error('Error updating order status:', err);
            toast.error('Failed to update order status.');
            setOrders(prevOrders);
        }
    };

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-2 bg-gray-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200 flex items-center gap-2">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg flex-grow">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`relative w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center space-x-2 transition-colors ${activeTab === 'products' ? 'text-indigo-600' : 'text-gray-600'}`}
                    >
                        {activeTab === 'products' && (
                            <motion.div layoutId="storeTab" className="absolute inset-0 bg-white rounded-md shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                        )}
                        <ShoppingCartIcon className="h-5 w-5 relative" />
                        <span className="relative">Products</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`relative w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center space-x-2 transition-colors ${activeTab === 'orders' ? 'text-indigo-600' : 'text-gray-600'}`}
                    >
                        {activeTab === 'orders' && (
                            <motion.div layoutId="storeTab" className="absolute inset-0 bg-white rounded-md shadow-sm" transition={{ type: 'spring', stiffness: 400, damping: 32 }} />
                        )}
                        <ReceiptIcon className="h-5 w-5 relative" />
                        <span className="relative">Orders</span>
                    </button>
                </div>
                {activeTab === 'products' && (
                    <button
                        onClick={() => setIsAdding(true)}
                        className="flex items-center space-x-1.5 bg-indigo-600 text-white px-3 py-2 rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors"
                    >
                        <PlusIcon className="h-4 w-4" />
                        <span>Add Product</span>
                    </button>
                )}
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                {unavailable && (
                    <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4 text-sm text-amber-800">
                        Online Store backend is not yet available. Products and orders will appear here once the server-side endpoints (<code>/api/store/products</code>, <code>/api/store/orders</code>) are implemented.
                    </div>
                )}
                {loading && !unavailable && <CenteredLoader className="py-8" />}
                {!loading && activeTab === 'products' && (
                    products.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No products listed.</p>
                    ) : (
                        <div className="grid grid-cols-2 gap-4">
                            {products.map((product, pi) => <ProductCard key={product.id} product={product} index={pi} onDelete={handleDeleteProduct} />)}
                        </div>
                    )
                )}
                {!loading && activeTab === 'orders' && (
                    orders.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No orders yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order, oi) => <OrderRow key={order.id} order={order} index={oi} onStatusChange={handleOrderStatusChange} />)}
                        </div>
                    )
                )}
            </main>

            <AnimatePresence>
                {isAdding && (
                    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
                        <motion.div initial={{ opacity: 0, scale: 0.97, y: 8 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.97, y: 8 }} className="bg-white rounded-xl shadow-sm border border-gray-200 p-5 w-full max-w-md space-y-4">
                            <h3 className="font-bold text-gray-800 text-lg">Add Product</h3>
                            <div className="space-y-3">
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Product Name</label>
                                    <input
                                        type="text"
                                        value={form.name}
                                        onChange={e => setForm({ ...form, name: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="e.g. School Hoodie"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Category</label>
                                        <select
                                            value={form.category}
                                            onChange={e => setForm({ ...form, category: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        >
                                            <option value="Uniform">Uniform</option>
                                            <option value="Book">Book</option>
                                            <option value="Stationery">Stationery</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-xs font-semibold text-gray-500 mb-1">Price (₦)</label>
                                        <input
                                            type="number"
                                            value={form.price}
                                            onChange={e => setForm({ ...form, price: e.target.value })}
                                            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Stock Quantity</label>
                                    <input
                                        type="number"
                                        value={form.stock}
                                        onChange={e => setForm({ ...form, stock: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="0"
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Image URL (optional)</label>
                                    <input
                                        type="text"
                                        value={form.imageUrl}
                                        onChange={e => setForm({ ...form, imageUrl: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        placeholder="https://..."
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-semibold text-gray-500 mb-1">Description (optional)</label>
                                    <textarea
                                        value={form.description}
                                        onChange={e => setForm({ ...form, description: e.target.value })}
                                        className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none"
                                        rows={2}
                                    />
                                </div>
                            </div>
                            <div className="flex gap-3 pt-1">
                                <button
                                    onClick={() => { setIsAdding(false); setForm(EMPTY_FORM); }}
                                    className="flex-1 py-2.5 border border-gray-200 rounded-lg text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
                                >
                                    Cancel
                                </button>
                                <button
                                    onClick={handleAddProduct}
                                    disabled={saving}
                                    className="flex-1 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60"
                                >
                                    {saving ? 'Saving...' : 'Add Product'}
                                </button>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
};

export default OnlineStoreScreen;
