// API Configuration
const API_URL = 'https://static-crane-seeutech-17dd4df3.koyeb.app/api/channels';

// Global State
let allChannels = [];
let filtered = [];

// DOM Elements
const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const errorMsg = document.getElementById('error-msg');

// Initialize App
async function init() {
    try {
        const res = await fetch(API_URL);
        const json = await res.json();
        
        if (json.success && Array.isArray(json.data)) {
            allChannels = json.data;
            renderGrid(allChannels);
        } else {
            throw new Error("Invalid data format");
        }
    } catch (err) {
        errorMsg.style.display = 'block';
        errorMsg.textContent = "Unable to load channels. Please try again later.";
        console.error(err);
    } finally {
        loader.style.display = 'none';
    }
}

// Apply Filters (only search, no category)
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    
    filtered = allChannels.filter(c => {
        const matchesSearch = !query || c.title.toLowerCase().includes(query);
        return matchesSearch;
    });

    renderGrid(filtered);
}

// Handle Channel Click
function handleChannelClick(item) {
    if (window.Android && window.Android.playChannel) {
        window.Android.playChannel(JSON.stringify(item));
    }
}

// Render Grid
function renderGrid(data) {
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">No channels match your search</div>`;
        return;
    }

    data.forEach((item) => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.innerHTML = `
            <div class="logo-box">
                <img src="${item.logo}" alt="" onerror="this.src='https://via.placeholder.com/150/1c1c1f/ffffff?text=TV'">
            </div>
            <div class="channel-meta">
                <div class="channel-name">${item.title}</div>
                <div class="channel-tag">${item.groupTitle || 'LIVE'}</div>
            </div>
        `;
        
        card.onclick = () => handleChannelClick(item);
        grid.appendChild(card);
    });
}

// Event Listeners
searchInput.addEventListener('input', applyFilters);

// Start the app
init();
