import prisma from '../config/database';
import { SocketService } from './socket.service';

function notFound(entity: string) {
    const err: any = new Error(`${entity} not found`);
    err.statusCode = 404;
    return err;
}

export class StoreService {
    // -------- Products --------

    static async getProducts(schoolId: string) {
        return prisma.storeProduct.findMany({
            where: { school_id: schoolId },
            orderBy: { created_at: 'desc' }
        });
    }

    static async getProduct(schoolId: string, id: string) {
        const product = await prisma.storeProduct.findFirst({ where: { id, school_id: schoolId } });
        if (!product) throw notFound('Product');
        return product;
    }

    static async createProduct(schoolId: string, data: any) {
        const product = await prisma.storeProduct.create({
            data: {
                school_id: schoolId,
                name: data.name,
                description: data.description || null,
                category: data.category || null,
                price: Number(data.price) || 0,
                stock: Number(data.stock) || 0,
                image_url: data.image_url || data.imageUrl || null,
                is_active: data.is_active !== false,
            }
        });
        SocketService.emitToSchool(schoolId, 'store:updated', { action: 'product_create', productId: product.id });
        return product;
    }

    static async updateProduct(schoolId: string, id: string, data: any) {
        const existing = await prisma.storeProduct.findFirst({ where: { id, school_id: schoolId } });
        if (!existing) throw notFound('Product');
        const product = await prisma.storeProduct.update({
            where: { id: existing.id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.category !== undefined && { category: data.category }),
                ...(data.price !== undefined && { price: Number(data.price) }),
                ...(data.stock !== undefined && { stock: Number(data.stock) }),
                ...(data.image_url !== undefined && { image_url: data.image_url }),
                ...(data.is_active !== undefined && { is_active: data.is_active }),
            }
        });
        SocketService.emitToSchool(schoolId, 'store:updated', { action: 'product_update', productId: id });
        return product;
    }

    static async deleteProduct(schoolId: string, id: string) {
        const existing = await prisma.storeProduct.findFirst({ where: { id, school_id: schoolId } });
        if (!existing) throw notFound('Product');
        await prisma.storeProduct.delete({ where: { id: existing.id } });
        SocketService.emitToSchool(schoolId, 'store:updated', { action: 'product_delete', productId: id });
        return true;
    }

    // -------- Orders --------

    static async getOrders(schoolId: string) {
        return prisma.storeOrder.findMany({
            where: { school_id: schoolId },
            include: { items: true },
            orderBy: { order_date: 'desc' }
        });
    }

    static async getOrder(schoolId: string, id: string) {
        const order = await prisma.storeOrder.findFirst({
            where: { id, school_id: schoolId },
            include: { items: true }
        });
        if (!order) throw notFound('Order');
        return order;
    }

    static async createOrder(schoolId: string, data: any) {
        const items: Array<{ productName: string; quantity: number; unitPrice: number }> = data.items || [];
        const totalAmount = data.totalAmount ?? items.reduce((s, it) => s + (Number(it.unitPrice) * Number(it.quantity)), 0);

        const order = await prisma.storeOrder.create({
            data: {
                school_id: schoolId,
                customer_name: data.customerName || data.customer_name || 'Unknown',
                customer_email: data.customerEmail || data.customer_email || null,
                total_amount: Number(totalAmount) || 0,
                status: data.status || 'Pending',
                items: items.length > 0 ? {
                    create: items.map(it => ({
                        product_name: it.productName,
                        quantity: Number(it.quantity) || 1,
                        unit_price: Number(it.unitPrice) || 0,
                        subtotal: (Number(it.quantity) || 1) * (Number(it.unitPrice) || 0),
                        school_id: schoolId,
                    }))
                } : undefined,
            },
            include: { items: true }
        });
        SocketService.emitToSchool(schoolId, 'store:updated', { action: 'order_create', orderId: order.id });
        return order;
    }

    static async updateOrderStatus(schoolId: string, id: string, status: string) {
        const existing = await prisma.storeOrder.findFirst({ where: { id, school_id: schoolId } });
        if (!existing) throw notFound('Order');
        const order = await prisma.storeOrder.update({
            where: { id: existing.id },
            data: { status }
        });
        SocketService.emitToSchool(schoolId, 'store:updated', { action: 'order_status', orderId: id });
        return order;
    }
}
