// Questions Configuration
const questions = {
    staff: [
        "What is your Minecraft IGN?",
        "What is your age?",
        "What is your timezone?",
        "How many hours can you dedicate daily?",
        "Have you been staff on other servers? (List them)",
        "Why do you want to be staff on CritPVP?",
        "A player is hacking (Fly). What do you do?",
        "A player is spamming chat. What do you do?",
        "Are you familiar with identifying Kill Aura?",
        "Do you have a working microphone for Discord?"
    ],
    media: [
        "What is your channel link (YT/Twitch)?",
        "How many subscribers/followers do you have?",
        "What is your average view count per video?",
        "How often do you upload?",
        "Are you willing to upload shorts/trailers for CritPVP?"
    ],
    partner: [
        "What is the name of your organization/server?",
        "What is your main platform/audience size?",
        "Why do you want to partner with CritPVP?",
        "What can you offer us?",
        "Provide a link to your Discord/Website."
    ]
};

// =======================
// AUTHENTICATION
// =======================

function toggleAuth() {
    const login = document.getElementById('loginForm');
    const register = document.getElementById('registerForm');
    
    if (login.classList.contains('hidden')) {
        login.classList.remove('hidden');
        register.classList.add('hidden');
    } else {
        login.classList.add('hidden');
        register.classList.remove('hidden');
    }
}

async function login() {
    const email = document.getElementById('l_email').value;
    const pass = document.getElementById('l_pass').value;
    
    const res = await fetch('/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass })
    });
    const data = await res.json();
    
    if (data.success) {
        if (data.role === 'admin') window.location.href = 'admin.html';
        else window.location.href = 'dashboard.html';
    } else {
        alert(data.message);
    }
}

async function register() {
    const email = document.getElementById('r_email').value;
    const pass = document.getElementById('r_pass').value;
    const ign = document.getElementById('r_ign').value;
    const discord = document.getElementById('r_discord').value;

    if(!email || !pass || !ign || !discord) {
        alert("Please fill in all fields.");
        return;
    }

    const res = await fetch('/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password: pass, ign, discord })
    });
    const data = await res.json();
    if (data.success) {
        alert("Registered! Please login.");
        toggleAuth();
    } else {
        alert(data.message);
    }
}

async function logout() {
    await fetch('/api/logout', { method: 'POST' });
    window.location.href = 'index.html';
}

// =======================
// DASHBOARD & APPLICATION
// =======================

function goToApply(type) {
    localStorage.setItem('applyType', type);
    window.location.href = 'apply.html';
}

async function loadMyApplications() {
    const res = await fetch('/api/my-applications');
    const apps = await res.json();
    const list = document.getElementById('statusList');
    
    if(apps.length === 0) list.innerHTML = '<p class="text-gray-400">No applications submitted yet.</p>';

    apps.forEach(app => {
        let statusColor = 'text-yellow-600 bg-yellow-50';
        if (app.status.includes('Accepted')) statusColor = 'text-green-600 bg-green-50';
        if (app.status.includes('Denied')) statusColor = 'text-red-600 bg-red-50';

        list.innerHTML += `
            <div class="p-6 border border-gray-100 shadow-sm rounded-lg flex justify-between items-center bg-white">
                <div>
                    <h3 class="font-bold text-lg capitalize mb-1">${app.type} Application</h3>
                    <p class="text-xs text-gray-400">${new Date(app.timestamp).toLocaleString()}</p>
                    ${app.reason ? `<div class="mt-2 text-sm text-gray-600 bg-gray-50 p-2 rounded"><strong>Admin Note:</strong> ${app.reason}</div>` : ''}
                </div>
                <span class="px-4 py-2 rounded-lg text-sm font-bold ${statusColor}">${app.status}</span>
            </div>
        `;
    });
}

function loadQuestions() {
    const type = localStorage.getItem('applyType');
    if (!type) window.location.href = 'dashboard.html';
    
    document.getElementById('appTitle').innerText = `${type} Application`;
    const container = document.getElementById('questionsContainer');
    
    questions[type].forEach((q, index) => {
        container.innerHTML += `
            <div>
                <label class="block mb-2 font-bold text-gray-700">${q}</label>
                <textarea name="q${index}" required class="w-full p-4 bg-gray-50 border-none rounded-lg h-24 focus:ring-2 focus:ring-black transition-all"></textarea>
            </div>
        `;
    });
}

async function submitApplication(e) {
    e.preventDefault();
    const type = localStorage.getItem('applyType');
    const formData = new FormData(e.target);
    const answers = [];
    
    for (let pair of formData.entries()) {
        answers.push({ question: questions[type][parseInt(pair[0].replace('q',''))], answer: pair[1] });
    }

    const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, answers })
    });

    const data = await res.json();
    if (data.success) {
        window.location.href = 'dashboard.html';
    } else {
        alert('Error submitting application.');
    }
}

// =======================
// ADMIN PANEL
// =======================

async function loadAdminData() {
    const res = await fetch('/api/admin/applications');
    const apps = await res.json();
    const list = document.getElementById('adminList');

    if(apps.length === 0) list.innerHTML = '<div class="p-6 text-center text-gray-500">No applications found.</div>';

    apps.forEach(app => {
        const answers = JSON.parse(app.answers);
        let answersHtml = answers.map(a => `
            <div class="mb-3">
                <p class="text-xs uppercase text-gray-400 font-bold mb-1">${a.question}</p>
                <p class="text-gray-800 bg-gray-50 p-2 rounded">${a.answer}</p>
            </div>
        `).join('');

        // Define status badge color
        let statusBadge = 'bg-gray-200 text-gray-600';
        if(app.status.includes('Accepted')) statusBadge = 'bg-green-100 text-green-700';
        if(app.status.includes('Denied')) statusBadge = 'bg-red-100 text-red-700';

        list.innerHTML += `
            <div class="p-6 border-b border-gray-100 hover:bg-gray-50 transition-colors">
                <div class="flex justify-between items-start mb-6">
                    <div class="flex items-center gap-4">
                        <div class="h-12 w-12 bg-black text-white rounded-full flex items-center justify-center font-bold text-xl">
                            ${app.ign ? app.ign[0].toUpperCase() : '?'}
                        </div>
                        <div>
                            <h3 class="font-bold text-lg capitalize">${app.type} Application</h3>
                            <div class="flex gap-2 text-sm text-gray-500">
                                <span>IGN: <strong class="text-black">${app.ign || 'N/A'}</strong></span>
                                <span>•</span>
                                <span>Discord: <strong class="text-black">${app.discord || 'N/A'}</strong></span>
                            </div>
                            <p class="text-xs text-gray-400 mt-1">${new Date(app.timestamp).toLocaleString()}</p>
                        </div>
                    </div>
                    <div class="px-3 py-1 rounded text-sm font-bold ${statusBadge}">${app.status}</div>
                </div>
                
                <div class="bg-white border border-gray-200 p-6 rounded-lg mb-6 shadow-sm">
                    ${answersHtml}
                </div>

                <div class="flex gap-3">
                    <button onclick="updateStatus(${app.id}, 'Accepted')" class="bg-black text-white px-6 py-2 rounded font-medium hover:bg-gray-800 transition-colors">Accept</button>
                    <button onclick="updateStatusWithReason(${app.id}, 'Accepted with Reason')" class="border border-black text-black px-6 py-2 rounded font-medium hover:bg-gray-100 transition-colors">Accept w/ Note</button>
                    <button onclick="updateStatus(${app.id}, 'Denied')" class="bg-red-600 text-white px-6 py-2 rounded font-medium hover:bg-red-700 transition-colors">Deny</button>
                    <button onclick="updateStatusWithReason(${app.id}, 'Denied with Reason')" class="border border-red-600 text-red-600 px-6 py-2 rounded font-medium hover:bg-red-50 transition-colors">Deny w/ Reason</button>
                </div>
            </div>
        `;
    });
}

// This function was likely missing or broken before
async function updateStatus(id, status, reason = '') {
    const res = await fetch('/api/admin/status', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status, reason })
    });
    
    const data = await res.json();
    if(data.success) {
        location.reload();
    } else {
        alert("Failed to update status.");
    }
}

function updateStatusWithReason(id, status) {
    const reason = prompt("Enter the reason/note:");
    if (reason) {
        updateStatus(id, status, reason);
    }
}