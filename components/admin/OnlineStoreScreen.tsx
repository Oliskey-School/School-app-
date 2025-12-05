import React, { useState, useMemo } from 'react';
import { StoreProduct, StoreOrder } from '../../types';
import { mockStoreProducts, mockStoreOrders } from '../../data';
import { ShoppingCartIcon, ReceiptIcon } from '../../constants';

const formatter = new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', minimumFractionDigits: 0 });

const ProductCard: React.FC<{ product: StoreProduct }> = ({ product }) => (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden border border-gray-200">
        <img src={product.imageUrl} alt={product.name} className="w-full h-32 object-cover" />
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
    </div>
);

const OrderRow: React.FC<{ order: StoreOrder }> = ({ order }) => {
    const statusStyles = {
        Pending: 'bg-amber-100 text-amber-800',
        Shipped: 'bg-sky-100 text-sky-800',
        Delivered: 'bg-green-100 text-green-800',
    };

    return (
        <div className="bg-white p-4 rounded-xl shadow-sm">
            <div className="flex justify-between items-start">
                <div>
                    <p className="font-bold text-gray-800">{order.customerName}</p>
                    <p className="text-sm text-gray-500">ID: {order.id}</p>
                </div>
                <span className={`px-2 py-1 text-xs font-semibold rounded-full ${statusStyles[order.status]}`}>
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
        </div>
    );
};

const OnlineStoreScreen: React.FC = () => {
    const [activeTab, setActiveTab] = useState<'products' | 'orders'>('products');

    return (
        <div className="flex flex-col h-full bg-gray-100">
            <div className="p-2 bg-gray-100/80 backdrop-blur-sm sticky top-0 z-10 border-b border-gray-200">
                <div className="flex space-x-1 bg-gray-200 p-1 rounded-lg">
                    <button
                        onClick={() => setActiveTab('products')}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center space-x-2 transition-colors ${activeTab === 'products' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'}`}
                    >
                        <ShoppingCartIcon className="h-5 w-5"/>
                        <span>Products</span>
                    </button>
                    <button
                        onClick={() => setActiveTab('orders')}
                        className={`w-1/2 py-2 text-sm font-semibold rounded-md flex items-center justify-center space-x-2 transition-colors ${activeTab === 'orders' ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-600'}`}
                    >
                        <ReceiptIcon className="h-5 w-5"/>
                        <span>Orders</span>
                    </button>
                </div>
            </div>

            <main className="flex-grow p-4 overflow-y-auto">
                {activeTab === 'products' && (
                    <div className="grid grid-cols-2 gap-4">
                        {mockStoreProducts.map(product => <ProductCard key={product.id} product={product} />)}
                    </div>
                )}
                {activeTab === 'orders' && (
                    <div className="space-y-3">
                        {mockStoreOrders.map(order => <OrderRow key={order.id} order={order} />)}
                    </div>
                )}
            </main>
        </div>
    );
};

export default OnlineStoreScreen;
