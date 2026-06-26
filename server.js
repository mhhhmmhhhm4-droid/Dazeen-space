const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });

const express = require('express');
const mongoose = require('mongoose');
const multer = require('multer');
const cors = require('cors');
const app = express();

// 1. Middlewares & Static Files
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname)));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 2. Database Connection (تعديل الرابط إلى الصيغة القياسية لتخطي حجب الـ DNS)
const mongoURI = 'mongodb://lunastory:lunastory2000@cluster0-shard-00-00.cho5gkn.mongodb.net:27017,cluster0-shard-00-01.cho5gkn.mongodb.net:27017,cluster0-shard-00-02.cho5gkn.mongodb.net:27017/brokerage_platform?ssl=true&replicaSet=atlas-cho5gkn-shard-0&authSource=admin&retryWrites=true&w=majority';

mongoose.connect(process.env.MONGO_URI, { connectTimeoutMS: 15000 })
.then(() => console.log('✅ MongoDB connected successfully to Atlas Cloud via secured .env file!'))
.catch(err => console.error('❌ Database connection error. Check your .env path or Atlas IP Whitelist:', err));
// 3. Multer Setup for Receipt Uploads
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

// User Schema (with Security Question for Password Recovery)
const userSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    securityQuestion: { type: String, required: true }, 
    isAdmin: { type: Boolean, default: false }
});
const User = mongoose.model('User', userSchema);

// Order Schema (with full workflow tracking)
const orderSchema = new mongoose.Schema({
    userId: String, 
    productLink: String,
    size: String,
    color: String,
    quantity: Number,
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

// 2. تفعيل الـ CORS لتسمح للموقع المحلي بالاتصال بالسيرفر
app.use(cors({
    origin: '*', // يسمح بالاتصال من أي مكان حالياً لتخطي المشكلة أثناء التطوير
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json());
app.use(express.urlencoded({ extended: true }))

// 1. مسار الصفحة الترحيبية (الرئيسية)
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// 1. Route: Register (التسجيل)
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

// 2. Route: Login (تسجيل الدخول)
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

// 3. Route: Password Recovery (استعادة كلمة المرور)
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

// 4. Route: Add New Order (إضافة طلب)
app.post('/api/orders/new', async (req, res) => {
    try {
        const { userId, productLink, size, color, quantity } = req.body;
        const newOrder = new Order({ userId, productLink, size, color, quantity });
        await newOrder.save();
        res.status(201).json({ success: true, message: "Order placed successfully! Waiting for admin pricing." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to submit order." });
    }
});

// مسار عرض صفحة إضافة طلب جديد
app.get('/add-order', (req, res) => {
    res.sendFile(path.join(__dirname, 'add-order.html'));
});

// 5. Route: Navigation to "My Orders" (التنقل إلى طلباتي)
app.get('/api/orders/user/:userId', async (req, res) => {
    try {
        const orders = await Order.find({ userId: req.params.userId });
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching orders." });
    }
});

// 6. Route: Navigation to "My Account" (التنقل إلى حسابي)
app.get('/api/user/profile/:userId', async (req, res) => {
    try {
        const user = await User.findById(req.params.userId).select('-password');
        if (!user) return res.status(404).json({ success: false, message: "User not found." });
        res.status(200).json(user);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error loading profile." });
    }
});

// 7. Route: Support (الدعم)
app.post('/api/support/contact', (req, res) => {
    const { userId, subject, message } = req.body;
    console.log(`📩 Support ticket received from ${userId}: [${subject}] - ${message}`);
    res.status(200).json({ success: true, message: "Support ticket received. We will contact you soon." });
});

// 8. Route: Logout (تسجيل الخروج)
app.post('/api/auth/logout', (req, res) => {
    res.status(200).json({ success: true, message: "Logged out successfully." });
});

// 9. Route: Delete Order (حذف الطلب)
app.delete('/api/orders/delete/:orderId', async (req, res) => {
    try {
        await Order.findByIdAndDelete(req.params.orderId);
        res.status(200).json({ success: true, message: "Order deleted successfully." });
    } catch (error) {
        res.status(500).json({ success: false, message: "Failed to delete order." });
    }
});

// 10 & 11. Route: Payment & Upload Slip (الدفع ورفع الوصل)
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


// ================= 6. Server Initialization =================

app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'login.html'));
});

// مسار خاص بالآدمن لجلب جميع طلبات المستخدمين
app.get('/api/admin/orders', async (req, res) => {
    try {
        const orders = await Order.find({}); // جلب كل شيء بدون تصفية
        res.status(200).json(orders);
    } catch (error) {
        res.status(500).json({ success: false, message: "Error fetching all orders." });
    }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
    console.log(`🚀 Server is running and protected on: http://localhost:${PORT}`);
});