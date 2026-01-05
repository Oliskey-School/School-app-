import React, { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { EnhancedStoreProduct, ShoppingCartItem, StoreOrderFull } from '../../types-additional';
import { toast } from 'react-hot-toast';
import { ShoppingCartIcon } from '../../constants';

const EnhancedShop: React.FC = () => {
    const [products, setProducts] = useState<EnhancedStoreProduct[]>([]);
    const [cart, setCart] = useState<ShoppingCartItem[]>([]);
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState<'products' | 'cart' | 'orders'>('products');

    useEffect(() => {
        fetchProducts();
        fetchCart();
    }, []);

    const fetchProducts = async () => {
        try {
            const { data, error } = await supabase
                .from('store_products')
                .select('*')
                .eq('is_active', true);

            if (error) throw error;
            setProducts(data || []);
        } catch (error) {
            console.error('Error fetching products:', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchCart = async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) return;

        const { data } = await supabase
            .from('shopping_cart')
            .select('*, product:store_products(*)')
            .eq('user_id', user.id);

        setCart(data || []);
    };

    const addToCart = async (productId: number) => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user) {
            toast.error('Please login to add items to cart');
            return;
        }

        try {
            const { error } = await supabase
                .from('shopping_cart')
                .upsert({
                    user_id: user.id,
                    product_id: productId,
                    quantity: 1
                }, {
                    onConflict: 'user_id,product_id,size,color'
                });

            if (error) throw error;

            toast.success('Added to cart!');
            fetchCart();
        } catch (error: any) {
            toast.error('Failed to add to cart');
        }
    };

    const removeFromCart = async (cartItemId: number) => {
        try {
            const { error } = await supabase
                .from('shopping_cart')
                .delete()
                .eq('id', cartItemId);

            if (error) throw error;

            toast.success('Removed from cart');
            fetchCart();
        } catch (error) {
            toast.error('Failed to remove item');
        }
    };

    const checkout = async () => {
        const user = (await supabase.auth.getUser()).data.user;
        if (!user || cart.length === 0) return;

        try {
            const totalAmount = cart.reduce((sum, item) =>
                sum + (item.product?.price || 0) * item.quantity, 0
            );

            const orderNumber = `ORD-${Date.now()}`;

            // Create order
            const { data: order, error: orderError } = await supabase
                .from('store_orders')
                .insert({
                    order_number: orderNumber,
                    user_id: user.id,
                    total_amount: totalAmount,
                    status: 'pending'
                })
                .select()
                .single();

            if (orderError) throw orderError;

            // Create order items
            const orderItems = cart.map(item => ({
                order_id: order.id,
                product_id: item.productId,
                product_name: item.product?.name || '',
                quantity: item.quantity,
                unit_price: item.product?.price || 0,
                size: item.size,
                color: item.color
            }));

            const { error: itemsError } = await supabase
                .from('order_items')
                .insert(orderItems);

            if (itemsError) throw itemsError;

            // Clear cart
            await supabase
                .from('shopping_cart')
                .delete()
                .eq('user_id', user.id);

            toast.success(`Order placed! Order number: ${orderNumber}`);
            setCart([]);
            setView('orders');
        } catch (error) {
            console.error('Checkout error:', error);
            toast.error('Failed to place order');
        }
    };

    const cartTotal = cart.reduce((sum, item) =>
        sum + (item.product?.price || 0) * item.quantity, 0
    );

    return (
        <div className="flex flex-col h-full bg-gray-50">
            {/* Header Tabs */}
            <div className="bg-white border-b border-gray-200 p-4">
                <div className="flex space-x-2">
                    <button
                        onClick={() => setView('products')}
                        className={`px-4 py-2 rounded-lg font-semibold ${view === 'products' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        Products
                    </button>
                    <button
                        onClick={() => setView('cart')}
                        className={`px-4 py-2 rounded-lg font-semibold relative ${view === 'cart' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        Cart
                        {cart.length > 0 && (
                            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                                {cart.length}
                            </span>
                        )}
                    </button>
                    <button
                        onClick={() => setView('orders')}
                        className={`px-4 py-2 rounded-lg font-semibold ${view === 'orders' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
                    >
                        Orders
                    </button>
                </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
                {view === 'products' && (
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {products.map(product => (
                            <div key={product.id} className="bg-white rounded-xl shadow-sm overflow-hidden">
                                <img
                                    src={product.imageUrl}
                                    alt={product.name}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="p-4">
                                    <h3 className="font-bold text-gray-800">{product.name}</h3>
                                    <p className="text-sm text-gray-500">{product.category}</p>
                                    <div className="flex items-center justify-between mt-3">
                                        <span className="text-xl font-bold text-indigo-600">
                                            ₦{product.price.toLocaleString()}
                                        </span>
                                        <button
                                            onClick={() => addToCart(product.id)}
                                            className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700"
                                        >
                                            Add to Cart
                                        </button>
                                    </div>
                                    <p className="text-xs text-gray-500 mt-2">Stock: {product.stock}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                )}

                {view === 'cart' && (
                    <div className="max-w-2xl mx-auto space-y-4">
                        {cart.length > 0 ? (
                            <>
                                {cart.map(item => (
                                    <div key={item.id} className="bg-white p-4 rounded-xl shadow-sm flex items-center justify-between">
                                        <div className="flex items-center space-x-4">
                                            <img
                                                src={item.product?.imageUrl}
                                                alt={item.product?.name}
                                                className="w-16 h-16 object-cover rounded-lg"
                                            />
                                            <div>
                                                <h4 className="font-semibold">{item.product?.name}</h4>
                                                <p className="text-sm text-gray-500">Quantity: {item.quantity}</p>
                                            </div>
                                        </div>
                                        <div className="flex items-center space-x-4">
                                            <span className="font-bold text-lg">
                                                ₦{((item.product?.price || 0) * item.quantity).toLocaleString()}
                                            </span>
                                            <button
                                                onClick={() => removeFromCart(item.id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                Remove
                                            </button>
                                        </div>
                                    </div>
                                ))}

                                <div className="bg-indigo-50 p-6 rounded-xl">
                                    <div className="flex justify-between items-center mb-4">
                                        <span className="text-lg font-semibold">Total</span>
                                        <span className="text-2xl font-bold text-indigo-600">
                                            ₦{cartTotal.toLocaleString()}
                                        </span>
                                    </div>
                                    <button
                                        onClick={checkout}
                                        className="w-full bg-indigo-600 text-white py-3 rounded-lg font-semibold hover:bg-indigo-700 flex items-center justify-center space-x-2"
                                    >
                                        <ShoppingCartIcon className="h-5 w-5" />
                                        <span>Proceed to Checkout</span>
                                    </button>
                                </div>
                            </>
                        ) : (
                            <div className="text-center py-16">
                                <ShoppingCartIcon className="h-16 w-16 text-gray-300 mx-auto mb-4" />
                                <p className="text-gray-500">Your cart is empty</p>
                            </div>
                        )}
                    </div>
                )}

                {view === 'orders' && (
                    <div className="max-w-2xl mx-auto">
                        <p className="text-center text-gray-500 py-16">Order history will appear here</p>
                    </div>
                )}
            </div>
        </div>
    );
};

export default EnhancedShop;
