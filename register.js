document.getElementById('registerForm').addEventListener('submit', async (e) => {
    e.preventDefault(); // منع الصفحة من إعادة التحميل تلقائياً

    // 1. جلب القيم التي كتبها المستخدم في الخانات
    const username = document.getElementById('username').value;
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const securityQuestion = document.getElementById('securityQuestion').value;

    try {
        // 2. إرسال البيانات إلى السيرفر عبر الـ API
        const response = await fetch('https://www.dazeen-space.online/api/auth/register', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password, securityQuestion })
        });

        const data = await response.json();

        // 3. التعامل مع استجابة السيرفر
        if (data.success) {
            alert('تم التسجيل بنجاح! سيتم توجيهك لصفحة الدخول.');
            window.location.href = 'login.html'; // التوجيه تلقائياً لصفحة تسجيل الدخول
        } else {
            alert('خطأ في التسجيل: ' + data.message);
        }

    } catch (error) {
        console.error('Error:', error);
        alert('حدث خطأ أثناء الاتصال بالسيرفر.');
    }
});