// API Configuration
const API_URL = 'https://static-crane-seeutech-17dd4df3.koyeb.app/api/channels';

// Global State
let allChannels = [];
let filtered = [];
let isLoading = false;
let loadTimeout = null;
let isInitialLoad = true;

// DOM Elements
const grid = document.getElementById('grid');
const loader = document.getElementById('loader');
const searchInput = document.getElementById('searchInput');
const errorMsg = document.getElementById('error-msg');

// Debounce function for performance
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Load channels from API
async function loadChannels() {
    if (isLoading) return;
    
    isLoading = true;
    loader.style.display = 'flex';
    grid.style.opacity = '0';
    
    try {
        console.time('API Load Time');
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        
        const res = await fetch(API_URL, {
            signal: controller.signal,
            headers: {
                'Accept': 'application/json',
                'Cache-Control': 'max-age=300'
            }
        });
        
        clearTimeout(timeoutId);
        
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        
        const json = await res.json();
        console.timeEnd('API Load Time');
        
        if (json.success && Array.isArray(json.data)) {
            allChannels = json.data;
            localStorage.setItem('cachedChannels', JSON.stringify({
                data: allChannels,
                timestamp: Date.now()
            }));
            
            applyFilters(true);
            isInitialLoad = false;
        } else {
            throw new Error("Invalid data format");
        }
    } catch (err) {
        console.warn('API failed, trying cache...', err);
        
        // Try to load from cache
        const cached = localStorage.getItem('cachedChannels');
        if (cached) {
            const { data, timestamp } = JSON.parse(cached);
            // Use cache if less than 1 hour old
            if (Date.now() - timestamp < 3600000) {
                allChannels = data;
                applyFilters(true);
                isInitialLoad = false;
                return;
            }
        }
        
        errorMsg.style.display = 'block';
        errorMsg.textContent = "Unable to load channels. Please check your connection.";
        console.error(err);
    } finally {
        isLoading = false;
        loader.style.display = 'none';
    }
}

// Apply filters with lazy loading trigger
function applyFilters(forceRender = false) {
    const query = searchInput.value.toLowerCase().trim();
    
    // Show initial message until 3 characters are typed
    if (isInitialLoad && query.length < 3) {
        loader.style.display = 'flex';
        loader.querySelector('.loader-text').textContent = 'Type at least 3 letters to load channels...';
        grid.innerHTML = '';
        return;
    }
    
    // Load channels on first 3+ character input
    if (isInitialLoad && query.length >= 3 && allChannels.length === 0) {
        loadChannels();
        return;
    }
    
    // Apply search filter
    if (query.length >= 3) {
        filtered = allChannels.filter(c => {
            const matchesSearch = c.title.toLowerCase().includes(query) ||
                                 (c.groupTitle && c.groupTitle.toLowerCase().includes(query));
            return matchesSearch;
        });
    } else {
        filtered = allChannels;
    }
    
    // Render with animation
    renderGrid(filtered, forceRender);
}

// Optimized render function
function renderGrid(data, forceRender = false) {
    if (!forceRender && data.length === 0) {
        grid.innerHTML = `
            <div class="empty-state">
                <svg fill="currentColor" viewBox="0 0 24 24">
                    <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
                </svg>
                <div>No channels match your search</div>
            </div>
        `;
        grid.style.opacity = '1';
        return;
    }
    
    // Batch DOM updates
    const fragment = document.createDocumentFragment();
    
    data.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.style.setProperty('--card-index', index);
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${item.title} channel`);
        
        // Preload image
        const img = new Image();
        img.src = item.logo;
        img.onerror = () => {
            img.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiMxYzFjMWYiLz48cGF0aCBkPSJNNzUgNDVMMTA1IDc1SDQ1Vjg1SDEwNUw3NSAxMTVINDVWODVIMTVWNzVINDVWNDVINzVaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg==';
        };
        
        card.innerHTML = `
            <div class="logo-box">
                <img src="${item.logo}" alt="" loading="lazy" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiMxYzFjMWYiLz48cGF0aCBkPSJNNzUgNDVMMTA1IDc1SDQ1Vjg1SDEwNUw3NSAxMTVINDVWODVIMTVWNzVINDVWNDVINzVaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg=='">
            </div>
            <div class="channel-meta">
                <div class="channel-name">${escapeHtml(item.title)}</div>
                <div class="channel-tag">${escapeHtml(item.groupTitle || 'LIVE')}</div>
            </div>
        `;
        
        // Optimized click handler
        card.addEventListener('click', () => handleChannelClick(item));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleChannelClick(item);
            }
        });
        
        fragment.appendChild(card);
    });
    
    // Single DOM update
    grid.innerHTML = '';
    grid.appendChild(fragment);
    grid.style.opacity = '1';
}

// Handle channel click
function handleChannelClick(item) {
    // Visual feedback
    event.currentTarget.style.transform = 'scale(0.98)';
    setTimeout(() => {
        event.currentTarget.style.transform = '';
    }, 150);
    
    // Android bridge
    if (window.Android && typeof window.Android.playChannel === 'function') {
        try {
            window.Android.playChannel(JSON.stringify(item));
        } catch (err) {
            console.error('Android bridge error:', err);
        }
    } else {
        console.log('Channel selected:', item);
        // Fallback for web - could open in new tab or show modal
        window.open(item.url || '#', '_blank');
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Initialize with Intersection Observer for lazy loading
function init() {
    // Set initial state
    loader.style.display = 'flex';
    grid.style.opacity = '0';
    
    // Debounced search with 300ms delay
    const debouncedSearch = debounce(() => {
        applyFilters();
    }, 300);
    
    searchInput.addEventListener('input', debouncedSearch);
    
    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && e.target !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.blur();
            searchInput.value = '';
            applyFilters();
        }
    });
    
    // Focus search on page load for better UX
    setTimeout(() => {
        searchInput.focus();
    }, 100);
    
    // Preconnect to API domain
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = new URL(API_URL).origin;
    document.head.appendChild(link);
    
    // Service Worker registration for PWA capabilities
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.log);
    }
    
    // Online/offline detection
    window.addEventListener('online', () => {
        if (allChannels.length === 0 && searchInput.value.length >= 3) {
            loadChannels();
        }
    });
    
    // Initial empty state
    applyFilters();
}

// Start the app when DOM is ready
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { init, loadChannels, applyFilters };
}
