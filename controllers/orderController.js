const Order = require('../models/Order');

// @desc    Create a new shopping mediation order (User)
exports.createOrder = async (req, res) => {
    try {
        const { productUrl, quantity, details } = req.body;

        // استخدمنا req.user.id (اللي جابو الـ middleware)
        const newOrder = await Order.create({
            user: req.user.id, 
            productUrl,
            quantity,
            details
        });

        res.status(201).json(newOrder);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get logged in user orders (User)
exports.getMyOrders = async (req, res) => {
    try {
        // يجيب الطلبات تاع المستخدم اللي راه مسجل دخولو فقط
        const orders = await Order.find({ user: req.user.id });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Get all orders (Admin only)
exports.getAllOrders = async (req, res) => {
    try {
        const orders = await Order.find({}).populate('user', 'name email');
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// @desc    Update order price and status (Admin only)
exports.updateOrderAdmin = async (req, res) => {
    try {
        const { totalPrice, status } = req.body;
        const order = await Order.findById(req.params.id);

        if (!order) {
            return res.status(404).json({ error: 'Order not found' });
        }

        order.totalPrice = totalPrice || order.totalPrice;
        order.status = status || order.status;

        const updatedOrder = await order.save();
        res.status(200).json(updatedOrder);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};