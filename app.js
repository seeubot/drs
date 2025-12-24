// API Configuration
const API_URL = 'https://static-crane-seeutech-17dd4df3.koyeb.app/api/channels';
const SMARTLINK_URL = 'https://staggermeaningless.com/djr63xfh5?key=0594e81080ace7ae2229d79efcbc8072';
const AD_FREQUENCY = 6; // Show ad after every 6 channels

// Ad Configuration
const AD_CONFIG = {
    key: 'e370435c2937a2c6a0c3fa900e0430ac',
    format: 'iframe',
    height: 250,
    width: 300,
    scriptUrl: 'https://staggermeaningless.com/e370435c2937a2c6a0c3fa900e0430ac/invoke.js'
};

// Global State
let allChannels = [];
let filtered = [];
let currentCat = 'All';
let pendingChannelData = null;

// DOM Elements
const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const categoriesBox = document.getElementById('categoriesBox');
const errorMsg = document.getElementById('error-msg');

// Initialize App
async function init() {
    try {
        const res = await fetch(API_URL);
        const json = await res.json();
        
        if (json.success && Array.isArray(json.data)) {
            allChannels = json.data;
            renderCategories();
            renderGrid(allChannels);
            loadBannerAdScript();
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

// Load Banner Ad Script
function loadBannerAdScript() {
    const atOptionsScript = document.createElement('script');
    atOptionsScript.type = 'text/javascript';
    atOptionsScript.innerHTML = `
        atOptions = {
            'key' : '${AD_CONFIG.key}',
            'format' : '${AD_CONFIG.format}',
            'height' : ${AD_CONFIG.height},
            'width' : ${AD_CONFIG.width},
            'params' : {}
        };
    `;
    document.body.appendChild(atOptionsScript);
    
    const invokeScript = document.createElement('script');
    invokeScript.type = 'text/javascript';
    invokeScript.src = AD_CONFIG.scriptUrl;
    document.body.appendChild(invokeScript);
}

// Render Categories
function renderCategories() {
    const groups = new Set();
    allChannels.forEach(c => { 
        if(c.groupTitle) groups.add(c.groupTitle); 
    });
    
    [...groups].sort().forEach(group => {
        const btn = document.createElement('button');
        btn.className = 'cat-chip';
        btn.textContent = group;
        btn.onclick = () => {
            document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            currentCat = group;
            applyFilters();
        };
        categoriesBox.appendChild(btn);
    });

    // "All" button logic
    categoriesBox.querySelector('[data-cat="All"]').onclick = (e) => {
        document.querySelectorAll('.cat-chip').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        currentCat = 'All';
        applyFilters();
    };
}

// Apply Filters
function applyFilters() {
    const query = searchInput.value.toLowerCase().trim();
    
    filtered = allChannels.filter(c => {
        const matchesCat = currentCat === 'All' || c.groupTitle === currentCat;
        const matchesSearch = !query || c.title.toLowerCase().includes(query);
        return matchesCat && matchesSearch;
    });

    renderGrid(filtered);
}

// Create Ad Card
function createAdCard() {
    const adCard = document.createElement('div');
    adCard.className = 'ad-card';
    
    const adId = 'ad-' + Math.random().toString(36).substr(2, 9);
    
    adCard.innerHTML = `
        <span class="ad-label">AD</span>
        <div class="ad-container" id="${adId}"></div>
    `;
    
    // Inject ad script after element is added to DOM
    setTimeout(() => {
        const adContainer = document.getElementById(adId);
        if (adContainer) {
            const script = document.createElement('script');
            script.type = 'text/javascript';
            script.innerHTML = `
                atOptions = {
                    'key' : '${AD_CONFIG.key}',
                    'format' : '${AD_CONFIG.format}',
                    'height' : ${AD_CONFIG.height},
                    'width' : ${AD_CONFIG.width},
                    'params' : {}
                };
            `;
            adContainer.appendChild(script);
            
            const invokeScript = document.createElement('script');
            invokeScript.type = 'text/javascript';
            invokeScript.src = AD_CONFIG.scriptUrl;
            adContainer.appendChild(invokeScript);
        }
    }, 100);
    
    return adCard;
}

// Handle Channel Click
function handleChannelClick(item) {
    // Store channel data for later playback
    pendingChannelData = item;
    
    // Open smart link ad in external browser
    window.open(SMARTLINK_URL, '_blank');
}

// Render Grid
function renderGrid(data) {
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = `<div class="empty-state">No channels match your search</div>`;
        return;
    }

    data.forEach((item, index) => {
        // Add channel card
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

        // Insert ad after every AD_FREQUENCY channels
        if ((index + 1) % AD_FREQUENCY === 0 && index < data.length - 1) {
            const adCard = createAdCard();
            grid.appendChild(adCard);
        }
    });
}

// When user returns to the app, play the pending channel
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && pendingChannelData) {
        // User returned to the app, play the channel
        if (window.Android && window.Android.playChannel) {
            window.Android.playChannel(JSON.stringify(pendingChannelData));
        } else {
            console.log("Playing:", pendingChannelData.title, pendingChannelData.url);
        }
        // Clear pending data
        pendingChannelData = null;
    }
});

// Alternative: use focus event as backup
window.addEventListener('focus', function() {
    if (pendingChannelData) {
        setTimeout(() => {
            if (window.Android && window.Android.playChannel) {
                window.Android.playChannel(JSON.stringify(pendingChannelData));
            } else {
                console.log("Playing:", pendingChannelData.title, pendingChannelData.url);
            }
            pendingChannelData = null;
        }, 300);
    }
});

// Event Listeners
searchInput.addEventListener('input', applyFilters);

// Start the app
init();
