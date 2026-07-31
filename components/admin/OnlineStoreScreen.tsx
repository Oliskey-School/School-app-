import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { StoreProduct, StoreOrder } from '../../types';
import { ShoppingCartIcon, ReceiptIcon } from '../../constants';
import { api } from '../../lib/api';
import { toast } from 'react-hot-toast';
import CenteredLoader from '../ui/CenteredLoader';

// Backend endpoints for /api/store are not yet implemented. This screen attempts
// to fetch them so the moment they exist, real data flows through. Until then we
// show an explicit empty state instead of mock products.

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });

const ProductCard: React.FC<{ product: StoreProduct; index: number }> = ({ product, index }) => (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.2, delay: Math.min(index, 15) * 0.03 }} className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
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

const OrderRow: React.FC<{ order: StoreOrder; index: number }> = ({ order, index }) => {
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
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[order.status] || 'bg-gray-100 text-gray-700'}`}>
                    {order.status}
                </span>
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

const OnlineStoreScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');
    const [products, setProducts] = useState<StoreProduct[]>([]);
    const [orders, setOrders] = useState<StoreOrder[]>([]);
    const [loading, setLoading] = useState(true);
    const [unavailable, setUnavailable] = useState(false);

    useEffect(() => {
        let cancelled = false;
        const load = async () => {
            setLoading(true);
            try {
                const [productsResp, ordersResp] = await Promise.all([
                    api.get<any>('/store/products').catch(() => null),
                    api.get<any>('/store/orders').catch(() => null),
                ]);
                if (cancelled) return;
                if (productsResp === null && ordersResp === null) {
                    setUnavailable(true);
                    setProducts([]);
                    setOrders([]);
                } else {
                    setProducts(Array.isArray(productsResp) ? productsResp : (productsResp?.data || []));
                    setOrders(Array.isArray(ordersResp) ? ordersResp : (ordersResp?.data || []));
                }
            } catch (err: any) {
                if (!cancelled) {
                    console.error('Error loading store data:', err);
                    toast.error('Failed to load store data');
                }
            } finally {
                if (!cancelled) setLoading(false);
            }
        };
        load();
        return () => { cancelled = true; };
    }, []);

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-2 bg-gray-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
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
                            {products.map((product, pi) => <ProductCard key={product.id} product={product} index={pi} />)}
                        </div>
                    )
                )}
                {!loading && activeTab === 'orders' && (
                    orders.length === 0 ? (
                        <p className="text-sm text-gray-500 text-center py-8">No orders yet.</p>
                    ) : (
                        <div className="space-y-3">
                            {orders.map((order, oi) => <OrderRow key={order.id} order={order} index={oi} />)}
                        </div>
                    )
                )}
            </main>
        </div>
    );
};

export default OnlineStoreScreen;
