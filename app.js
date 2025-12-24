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
let pendingChannelData = null;
let adOpened = false;

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

// Create Ad Card (Full Width Banner with exact size)
function createAdCard() {
    const adCard = document.createElement('div');
    adCard.className = 'ad-card';
    
    const adId = 'ad-' + Math.random().toString(36).substr(2, 9);
    
    // Create the ad card structure
    adCard.innerHTML = `
        <div class="ad-label">ADVERTISEMENT</div>
        <div class="ad-container" id="${adId}"></div>
    `;
    
    // After DOM insertion, create iframe and load ad
    setTimeout(() => {
        const container = document.getElementById(adId);
        if (!container) return;
        
        // Create iframe for ad isolation
        const iframe = document.createElement('iframe');
        iframe.style.cssText = 'width:100%;height:120px;border:none;display:block;background:#0a0a0c;';
        iframe.setAttribute('scrolling', 'no');
        iframe.setAttribute('frameborder', '0');
        
        container.appendChild(iframe);
        
        // Write ad code into iframe
        const doc = iframe.contentWindow.document;
        doc.open();
        doc.write(`
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <style>
                    body {
                        margin: 0;
                        padding: 10px;
                        background: #0a0a0c;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        min-height: 100px;
                        overflow: hidden;
                    }
                </style>
            </head>
            <body>
                <script type="text/javascript">
                    atOptions = {
                        'key': '${AD_CONFIG.key}',
                        'format': '${AD_CONFIG.format}',
                        'height': ${AD_CONFIG.height},
                        'width': ${AD_CONFIG.width},
                        'params': {}
                    };
                <\/script>
                <script type="text/javascript" src="${AD_CONFIG.scriptUrl}"><\/script>
            </body>
            </html>
        `);
        doc.close();
        
    }, 50);
    
    return adCard;
}

// Handle Channel Click
function handleChannelClick(item) {
    // Store channel data for later playback
    pendingChannelData = item;
    adOpened = true;
    
    // Open smart link ad in external browser (this will be caught by shouldOverrideUrlLoading)
    window.location.href = SMARTLINK_URL;
    
    // Fallback: Play immediately after short delay if ad doesn't open
    setTimeout(() => {
        if (pendingChannelData && window.Android && window.Android.playChannel) {
            window.Android.playChannel(JSON.stringify(pendingChannelData));
            pendingChannelData = null;
            adOpened = false;
        }
    }, 2000);
}

// Render Grid
function renderGrid(data) {
    grid.innerHTML = '';
    
    if (data.length === 0) {
        grid.innerHTML = `<div style="grid-column: 1/-1; text-align: center; padding: 40px; color: var(--text-dim);">No channels match your search</div>`;
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
    
    // Add one more ad at the end if there are remaining channels
    if (data.length > AD_FREQUENCY) {
        const adCard = createAdCard();
        grid.appendChild(adCard);
    }
}

// When user returns to the app, play the pending channel
document.addEventListener('visibilitychange', function() {
    if (!document.hidden && pendingChannelData && adOpened) {
        setTimeout(() => {
            if (window.Android && window.Android.playChannel) {
                window.Android.playChannel(JSON.stringify(pendingChannelData));
            }
            pendingChannelData = null;
            adOpened = false;
        }, 500);
    }
});

// Alternative: use focus event as backup
window.addEventListener('focus', function() {
    if (pendingChannelData && adOpened) {
        setTimeout(() => {
            if (window.Android && window.Android.playChannel) {
                window.Android.playChannel(JSON.stringify(pendingChannelData));
            }
            pendingChannelData = null;
            adOpened = false;
        }, 500);
    }
});

// Event Listeners
searchInput.addEventListener('input', applyFilters);

// Start the app
init();
