// c:\xampp\htdocs\anti\js\tracking.js

document.addEventListener('DOMContentLoaded', async () => {
    // buyer.js already handles checkAuth on DOM load effectively, but wait, buyer.js has DOMContentLoaded doing checkAuth and updateCartBadge.
    // If we include both, both listeners trigger. 
    initTracking();
});

async function initTracking() {
    const container = document.getElementById('ordersContainer');
    if (!container) return; // safety check
    
    container.innerHTML = '<div style="text-align:center; padding: 40px; color: var(--text-muted);">Loading orders...</div>';
    
    const res = await window.apiCall('buyer.php?action=get_orders');
    if(res.status === 'success') {
        container.innerHTML = '';
        if(res.orders.length === 0) {
            container.innerHTML = '<div class="card glass-panel" style="padding:60px; text-align:center; color:var(--text-muted); font-size:1.1rem;">You have not placed any orders yet.<br><br><a href="explore.html" class="btn btn-primary" style="margin-top:20px;">Start Shopping</a></div>';
            return;
        }
        
        res.orders.forEach(order => {
            const date = new Date(order.created_at).toLocaleString();
            let itemsHtml = '';
            order.items.forEach(item => {
                itemsHtml += `
                    <div style="display:flex; justify-content:space-between; padding: 10px 0; border-bottom: 1px dashed #e0e0e0;">
                        <span><strong style="color:var(--primary-dark);">${item.quantity} ${item.unit_type}</strong> of ${item.name} <small style="color:#888;">(from ${item.farmer_name})</small></span>
                        <strong style="color:var(--text-main);">₹${parseFloat(item.price * item.quantity).toFixed(2)}</strong>
                    </div>
                `;
            });
            
            const steps = ['Placed', 'Processing', 'Shipped', 'Delivered'];
            const curIdx = steps.indexOf(order.tracking_status || 'Placed');
            let timelineHtml = '<div style="display:flex; justify-content:space-between; margin-top: 35px; position:relative;">';
            
            // timeline bar background and progress
            timelineHtml += `<div style="position:absolute; top:12px; left:12.5%; right:12.5%; height:4px; background:#e0e0e0; z-index:0; border-radius:2px;">
                <div style="height:100%; width:${(curIdx / (steps.length-1)) * 100}%; background:var(--primary); transition: width 0.5s ease-in-out; border-radius:2px;"></div>
            </div>`;
            
            steps.forEach((step, idx) => {
                const isActive = idx <= curIdx;
                const color = isActive ? 'var(--primary)' : '#e0e0e0';
                const textColor = isActive ? '#333' : '#999';
                const fontWeight = idx === curIdx ? '700' : '500';
                
                timelineHtml += `
                    <div style="display:flex; flex-direction:column; align-items:center; z-index:1; width:25%;">
                        <div style="width:28px; height:28px; border-radius:50%; background:${color}; color:${isActive?'white':'#999'}; display:flex; align-items:center; justify-content:center; font-weight:bold; border: 4px solid white; box-shadow: 0 0 0 1px ${isActive?color:'#e0e0e0'}; transition: all 0.3s;">
                            ${isActive ? '✓' : idx+1}
                        </div>
                        <div style="margin-top:10px; font-size:0.85rem; color:${textColor}; font-weight:${fontWeight}; text-transform:uppercase; letter-spacing:0.5px;">${step}</div>
                    </div>
                `;
            });
            timelineHtml += '</div>';

            container.innerHTML += `
                <div class="card glass-panel slide-up">
                    <div class="card-body" style="padding: 30px;">
                        <div style="display:flex; justify-content:space-between; margin-bottom: 25px; align-items:flex-start;">
                            <div>
                                <h3 style="margin:0; font-size:1.4rem; color:var(--text-main);">Order #${order.id}</h3>
                                <div style="font-size:0.9rem; color:var(--text-muted); margin-top:6px;">Placed on: ${date}</div>
                            </div>
                            <div style="text-align:right;">
                                <div style="font-size:1.5rem; font-weight:700; color:var(--primary);">₹${parseFloat(order.total).toFixed(2)}</div>
                                <div style="font-size:0.9rem; color:var(--text-muted); margin-top:4px;">${order.items.length} unique produce item(s)</div>
                            </div>
                        </div>
                        
                        <div style="background:#f9f9f9; padding:20px; border-radius:12px; border:1px solid #f0f0f0; margin-bottom:25px;">
                            <h4 style="margin-top:0; margin-bottom:15px; font-size:1rem; color:#444; border-bottom:1px solid #eee; padding-bottom:10px;">Items Summary</h4>
                            ${itemsHtml}
                        </div>
                        
                        ${timelineHtml}
                    </div>
                </div>
            `;
        });
    }
}
