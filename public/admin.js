// --- SECURITY LOCK ---
if (localStorage.getItem('user_id') !== 'admin') {
    alert("Access Denied! Only Admin can view this page.");
    window.location.href = 'index.html';
}
function openTab(tabName) {
    document.querySelectorAll('.tab-section').forEach(tab => tab.classList.remove('active'));
    document.querySelectorAll('.tab-link').forEach(link => link.classList.remove('active'));
    document.getElementById(tabName).classList.add('active');
    event.currentTarget.classList.add('active');

    if (tabName === 'users') loadUsers();
    if (tabName === 'listings') loadListings();
    if (tabName === 'dashboard') loadStats();
}

function logoutAdmin() { localStorage.clear(); window.location.href = 'index.html'; }

async function loadUsers() {
    const res = await fetch('/api/admin/users');
    const users = await res.json();
    document.getElementById('userTableBody').innerHTML = users.map(user => `
        <tr><td>${user.user_id}</td><td>${user.username}</td><td>${user.email}</td><td>${user.phone_number || '-'}</td>
        <td><button class="action-btn btn-trash" onclick="deleteUser(${user.user_id})"><i class="fa-solid fa-trash"></i></button></td></tr>
    `).join('');
}

async function loadListings() {
    const res = await fetch('/api/admin/all-listings');
    const listings = await res.json();
    
    document.getElementById('listingsTableBody').innerHTML = listings.map(item => {
        const badgeClass = item.status === 'Lost' ? 'lost' : 'found';
        const imgHtml = item.image_url ? `<img src="${item.image_url}" width="50" style="border-radius:5px;">` : 'No Image';
        
        return `
        <tr>
            <td><strong>${item.item_name}</strong></td>
            <td>${item.category_name}</td>
            <td>${item.email}</td>
            <td>${item.contact || '-'}</td> <td>${new Date(item.date).toLocaleDateString()}</td>
            <td><span class="badge ${badgeClass}">${item.status}</span></td>
            <td>${imgHtml}</td>
            <td>
                <button class="action-btn btn-trash" onclick="deleteListing(${item.id}, '${item.status}')"><i class="fa-solid fa-trash"></i></button>
                <button class="action-btn btn-mail" onclick="openEmailModal('${item.email}', '${item.item_name}', '${item.status}')"><i class="fa-solid fa-paper-plane"></i></button>
            </td>
        </tr>`;
    }).join('');
}

async function loadStats() {
    const res = await fetch('/api/admin/all-listings');
    const listings = await res.json();
    document.getElementById('statTotal').innerText = listings.length;
    document.getElementById('statResolved').innerText = listings.filter(i => i.status === 'Found').length;
    document.getElementById('statPending').innerText = listings.filter(i => i.status === 'Lost').length;
}

async function deleteUser(id) {
    if(!confirm("Permanently delete user?")) return;
    const res = await fetch(`/api/admin/users/${id}`, { method: 'DELETE' });
    if(res.ok) { alert("User deleted!"); loadUsers(); }
}

async function deleteListing(id, status) {
    if(!confirm(`Delete this ${status} listing?`)) return;
    const res = await fetch(`/api/delete-lost/${id}`, { method: 'DELETE' }); 
    if(res.ok) { alert("Listing deleted!"); loadListings(); loadStats(); }
}

function openEmailModal(email, itemName, status) {
    document.getElementById('emailTo').value = email;
    document.getElementById('emailSubject').value = `Update regarding your ${status} item: ${itemName}`;
    document.getElementById('emailMessage').value = `Hello,\n\nWe have an update regarding your ${itemName}.\n\nPlease check your dashboard.`;
    document.getElementById('emailModal').style.display = 'flex';
}

function closeEmailModal() { document.getElementById('emailModal').style.display = 'none'; }

async function sendEmail() {
    const btn = document.querySelector('.btn-send'); btn.innerText = 'Sending...';
    const res = await fetch('/api/send-email', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            to_email: document.getElementById('emailTo').value,
            subject: document.getElementById('emailSubject').value,
            message: document.getElementById('emailMessage').value
        })
    });
    if(res.ok) { alert("Email sent successfully!"); closeEmailModal(); } else alert("Failed to send email.");
    btn.innerText = 'Send';
}

window.onload = loadStats;