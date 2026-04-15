// c:\xampp\htdocs\anti\js\buyer.js
document.addEventListener('DOMContentLoaded', async () => {
    const user = await window.checkAuth('buyer');
    if (!user) return; // checkAuth redirects to login.html
    updateCartBadge();
});

// Update cart badge dynamically
window.updateCartBadge = async function() {
    const res = await window.apiCall('buyer.php?action=get_cart');
    const badge = document.getElementById('cart-badge');
    if(res.status === 'success' && badge) {
        const qty = res.items.reduce((acc, item) => acc + parseInt(item.quantity), 0);
        badge.innerText = qty;
        badge.style.display = qty > 0 ? 'inline-block' : 'none';
    }
};

window.initExplore = function() {
    const searchInp = document.getElementById('searchInput');
    const catSel = document.getElementById('catSelect');
    const sortSel = document.getElementById('sortSelect');
    const grid = document.getElementById('productsGrid');

    async function load() {
        grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted);">Loading products...</div>';
        const q = new URLSearchParams({
            action: 'explore',
            q: searchInp.value,
            category: catSel.value,
            sort: sortSel.value
        });
        const res = await window.apiCall('buyer.php?' + q.toString());
        if (res.status === 'success') {
            grid.innerHTML = '';
            if (res.products.length === 0) {
                grid.innerHTML = '<div style="grid-column: 1/-1; text-align:center; padding: 40px; color: var(--text-muted)">No products found matching your criteria.</div>';
                return;
            }
            res.products.forEach(p => {
                const dummyImg = 'https://placehold.co/400x300?text=No+Image';
                let img = p.image_url && p.image_url.trim() !== '' ? p.image_url : dummyImg;
                if (img === 'images/placeholder-product.jpg') img = dummyImg;
                
                grid.innerHTML += `
                    <div class="card glass-panel interactive-hover slide-up">
                        <div style="position:relative; overflow:hidden; border-radius:20px 20px 0 0;">
                            <img src="${img}" class="card-img" style="border-bottom: 1px solid #f0f0f0;" onerror="this.src='${dummyImg}'">
                        </div>
                        <div class="card-body">
                            <span style="font-size:0.75rem; background:#e8f5e9; color: var(--primary-dark); padding: 4px 10px; border-radius:12px; font-weight: 600;">${p.category}</span>
                            ${p.harvest_date ? `<span style="font-size:0.75rem; background:#fff3e0; color: #e65100; padding: 4px 10px; border-radius:12px; font-weight: 600; margin-left: 5px;">Picked: ${p.harvest_date}</span>` : ''}
                            <div class="card-title" style="margin-top: 15px;">${p.name}</div>
                            <div class="card-text" style="min-height: 45px; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;">${p.description}</div>
                            <div style="font-size: 0.85rem; color: var(--text-muted); margin-bottom: 15px; border-top: 1px dashed #eee; padding-top: 10px;">
                                <div>Farm: <strong>${p.farmer_name}</strong></div>
                                <div style="margin-top:4px;">Stock: ${p.stock} &nbsp;|&nbsp; Min Order: ${p.moq || 1}</div>
                            </div>
                            <div style="display:flex; justify-content: space-between; align-items:center;">
                                <div class="card-price" style="margin: 0;">₹${parseFloat(p.price).toFixed(2)}<span style="font-size:0.9rem; color:var(--text-muted);"> / ${p.unit_type || 'Kg'}</span></div>
                                <button class="btn btn-primary" style="padding: 8px 16px; font-size: 0.9rem;" onclick="addToCart(${p.id})">Add to Cart</button>
                            </div>
                        </div>
                    </div>
                `;
            });
        }
    }

    let timeout = null;
    searchInp.addEventListener('input', () => { clearTimeout(timeout); timeout = setTimeout(load, 500); });
    catSel.addEventListener('change', load);
    sortSel.addEventListener('change', load);

    load(); 
    
    window.addToCart = async function(id) {
        const res = await window.apiCall('buyer.php?action=add_to_cart', 'POST', {product_id: id, quantity: 1});
        if (res.status === 'success') {
            window.showToast('Added to cart!');
            window.updateCartBadge();
        } else {
            window.showToast(res.message, 'error');
        }
    };
};

window.initCart = function() {
    const tableBody = document.querySelector('#cartTable tbody');
    const totalEl = document.getElementById('cartTotal');
    const checkoutBtn = document.getElementById('checkoutBtn');
    let currentCartData = [];
    let currentTotal = 0;

    async function load() {
        const res = await window.apiCall('buyer.php?action=get_cart');
        if (res.status === 'success') {
            tableBody.innerHTML = '';
            currentCartData = res.items || [];
            currentTotal = res.total || 0;
            if (res.items.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 40px; color: var(--text-muted);">Your cart is empty. <br><br> <a href="explore.html" class="btn btn-outline">Start Exploring</a></td></tr>';
                totalEl.innerText = '₹0.00';
                checkoutBtn.disabled = true;
                return;
            }
            checkoutBtn.disabled = false;
            
            res.items.forEach(item => {
                const dummyImg = 'https://placehold.co/100x100?text=No+Img';
                let img = item.image_url && item.image_url.trim() !== '' ? item.image_url : dummyImg;
                if (img === 'images/placeholder-product.jpg') img = dummyImg;
                
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td>
                        <div style="display:flex; align-items:center; gap: 15px;">
                            <img src="${img}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;" onerror="this.src='${dummyImg}'">
                            <div>
                                <div style="font-weight:600; font-size:1.1rem">${item.name}</div>
                                <div style="font-size:0.85rem; color:var(--text-muted); margin-top: 4px;">Farm: ${item.farmer_name}</div>
                            </div>
                        </div>
                    </td>
                    <td style="color:var(--primary); font-weight:600;">₹${parseFloat(item.price).toFixed(2)}<span style="font-size:0.85rem; color:var(--text-muted); font-weight:normal;"> / ${item.unit_type || 'Kg'}</span></td>
                    <td>
                        <div style="display:flex; align-items:center; background: #fafafa; border: 1px solid #eee; border-radius: 8px; width: fit-content; overflow: hidden;">
                            <button class="btn" style="background:transparent; color:#555; padding: 6px 12px; border-radius: 0;" onclick="updateCart(${item.id}, ${item.quantity-1})">-</button>
                            <span style="width:30px; text-align:center; font-weight:600;">${item.quantity}</span>
                            <button class="btn" style="background:transparent; color:#555; padding: 6px 12px; border-radius: 0;" onclick="updateCart(${item.id}, ${item.quantity+1})">+</button>
                        </div>
                    </td>
                    <td style="font-weight:700; font-size:1.1rem;">₹${parseFloat(item.price * item.quantity).toFixed(2)}</td>
                    <td><button class="btn btn-outline" style="padding:6px 12px; border-color: var(--alert-error); color: var(--alert-error); font-size:0.85rem;" onclick="updateCart(${item.id}, 0)">×</button></td>
                `;
                tableBody.appendChild(tr);
            });
            totalEl.innerText = '₹' + parseFloat(res.total).toFixed(2);
        }
    }

    load();

    window.updateCart = async function(id, qty) {
        const res = await window.apiCall('buyer.php?action=update_cart', 'POST', {cart_id: id, quantity: qty});
        if (res.status === 'success') {
            load();
            window.updateCartBadge();
        } else {
            window.showToast(res.message, 'error');
        }
    };

    window.closeAddressModal = () => document.getElementById('addressModal').style.display = 'none';
    window.closeInvoiceModal = () => document.getElementById('invoiceModal').style.display = 'none';

    checkoutBtn.addEventListener('click', async () => {
        document.getElementById('addressModal').style.display = 'flex';
        const profRes = await window.apiCall('buyer.php?action=get_profile');
        if(profRes.status === 'success' && profRes.profile) {
            document.getElementById('checkoutName').value = profRes.profile.name || '';
            document.getElementById('checkoutPhone').value = profRes.profile.phone || '';
        }
    });

    document.getElementById('confirmOrderBtn').addEventListener('click', async () => {
        const name = document.getElementById('checkoutName').value;
        const phone = document.getElementById('checkoutPhone').value;
        const address = document.getElementById('checkoutAddress').value;

        if(!address) {
            window.showToast('Please enter a shipping address', 'error');
            return;
        }

        const confirmBtn = document.getElementById('confirmOrderBtn');
        const originalText = confirmBtn.textContent;
        confirmBtn.textContent = 'Processing...';
        confirmBtn.disabled = true;
        
        const res = await window.apiCall('buyer.php?action=checkout', 'POST', {
            shipping_address: address,
            name: name,
            phone: phone
        });
        
        setTimeout(() => {
            if(res.status === 'success') {
                window.closeAddressModal();
                window.showToast('Order Placed Successfully!', 'success');
                
                showInvoice(res.order_id, name, phone, address);
                
                load();
                window.updateCartBadge();
            } else {
                window.showToast(res.message, 'error');
            }
            confirmBtn.textContent = originalText;
            confirmBtn.disabled = false;
        }, 1000);
    });

    function showInvoice(orderId, name, phone, address) {
        const invoiceContent = document.getElementById('invoiceContent');
        let date = new Date().toLocaleDateString();
        
        let itemsHtml = `
            <table style="width:100%; margin-top:15px; border-collapse: collapse;">
                <tr style="border-bottom: 2px solid #eee; text-align: left;">
                    <th style="padding:8px">Item</th>
                    <th style="padding:8px">Qty</th>
                    <th style="padding:8px">Total</th>
                </tr>
        `;
        currentCartData.forEach(item => {
            itemsHtml += `
                <tr style="border-bottom: 1px solid #eee;">
                    <td style="padding:8px">${item.name}</td>
                    <td style="padding:8px">${item.quantity}</td>
                    <td style="padding:8px">₹${(item.price * item.quantity).toFixed(2)}</td>
                </tr>
            `;
        });
        itemsHtml += `
                <tr>
                    <td colspan="2" style="text-align:right; font-weight:bold; padding:15px 8px;">Grand Total:</td>
                    <td style="font-weight:bold; font-size:1.1rem; padding:15px 8px; color:var(--primary);">₹${parseFloat(currentTotal).toFixed(2)}</td>
                </tr>
            </table>
        `;

        const html = `
            <div style="font-size: 0.95rem; line-height: 1.6;">
                <div style="display:flex; justify-content:space-between; border-bottom:1px solid #eee; padding-bottom:15px; margin-bottom:15px;">
                    <div>
                        <strong>Order ID:</strong> #ORD-${orderId}<br>
                        <strong>Date:</strong> ${date}
                    </div>
                    <div style="text-align:right;">
                        <strong>Status:</strong> <span style="color:var(--primary);">Confirmed</span>
                    </div>
                </div>
                <div style="margin-bottom:20px;">
                    <strong style="color:var(--text-muted); font-size:0.85rem; text-transform:uppercase;">Billed To:</strong><br>
                    <strong>${name}</strong><br>
                    ${phone ? `Phone: ${phone}<br>` : ''}
                    ${address.replace(/\n/g, '<br>')}
                </div>
                <div>
                    <strong style="color:var(--text-muted); font-size:0.85rem; text-transform:uppercase;">Order Summary:</strong>
                    ${itemsHtml}
                </div>
            </div>
        `;
        invoiceContent.innerHTML = html;
        document.getElementById('invoiceModal').style.display = 'flex';
    }

    document.getElementById('downloadBillBtn').addEventListener('click', () => {
        // Add a print-specific class to body
        document.body.classList.add('printing-invoice');
        window.print();
        setTimeout(() => document.body.classList.remove('printing-invoice'), 500);
    });
};
