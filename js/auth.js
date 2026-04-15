// c:\xampp\htdocs\anti\js\auth.js

document.addEventListener('DOMContentLoaded', () => {

    // Register Form Handler
    const registerForm = document.getElementById('registerForm');
    if (registerForm) {
        registerForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = registerForm.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Processing...';
            btn.disabled = true;

            const name = document.getElementById('name').value;
            const email = document.getElementById('email').value;
            const phone = document.getElementById('phone').value;
            const password = document.getElementById('password').value;
            const roleEl = document.querySelector('input[name="role"]:checked');
            const role = roleEl ? roleEl.value : 'buyer';

            const payload = { role, name, email, phone, password };

            const res = await window.apiCall('auth.php?action=register', 'POST', payload);

            btn.textContent = originalText;
            btn.disabled = false;

            if (res.status === 'success') {
                window.showToast('Registration successful! Redirecting to login...', 'success');
                setTimeout(() => {
                    window.location.href = 'login.html';
                }, 1500);
            } else {
                window.showToast(res.message, 'error');
            }
        });
    }

    // Login Form Handler
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            
            const btn = loginForm.querySelector('button');
            const originalText = btn.textContent;
            btn.textContent = 'Authenticating...';
            btn.disabled = true;

            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;

            const res = await window.apiCall('auth.php?action=login', 'POST', { email, password });

            btn.textContent = originalText;
            btn.disabled = false;

            if (res.status === 'success') {
                window.showToast('Welcome back!', 'success');
                setTimeout(() => {
                    const dest = res.user.role === 'farmer' ? 'farmer_dashboard.html' : 'index.html';
                    window.location.href = dest;
                }, 1000);
            } else {
                window.showToast(res.message || 'Login failed', 'error');
            }
        });
    }
});
