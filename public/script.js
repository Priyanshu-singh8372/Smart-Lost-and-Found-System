// --- AUTHENTICATION ---
function toggleForms() {
    const login = document.getElementById('loginSection'), reg = document.getElementById('registerSection'), title = document.getElementById('formTitle');
    if (login.style.display === 'none') { login.style.display = 'block'; reg.style.display = 'none'; title.innerText = 'Account Login'; }
    else { login.style.display = 'none'; reg.style.display = 'block'; title.innerText = 'Register New Account'; }
}

async function registerUser() {
    const res = await fetch('/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            username: document.getElementById('regUsername').value, email: document.getElementById('regEmail').value,
            phone: document.getElementById('regPhone').value, password: document.getElementById('regPassword').value
        })
    });
    if (res.ok) {
        Swal.fire('Welcome Aboard!', 'Registration Successful! You can now log in.', 'success');
        toggleForms();
    } else {
        Swal.fire('Oops...', 'Registration Failed! Try again.', 'error');
    }
}

async function loginUser() {
    const emailInput = document.getElementById('loginEmail').value;
    const passwordInput = document.getElementById('loginPassword').value;

    if (emailInput === 'rajput.25p@gmail.com' && passwordInput === 'P2#singh') {
        localStorage.setItem('user_id', 'admin');
        localStorage.setItem('username', 'Admin Boss');
        Swal.fire({ title: 'System Access Granted', text: 'Welcome back, Administrator.', icon: 'success', timer: 1500, showConfirmButton: false }).then(() => {
            window.location.href = "admin.html";
        });
        return;
    }

    const res = await fetch('/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: emailInput, password: passwordInput })
    });
    const data = await res.json();
    if (res.ok) {
        localStorage.setItem('user_id', data.user_id);
        localStorage.setItem('username', data.username);
        Swal.fire({ title: `Welcome, ${data.username}!`, text: 'Logging you securely into your dashboard...', icon: 'success', timer: 1500, showConfirmButton: false }).then(() => {
            window.location.href = "dashboard.html";
        });
    } else {
        Swal.fire('Access Denied', 'Invalid Email or Password.', 'error');
    }
}

function logout() {
    Swal.fire({ title: 'Logging Out', text: 'See you soon!', icon: 'info', timer: 1200, showConfirmButton: false }).then(() => {
        localStorage.clear(); window.location.href = 'index.html';
    });
}

// --- DASHBOARD: SUBMIT ITEM (WITH TIME HACK) ---
async function submitItem() {
    const formData = new FormData();
    const type = document.getElementById('reportType').value;

    // Time aur Location ko merge karne ka logic 🕒📍
    const locVal = document.getElementById('itemLocation').value;
    const timeVal = document.getElementById('itemTime').value;

    let finalLocation = locVal;
    if (timeVal) {
        finalLocation = `${locVal} (at ${timeVal})`;
    }

    formData.append('user_id', localStorage.getItem('user_id'));
    formData.append('category_id', document.getElementById('itemCategory').value);
    formData.append('item_name', document.getElementById('itemName').value);
    formData.append('description', document.getElementById('description').value);
    formData.append('contact_info', document.getElementById('contactInfo').value);
    formData.append(type === 'lost' ? 'date_lost' : 'date_found', document.getElementById('itemDate').value);

    // Yahan humara merge kiya hua finalLocation jayega
    formData.append(type === 'lost' ? 'location_lost' : 'location_found', finalLocation);

    if (document.getElementById('itemImage').files[0]) {
        formData.append('image', document.getElementById('itemImage').files[0]);
    }

    document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Processing...';

    const res = await fetch(type === 'lost' ? '/api/report-lost' : '/api/report-found', { method: 'POST', body: formData });

    if (res.ok) {
        Swal.fire('Success!', 'Your report has been successfully added to the global inventory.', 'success').then(() => { location.reload(); });
    } else {
        Swal.fire('Error', 'Could not submit report. Check fields.', 'error');
        document.getElementById('submitBtn').innerHTML = '<i class="fa-solid fa-paper-plane"></i> Submit Report';
    }
}

async function loadFeeds() {
    const myId = localStorage.getItem('user_id');

    const lostRes = await fetch('/api/lost-items');
    const lostData = await lostRes.json();
    window.allLostItems = lostData;

    document.getElementById('lostItemsFeed').innerHTML = lostData.map(item => `
        <div class="item-card lost-item" data-category="${item.category_name}">
            <h4>${item.item_name} <small style="color:#3b82f6;">(${item.category_name})</small></h4>
            <div class="meta-info">📍 ${item.location_lost} <br> 📞 ${item.contact_info || 'No contact provided'}</div>
            <p>${item.description}</p>
            ${item.image_url ? `<div class="item-card-image"><img src="${item.image_url}" onclick="openLightbox(this.src)"></div>` : ''}
            
            <div style="display: flex; gap: 10px; margin-top: auto; padding-top: 15px; flex-wrap: wrap;">
                ${item.user_id == myId ? `<button onclick="markRecovered(${item.lost_item_id})" class="btn-primary" style="background:#10b981; flex: 1; padding: 0.6rem;"><i class="fa-solid fa-check-double"></i> Recovered</button>` : ''}
                <button onclick="printPoster(${item.lost_item_id})" class="btn-primary" style="background:#4f46e5; flex: 1; padding: 0.6rem;"><i class="fa-solid fa-print"></i> Print Poster</button>
            </div>
        </div>
    `).join('');

    const foundRes = await fetch('/api/found-items');
    const foundData = await foundRes.json();
    document.getElementById('foundItemsFeed').innerHTML = foundData.map(item => `
        <div class="item-card found-item" data-category="${item.category_name}">
            <h4>${item.item_name} <small style="color:#10b981;">(${item.category_name})</small></h4>
            <div class="meta-info">📍 ${item.location_found} <br> 📞 ${item.contact_info || 'No contact provided'}</div>
            <p>${item.description}</p>
            ${item.image_url ? `<div class="item-card-image"><img src="${item.image_url}" onclick="openLightbox(this.src)"></div>` : ''}
            <button onclick="openChat(${item.found_item_id}, ${item.user_id})" class="btn-primary" style="margin-top:auto;"><i class="fa-solid fa-comment-dots"></i> Claim / Chat</button>
        </div>
    `).join('');

    const matchRes = await fetch('/api/matches');
    const matchData = await matchRes.json();
    document.getElementById('matchesFeed').innerHTML = matchData.map(m => `
        <div class="item-card" style="border-left: 4px solid #10b981;">
            <p>🔥 <b>Smart Match Alert:</b> Lost "${m.lost_name}" matches Found "${m.found_name}"</p>
        </div>
    `).join('');
}

async function markRecovered(id) {
    Swal.fire({
        title: 'Are you sure?', text: "Did you successfully recover this item?", icon: 'warning',
        showCancelButton: true, confirmButtonColor: '#10b981', cancelButtonColor: '#ef4444', confirmButtonText: 'Yes, recovered it!'
    }).then(async (result) => {
        if (result.isConfirmed) {
            const res = await fetch(`/api/delete-lost/${id}`, { method: 'DELETE' });
            if (res.ok) { Swal.fire('Great News!', 'Item removed from active listings.', 'success'); loadFeeds(); }
        }
    });
}

// --- PRINT POSTER LOGIC ---
function printPoster(id) {
    const item = window.allLostItems.find(i => i.lost_item_id === id);
    if (!item) return;
    const printWindow = window.open('', '_blank');
    const formattedDate = new Date(item.date_lost).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });

    printWindow.document.write(`
        <html><head><title>Lost Poster - ${item.item_name}</title>
            <style>
                body { font-family: 'Arial', sans-serif; text-align: center; padding: 40px; background: #fff; }
                .poster-container { border: 8px solid #ef4444; padding: 40px; border-radius: 20px; max-width: 800px; margin: auto; box-shadow: 0 10px 30px rgba(0,0,0,0.1); }
                h1 { color: #ef4444; font-size: 60px; margin: 0; text-transform: uppercase; font-weight: 900; letter-spacing: 3px; }
                h2 { font-size: 40px; margin: 15px 0; color: #0f172a; text-transform: uppercase; }
                img { max-width: 100%; max-height: 500px; margin: 25px 0; border: 4px solid #cbd5e1; border-radius: 12px; object-fit: cover; }
                .details { font-size: 24px; text-align: left; margin: 30px auto; max-width: 650px; line-height: 1.8; color: #1e293b; background: #f8fafc; padding: 20px; border-radius: 12px; border: 1px solid #e2e8f0; }
                .contact { background: #ef4444; color: white; padding: 20px; font-size: 32px; font-weight: bold; border-radius: 12px; margin-top: 40px; letter-spacing: 1px; }
                @media print { body { -webkit-print-color-adjust: exact; print-color-adjust: exact; } }
            </style>
        </head><body>
            <div class="poster-container">
                <h1>🚨 MISSING / LOST 🚨</h1><h2>${item.item_name}</h2>
                ${item.image_url ? `<img src="${window.location.origin}${item.image_url}" alt="Item Image">` : '<div style="height: 250px; display:flex; align-items:center; justify-content:center; background:#f1f5f9; color:#94a3b8; font-size:24px; border-radius:12px; margin:25px 0; border: 2px dashed #cbd5e1;">No Image Provided</div>'}
                <div class="details"><p><b>📍 Location:</b> ${item.location_lost}</p><p><b>📅 Date:</b> ${formattedDate}</p><p><b>📝 Info:</b> ${item.description}</p></div>
                <div class="contact">📞 CONTACT: ${item.contact_info || 'Please reply on Smart L&F Portal'}</div>
            </div>
            <script>window.onload = () => { setTimeout(() => { window.print(); window.close(); }, 500); }</script>
        </body></html>
    `);
    printWindow.document.close();
}

function openLightbox(imageSrc) { document.getElementById('lightboxImg').src = imageSrc; document.getElementById('lightboxModal').style.display = 'flex'; }
function closeLightbox(event) { if (event.target.id === 'lightboxModal' || event.target.tagName === 'SPAN') document.getElementById('lightboxModal').style.display = 'none'; }

function filterItems() {
    const searchText = document.getElementById('searchInput').value.toLowerCase(), category = document.getElementById('filterCategory').value;
    document.querySelectorAll('.item-card.lost-item, .item-card.found-item').forEach(card => {
        const matchesSearch = card.innerText.toLowerCase().includes(searchText), matchesCategory = category === 'all' || card.getAttribute('data-category') === category;
        card.style.display = (matchesSearch && matchesCategory) ? 'flex' : 'none';
    });
}

let socket, currentReceiver = null, currentItem = null;
if (window.location.pathname.includes('dashboard.html')) {
    socket = io();
    socket.on('receive_message', (data) => {
        if (data.item_id === currentItem) { document.getElementById('chatMessages').innerHTML += `<p class="msg received"><b>Them:</b> ${data.message_text}</p>`; document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight; }
    });
}

async function openChat(itemId, ownerId) {
    const myId = localStorage.getItem('user_id');
    if (myId == ownerId) return Swal.fire('Wait a minute!', 'You cannot claim an item you posted yourself!', 'warning');
    currentItem = itemId; currentReceiver = ownerId;
    document.getElementById('chatModal').style.display = 'flex'; document.getElementById('chatMessages').innerHTML = 'Loading history...';
    socket.emit('join_chat', { item_id: itemId, sender_id: myId, receiver_id: ownerId });
    const history = await (await fetch(`/api/chat-history/${itemId}/${myId}/${ownerId}`)).json();
    document.getElementById('chatMessages').innerHTML = history.length ? history.map(msg => `<p class="msg ${msg.sender_id == myId ? 'sent' : 'received'}"><b>${msg.sender_id == myId ? 'You' : 'Them'}:</b> ${msg.message_text}</p>`).join('') : '<p style="text-align:center; color:gray; margin-top: 20px;">Start the conversation!</p>';
}

function closeChat() { document.getElementById('chatModal').style.display = 'none'; }
function sendMessage() {
    const text = document.getElementById('chatInput').value; if (!text) return;
    socket.emit('send_message', { sender_id: localStorage.getItem('user_id'), receiver_id: currentReceiver, item_id: currentItem, message_text: text });
    document.getElementById('chatMessages').innerHTML += `<p class="msg sent"><b>You:</b> ${text}</p>`;
    document.getElementById('chatInput').value = ''; document.getElementById('chatMessages').scrollTop = document.getElementById('chatMessages').scrollHeight;
}

window.onload = () => {
    if (window.location.pathname.includes('dashboard.html')) {
        if (!localStorage.getItem('user_id')) window.location.href = 'index.html';
        const username = localStorage.getItem('username');
        document.getElementById('userNameDisplay').innerText = username;
        document.getElementById('userAvatar').src = `https://ui-avatars.com/api/?name=${encodeURIComponent(username)}&background=random&color=fff&font-size=0.4&bold=true`;
        loadFeeds();
    }
};

document.addEventListener("DOMContentLoaded", () => {
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                document.querySelectorAll('.counter').forEach(counter => {
                    const updateCount = () => {
                        const target = +counter.getAttribute('data-target'), count = +counter.innerText.replace('+', ''), inc = target / 100;
                        if (count < target) { counter.innerText = Math.ceil(count + inc); setTimeout(updateCount, 20); } else { counter.innerText = target + "+"; }
                    }; updateCount();
                }); observer.unobserve(entry.target);
            }
        });
    }, { threshold: 0.5 });
    if (document.querySelector('.stats-section')) observer.observe(document.querySelector('.stats-section'));
});