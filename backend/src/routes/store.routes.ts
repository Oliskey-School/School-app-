import { Router } from 'express';
import { StoreService } from '../services/store.service';
import { authenticate } from '../middleware/auth.middleware';
import { requireTenant } from '../middleware/tenant.middleware';

const router = Router();

router.use(authenticate, requireTenant);

// ---------- Products ----------
router.get('/products', async (req: any, res) => {
    try {
        const products = await StoreService.getProducts(req.user.school_id);
        res.json(products);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ message: e.message });
    }
});

router.get('/products/:id', async (req: any, res) => {
    try {
        const product = await StoreService.getProduct(req.user.school_id, req.params.id);
        res.json(product);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ message: e.message });
    }
});

router.post('/products', async (req: any, res) => {
    try {
        const product = await StoreService.createProduct(req.user.school_id, req.body);
        res.status(201).json(product);
    } catch (e: any) {
        res.status(e.statusCode || 400).json({ message: e.message });
    }
});

router.patch('/products/:id', async (req: any, res) => {
    try {
        const product = await StoreService.updateProduct(req.user.school_id, req.params.id, req.body);
        res.json(product);
    } catch (e: any) {
        res.status(e.statusCode || 400).json({ message: e.message });
    }
});

router.delete('/products/:id', async (req: any, res) => {
    try {
        await StoreService.deleteProduct(req.user.school_id, req.params.id);
        res.status(204).send();
    } catch (e: any) {
        res.status(e.statusCode || 400).json({ message: e.message });
    }
});

// ---------- Orders ----------
router.get('/orders', async (req: any, res) => {
    try {
        const orders = await StoreService.getOrders(req.user.school_id);
        res.json(orders);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ message: e.message });
    }
});

router.get('/orders/:id', async (req: any, res) => {
    try {
        const order = await StoreService.getOrder(req.user.school_id, req.params.id);
        res.json(order);
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ message: e.message });
    }
});

router.post('/orders', async (req: any, res) => {
    try {
        const order = await StoreService.createOrder(req.user.school_id, req.body);
        res.status(201).json(order);
    } catch (e: any) {
        res.status(e.statusCode || 400).json({ message: e.message });
    }
});

router.patch('/orders/:id/status', async (req: any, res) => {
    try {
        const order = await StoreService.updateOrderStatus(req.user.school_id, req.params.id, req.body.status);
        res.json(order);
    } catch (e: any) {
        res.status(e.statusCode || 400).json({ message: e.message });
    }
});

// Root: summary
router.get('/', async (req: any, res) => {
    try {
        const [products, orders] = await Promise.all([
            StoreService.getProducts(req.user.school_id),
            StoreService.getOrders(req.user.school_id),
        ]);
        res.json({
            products_count: products.length,
            orders_count: orders.length,
            endpoints: [
                'GET /api/store/products', 'POST /api/store/products', 'PATCH /api/store/products/:id', 'DELETE /api/store/products/:id',
                'GET /api/store/orders', 'POST /api/store/orders', 'PATCH /api/store/orders/:id/status'
            ]
        });
    } catch (e: any) {
        res.status(e.statusCode || 500).json({ message: e.message });
    }
});

export default router;
