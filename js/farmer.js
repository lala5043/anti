// c:\xampp\htdocs\anti\js\farmer.js

document.addEventListener('DOMContentLoaded', async () => {
    // Ensure only farmers access these pages
    const user = await window.checkAuth('farmer');
    if (!user) return; // checkAuth handles redirection
});

// Dashboard Init
window.initFarmerDashboard = async function() {
    const res = await window.apiCall('farmer.php?action=dashboard');
    if (res.status === 'success') {
        document.getElementById('stat-products').innerText = res.stats.total_products;
        
        const formatter = new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' });
        document.getElementById('stat-value').innerText = formatter.format(res.stats.total_value);
        document.getElementById('stat-earnings').innerText = formatter.format(res.stats.earnings);
    }
    
    // Load Orders
    window.loadFarmerOrders = async function() {
        const tableBody = document.querySelector('#ordersTable tbody');
        if (!tableBody) return;
        
        const res = await window.apiCall('farmer.php?action=get_orders');
        if (res.status === 'success') {
            tableBody.innerHTML = '';
            if (res.orders.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="5" style="text-align:center; padding: 30px; color:var(--text-muted);">No orders pending...</td></tr>';
                return;
            }
            
            res.orders.forEach(o => {
                let itemsList = o.items.map(i => `${i.quantity}x ${i.name}`).join('<br>');
                
                const curStatus = o.tracking_status || 'Placed';
                const statusColors = {
                    'Placed': '#f39c12',
                    'Processing': '#3498db',
                    'Shipped': '#9b59b6',
                    'Delivered': '#2ecc71'
                };
                
                let nextAction = '';
                if (curStatus === 'Placed') nextAction = `<button class="btn btn-secondary" onclick="updateOrderStatus(${o.id}, 'Processing')">Start Processing</button>`;
                else if (curStatus === 'Processing') nextAction = `<button class="btn btn-primary" onclick="updateOrderStatus(${o.id}, 'Shipped')">Mark as Shipped</button>`;
                else if (curStatus === 'Shipped') nextAction = `<button class="btn" style="background:#2ecc71; color:white;" onclick="updateOrderStatus(${o.id}, 'Delivered')">Mark Delivered</button>`;
                else nextAction = `<span style="color:#2ecc71; font-weight:bold;">Completed</span>`;

                tableBody.innerHTML += `
                    <tr>
                        <td style="font-weight:700;">#${o.id}</td>
                        <td>
                            <div style="font-weight:600;">${o.buyer_name}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${o.buyer_email}</div>
                            <div style="font-size:0.8rem; color:var(--text-muted);">${o.buyer_phone}</div>
                        </td>
                        <td style="font-size:0.9rem;">${itemsList}</td>
                        <td>
                            <span style="background:${statusColors[curStatus]}20; color:${statusColors[curStatus]}; padding: 4px 8px; border-radius: 4px; font-weight:600; font-size:0.85rem;">${curStatus}</span>
                        </td>
                        <td>${nextAction}</td>
                    </tr>
                `;
            });
        }
    };
    
    window.updateOrderStatus = async function(id, status) {
        if(confirm(`Update Order #${id} to ${status}?`)) {
            const res = await window.apiCall('farmer.php?action=update_order_status', 'POST', {order_id: id, status: status});
            if(res.status === 'success') {
                window.showToast(`Order updated to ${status}`, 'success');
                window.loadFarmerOrders();
            } else {
                window.showToast(res.message, 'error');
            }
        }
    };

    window.loadFarmerOrders();
};

// Manage Products Init
window.initManageProducts = async function() {
    const modal = document.getElementById('productModal');
    const overlay = document.getElementById('modalOverlay');
    const form = document.getElementById('productForm');
    const tableBody = document.querySelector('#productsTable tbody');

    // Fetch and render
    async function loadProducts() {
        const res = await window.apiCall('farmer.php?action=get_products');
        if (res.status === 'success') {
            tableBody.innerHTML = '';
            if (res.products.length === 0) {
                tableBody.innerHTML = '<tr><td colspan="6" style="text-align:center; padding: 30px; color: var(--text-muted);">No products found. Add some to get started!</td></tr>';
                return;
            }
            
            res.products.forEach(p => {
                const tr = document.createElement('tr');
                tr.innerHTML = `
                    <td style="font-weight:600;">${p.name}</td>
                    <td><span style="background:var(--bg-color); padding: 4px 8px; border-radius:4px; font-size:0.85rem;">${p.category}</span></td>
                    <td style="color:var(--primary); font-weight:700;">₹${parseFloat(p.price).toFixed(2)} / ${p.unit_type || 'Kg'}</td>
                    <td><div style="font-weight:600">${p.stock}</div><div style="font-size:0.75rem; color:var(--text-muted)">MOQ: ${p.moq || 1}</div></td>
                    <td style="font-size: 0.9rem; color: var(--text-muted);">${p.harvest_date ? new Date(p.harvest_date).toLocaleDateString() : 'N/A'}</td>
                    <td>
                        <button class="btn btn-secondary" style="padding: 6px 12px; font-size:0.85rem" onclick='editProduct(${JSON.stringify(p).replace(/'/g, "\\'")})'>Edit</button>
                        <button class="btn btn-danger" style="padding: 6px 12px; font-size:0.85rem" onclick='deleteProduct(${p.id})'>Delete</button>
                    </td>
                `;
                tableBody.appendChild(tr);
            });
        }
    }

    loadProducts();

    // Modal behavior
    const openModal = () => { modal.style.display = 'block'; overlay.style.display = 'block'; };
    const closeModal = () => { 
        modal.style.display = 'none'; 
        overlay.style.display = 'none'; 
        form.reset(); 
        document.getElementById('prodId').value = ''; 
        document.getElementById('modalTitle').innerText = 'Add Product';
        const imgInput = document.getElementById('prodImage');
        if (imgInput) imgInput.value = '';
        document.getElementById('prodUnit').value = 'Kg';
        document.getElementById('prodMoq').value = '1';
        document.getElementById('prodHarvest').value = '';
    };

    document.getElementById('openAddModalBtn').addEventListener('click', openModal);
    document.getElementById('closeModalBtn').addEventListener('click', closeModal);
    overlay.addEventListener('click', closeModal);

    // Form Submit (Add/Edit)
    form.addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = document.getElementById('prodId').value;
        const payload = new FormData();
        
        payload.append('id', id);
        payload.append('name', document.getElementById('prodName').value);
        payload.append('category', document.getElementById('prodCat').value);
        payload.append('price', document.getElementById('prodPrice').value);
        payload.append('stock', document.getElementById('prodStock').value);
        payload.append('description', document.getElementById('prodDesc').value);
        payload.append('unit_type', document.getElementById('prodUnit').value);
        payload.append('moq', document.getElementById('prodMoq').value);
        payload.append('harvest_date', document.getElementById('prodHarvest').value);

        const imageFile = document.getElementById('prodImage').files[0];
        if (imageFile) {
            payload.append('image', imageFile);
        }

        const action = id ? 'update_product' : 'add_product';
        const res = await window.apiCall(`farmer.php?action=${action}`, 'POST', payload);
        
        if(res.status === 'success') {
            window.showToast(res.message);
            closeModal();
            loadProducts();
        } else {
            window.showToast(res.message, 'error');
        }
    });

    // Edit Product Window Expose
    window.editProduct = function(p) {
        document.getElementById('modalTitle').innerText = 'Edit Product';
        document.getElementById('prodId').value = p.id;
        document.getElementById('prodName').value = p.name;
        document.getElementById('prodCat').value = p.category;
        document.getElementById('prodPrice').value = p.price;
        document.getElementById('prodStock').value = p.stock;
        document.getElementById('prodDesc').value = p.description;
        document.getElementById('prodUnit').value = p.unit_type || 'Kg';
        document.getElementById('prodMoq').value = p.moq || '1';
        document.getElementById('prodHarvest').value = p.harvest_date || '';
        document.getElementById('prodImage').value = ''; // Reset image selection
        openModal();
    };

    // Delete Product Window Expose
    window.deleteProduct = async function(id) {
        if(confirm('Are you sure you want to delete this product?')) {
            const res = await window.apiCall('farmer.php?action=delete_product', 'POST', {id});
            if (res.status === 'success') {
                window.showToast('Product deleted');
                loadProducts();
            } else {
                window.showToast(res.message, 'error');
            }
        }
    };
};
