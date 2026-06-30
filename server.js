const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const app = express();

// ================= 1. Global Middlewares & CORS (تفعيل في البداية لحل مشكلة الـ CORS تماماً) =================
app.use(cors({
    origin: '*', // يسمح بالاتصال من أي مكان حالياً لتخطي المشكلة أثناء التطوير
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ================= 2. Database Connection =================
mongoose.connect(process.env.MONGO_URI, { connectTimeoutMS: 15000 })
.then(() => console.log('✅ MongoDB connected successfully to Atlas Cloud via secured .env file!'))
.catch(err => console.error('❌ Database connection error. Check your .env path or Atlas IP Whitelist:', err));

// ================= 3. Multer Setup for Receipt Uploads =================
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, 'uploads/');
    },
    filename: function (req, file, cb) {
        cb(null, Date.now() + '-' + file.originalname);
    }
});
const upload = multer({ storage: storage });


// ================= 4. Database Models =================

// User Schema
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    securityQuestion: { type: String, required: true }, 
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Order Schema (تم إضافة حقل notes هنا لحفظ الملاحظات بنجاح)
const orderSchema = new mongoose.Schema({
    userId: String, 
    productLink: String,
    size: String,
    color: String,
    quantity: Number,
    notes: { type: String, default: '' }, // الحقل الجديد 
    status: { type: String, default: 'Pending' }, 
    price: { type: Number, default: 0 },
    shippingDetails: {
        firstName: String,
        lastName: String,
        phone: String,
        wilaya: String,
        address: String,
        zipCode: String
    },
    receiptUrl: String 
});
const Order = mongoose.model('Order', orderSchema);


// ================= 5. API Routes =================

// مسار الصفحة الرئيسية
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Route: Register (التسجيل)
app.post('/api/auth/register', async (req, res) => {
    try {
        const { username, email, password, securityQuestion } = req.body;
        const newUser = new User({ username, email, password, securityQuestion });
        await newUser.save();
        res.status(201).json({ success: true, message: "Registration successful!" });
    } catch (error) {
        res.status(400).json({ success: false, message: "Registration failed. Email or Username might be taken." });
    }
});

// Route: Login (تسجيل الدخول)
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        const user = await User.findOne({ email, password });
        if (!user) return res.status(400).json({ success: false, message: "Invalid email or password." });
        res.status(200).json({ success: true, message: "Login successful.", userId: user._id, isAdmin: user.isAdmin });
    } catch (error) {
        res.status(500).json({ success: false, message: "Server error during login." });
    }
});

// Route: Password Recovery (استعادة كلمة المرور)
app.post('/api/auth/recover', async (req, res) => {
    try {
        const { email, securityQuestion, newPassword } = req.body;
        const user = await User.findOne({ email, securityQuestion });
        if (!user) return res.status(400).json({ success: false, message: "Incorrect email or security answer." });
        
        user.password = newPassword;
        await user.save();
        res.status(200).json({ success: true, message: "Password updated successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error resetting password." });
    }
});

// Route: Add New Order (تعديل المسار ليستقبل ويحفظ حقل الملاحظات notes بنجاح)
app.post('/api/orders/new', async (req, res) => {
    try {
        const { userId, productLink, size, color, quantity, notes } = req.body;
        const newOrder = new Order({ userId, productLink, size, color, quantity, notes });
        await newOrder.save();
        res.status(201).json({ success: true, message: "Order placed successfully! Waiting for admin pricing." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to submit order." });
    }
});

// مسار عرض صفحة إضافة طلب جديد
app.get('/add-order.html', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-order.html'));
});

// Route: Navigation to "My Orders" (طلباتي للزبون)
app.get('/api/orders/user/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching orders." });
    }
});

// Route: Navigation to "My Account" (حسابي)
app.get('/api/user/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error loading profile." });
    }
});

// Route: Support (الدعم)
app.post('/api/support/contact', (req, res) => {
    const { userId, subject, message } = req.body;
    console.log(`📩 Support ticket received from ${userId}: [${subject}] - ${message}`);
    res.status(200).json({ success: true, message: "Support ticket received. We will contact you soon." });
});

// Route: Logout (تسجيل الخروج)
app.post('/api/auth/logout', (req, res) => {
    res.status(200).json({ success: true, message: "Logged out successfully." });
});

// Route: Delete Order (حذف الطلب)
app.delete('/api/orders/delete/:orderId', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.orderId);
        res.status(200).json({ success: true, message: "Order deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete order." });
    }
});

// Route: Payment & Upload Slip (الدفع ورفع الوصل)
app.post('/api/orders/checkout/:orderId', upload.single('receiptFile'), async (req, res) => {
    try {
        const { firstName, lastName, phone, wilaya, address, zipCode } = req.body;
        const receiptUrl = req.file ? `/uploads/${req.file.filename}` : '';

        await Order.findByIdAndUpdate(req.params.orderId, {
            shippingDetails: { firstName, lastName, phone, wilaya, address, zipCode },
            receiptUrl: receiptUrl,
            status: 'Verifying Payment'
        });

        res.status(200).json({ success: true, message: "Payment info and receipt uploaded successfully!" });
    } catch (error) {
        res.status(500).json({ success: false, message: "Error during checkout process." });
    }
});

// ================= 6. Admin Routes =================

// تعديل رابط الآدمن ليتوافق مع الـ fetch المكتوب في لوحة التحكم المطلوبة سابقا (/api/orders)
app.get('/api/orders', async (req, res) => {
    try {
        const orders = await Order.find({}); // جلب كل طلبات المنصة للآدمن
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching all orders for admin." });
    }
});

// مسار تحديث السعر من طرف الآدمن
app.put('/api/admin/orders/price/:orderId', async (req, res) => {
    try {
        const { price } = req.body;
        const { orderId } = req.params;

        const updatedOrder = await Order.findByIdAndUpdate(
            orderId, 
            { price: price, status: 'Priced' }, 
            { new: true }
        );

        if (!updatedOrder) {
            return res.status(404).json({ success: false, message: "Order not found" });
        }

        res.status(200).json({ success: true, message: "Price updated successfully!" });
    } catch (error) {
        console.error("Error updating price:", error);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// ================= 7. Server Initialization =================

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running and protected on: http://localhost:${PORT}`);
});