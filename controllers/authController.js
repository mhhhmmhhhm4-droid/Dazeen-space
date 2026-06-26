const User = require('../models/User');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');

// Helper function to generate JWT Token
const generateToken = (id) => {
    return jwt.sign({ id }, process.env.JWT_SECRET || 'secret_key_123', {
        expiresIn: '30d' // صححناها من '30deg' إلى '30d' (أيام)
    });
};

// @desc    Register a new user
exports.registerUser = async (req, res) => {
    try {
        console.log("البيانات المستلمة من المتصفح:", req.body); // هذا السطر سيطبع البيانات في الترمينال

        const { name, email, phone, password, securityQuestion, securityAnswer } = req.body;

        // التحقق من وجود الحقول
        if (!name || !email || !password || !securityQuestion || !securityAnswer) {
            return res.status(400).json({ error: 'يرجى ملء جميع الحقول المطلوبة' });
        }

        const userExists = await User.findOne({ $or: [{ email }, { phone }] });
        if (userExists) {
            return res.status(400).json({ error: 'البريد الإلكتروني أو رقم الهاتف مسجل مسبقاً!' });
        }

        const user = await User.create({ 
            name, email, phone, password, securityQuestion, securityAnswer 
        });

        res.status(201).json({ message: "تم إنشاء الحساب بنجاح!" });

    } catch (error) {
        console.error("الخطأ الحقيقي في السيرفر:", error); // هذا السطر سيطبع سبب الـ 500
        res.status(500).json({ error: error.message });
    }
};
// @desc    Auth user & get token (Login)
exports.loginUser = async (req, res) => {
    try {
        const { email, password } = req.body;

        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة السر غير صحيحة' });
        }

        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: 'البريد الإلكتروني أو كلمة السر غير صحيحة' });
        }

        res.status(200).json({
            _id: user._id,
            name: user.name,
            email: user.email,
            role: user.role,
            token: generateToken(user._id)
        });
        
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};