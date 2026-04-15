// c:\xampp\htdocs\anti\js\main.js

document.addEventListener('DOMContentLoaded', () => {
    // 1. Navbar Scroll Effect
    const navbar = document.querySelector('.navbar');
    if (navbar) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 20) {
                navbar.classList.add('scrolled');
            } else {
                navbar.classList.removeAttribute('scrolled');
            }
        });
    }

    // 2. Setup Global API Caller
    window.apiCall = async function(endpoint, method = 'GET', data = null) {
        const options = {
            method: method,
            headers: { 'Accept': 'application/json' }
        };

        if (data) {
            if (data instanceof FormData) {
                options.body = data;
            } else {
                options.headers['Content-Type'] = 'application/json';
                options.body = JSON.stringify(data);
            }
        }

        try {
            const response = await fetch(`/anti/api/${endpoint}`, options);
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const result = await response.json();
            return result;
        } catch (error) {
            console.error('API Error:', error);
            return { status: 'error', message: 'Network or Server Error: ' + error.message };
        }
    };

    // 3. Global Toast Notification
    window.showToast = function(message, type = 'success') {
        // Remove existing toasts to prevent clutter
        const existing = document.querySelector('.toast');
        if (existing) existing.remove();

        const toast = document.createElement('div');
        toast.className = `toast slide-up`;
        toast.style.position = 'fixed';
        toast.style.bottom = '30px';
        toast.style.right = '30px';
        toast.style.padding = '14px 28px';
        toast.style.borderRadius = '8px';
        toast.style.background = type === 'success' ? 'var(--alert-success)' : 'var(--alert-error)';
        toast.style.color = 'white';
        toast.style.fontWeight = '600';
        toast.style.zIndex = '9999';
        toast.style.boxShadow = 'var(--shadow)';
        toast.style.display = 'flex';
        toast.style.alignItems = 'center';
        toast.style.gap = '10px';
        
        // Setup icon
        const icon = type === 'success' ? '✓' : '✕';
        toast.innerHTML = `<span style="font-size: 1.2rem">${icon}</span> ${message}`;

        document.body.appendChild(toast);

        // Disappear after 3.5s
        setTimeout(() => {
            toast.style.opacity = '0';
            toast.style.transform = 'translateY(20px)';
            toast.style.transition = 'all 0.4s ease';
            setTimeout(() => toast.remove(), 400);
        }, 3500);
    };

    // 4. Update UI based on User Session (Authentication Guard)
    window.checkAuth = async function(requiredRole = null) {
        const res = await window.apiCall('auth.php?action=session');
        if (res.status === 'success' && res.user) {
            // User is logged in
            if (requiredRole && res.user.role !== requiredRole) {
                window.location.href = res.user.role === 'farmer' ? 'farmer_dashboard.html' : 'index.html';
                return null;
            }
            
            // Populate user info in navbar if exists
            const userInfoEl = document.getElementById('user-info-name');
            if(userInfoEl) userInfoEl.textContent = res.user.name;

            return res.user;
        } else {
            // Not logged in
            if (requiredRole) {
                window.location.href = 'login.html';
            }
            return null;
        }
    };

    // 5. Logout Handler
    window.logout = async function() {
        const res = await window.apiCall('auth.php?action=logout', 'POST');
        if (res.status === 'success') {
            window.location.href = 'login.html';
        }
    };
    
    // Bind logout buttons
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            window.logout();
        });
    }
});
