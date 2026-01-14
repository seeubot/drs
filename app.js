// API Configuration
const API_URL = 'https://static-crane-seeutech-17dd4df3.koyeb.app/api/channels';

// Global State
let allChannels = [];
let filtered = [];
let isLoading = false;
let isInitialLoad = true;

// DOM Elements
const searchContainer = document.getElementById('searchContainer');
const channelsContainer = document.getElementById('channelsContainer');
const searchInput = document.getElementById('searchInput');
const clearSearch = document.getElementById('clearSearch');
const searchButton = document.getElementById('searchButton');
const backButton = document.getElementById('backButton');
const channelsGrid = document.getElementById('channelsGrid');
const loading = document.getElementById('loading');
const errorState = document.getElementById('errorState');
const resultsCount = document.getElementById('resultsCount');

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
async function loadChannels(query) {
    if (isLoading) return;
    
    isLoading = true;
    loading.classList.add('visible');
    errorState.classList.remove('visible');
    
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
            
            applyFilters(query, true);
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
                applyFilters(query, true);
                isInitialLoad = false;
                return;
            }
        }
        
        errorState.classList.add('visible');
        errorState.innerHTML = `
            <p>Unable to load channels. Please check your connection.</p>
            <button class="back-button" style="margin-top: 20px;" onclick="retryLoad()">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Retry
            </button>
        `;
        console.error(err);
    } finally {
        isLoading = false;
        loading.classList.remove('visible');
    }
}

// Apply filters and display results
function applyFilters(query = '', forceRender = false) {
    // Show results container
    if (!channelsContainer.classList.contains('visible')) {
        searchContainer.classList.add('hidden');
        channelsContainer.classList.add('visible');
    }
    
    // Clear previous results
    channelsGrid.innerHTML = '';
    
    if (allChannels.length === 0) {
        showEmptyState("No channels loaded yet");
        resultsCount.textContent = '0 channels found';
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
    
    // Update results count
    resultsCount.textContent = `${filtered.length} channel${filtered.length !== 1 ? 's' : ''} found`;
    
    // Render results
    if (filtered.length === 0) {
        showEmptyState("No channels match your search");
    } else {
        renderChannels(filtered, forceRender);
    }
}

// Render channels to the grid
function renderChannels(channels, forceRender = false) {
    const fragment = document.createDocumentFragment();
    
    channels.forEach((item, index) => {
        const card = document.createElement('div');
        card.className = 'channel-card';
        card.style.animationDelay = `${index * 0.05}s`;
        card.setAttribute('role', 'button');
        card.setAttribute('tabindex', '0');
        card.setAttribute('aria-label', `${item.title} channel`);
        
        // Create card content
        card.innerHTML = `
            <div class="channel-logo">
                <img src="${escapeHtml(item.logo)}" alt="${escapeHtml(item.title)} Logo" 
                     loading="lazy" 
                     onerror="this.src='data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTUwIiBoZWlnaHQ9IjE1MCIgdmlld0JveD0iMCAwIDE1MCAxNTAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+PHJlY3Qgd2lkdGg9IjE1MCIgaGVpZ2h0PSIxNTAiIGZpbGw9IiMxYzFjMWMiLz48cGF0aCBkPSJNNzUgNDVMMTA1IDc1SDQ1Vjg1SDEwNUw3NSAxMTVINDVWODVIMTVWNzVINDVWNDVINzVaIiBmaWxsPSJ3aGl0ZSIvPjwvc3ZnPg=='">
            </div>
            <div class="channel-info">
                <h3 class="channel-name">${escapeHtml(item.title)}</h3>
                <div class="channel-category">${escapeHtml(item.groupTitle || 'LIVE')}</div>
                <div class="channel-action">
                    <svg viewBox="0 0 24 24" fill="none">
                        <path d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" stroke-linecap="round" stroke-linejoin="round"/>
                    </svg>
                    Watch Now
                </div>
            </div>
        `;
        
        // Add click handlers
        card.addEventListener('click', () => handleChannelClick(item));
        card.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleChannelClick(item);
            }
        });
        
        fragment.appendChild(card);
    });
    
    channelsGrid.appendChild(fragment);
}

// Show empty state
function showEmptyState(message) {
    channelsGrid.innerHTML = `
        <div class="empty-state">
            <svg class="empty-state-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                <path d="M9.172 16.172a4 4 0 015.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
            <h3>${message}</h3>
            <button class="back-button" onclick="backToSearch()">
                <svg viewBox="0 0 24 24" fill="none">
                    <path d="M19 12H5M12 19l-7-7 7-7" stroke-linecap="round" stroke-linejoin="round"/>
                </svg>
                Back to Search
            </button>
        </div>
    `;
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
            alert(`Opening ${item.title}...`);
        }
    } else {
        console.log('Channel selected:', item);
        // Fallback for web
        alert(`Opening ${item.title}...\nURL: ${item.url || 'No URL available'}`);
        if (item.url) {
            window.open(item.url, '_blank');
        }
    }
}

// Escape HTML to prevent XSS
function escapeHtml(text) {
    if (!text) return '';
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

// Perform search
function performSearch() {
    const query = searchInput.value.trim();
    
    if (query.length < 3) {
        searchInput.focus();
        return;
    }
    
    if (isInitialLoad) {
        loadChannels(query);
    } else {
        applyFilters(query.toLowerCase());
    }
}

// Back to search function
function backToSearch() {
    searchContainer.classList.remove('hidden');
    channelsContainer.classList.remove('visible');
    searchInput.value = '';
    clearSearch.style.display = 'none';
    searchInput.focus();
}

// Retry loading
function retryLoad() {
    const query = searchInput.value.trim();
    if (query.length >= 3) {
        loadChannels(query);
    }
}

// Initialize
function init() {
    // Event listeners
    searchInput.addEventListener('input', function(e) {
        clearSearch.style.display = e.target.value.length > 0 ? 'block' : 'none';
    });

    clearSearch.addEventListener('click', function() {
        searchInput.value = '';
        clearSearch.style.display = 'none';
        searchInput.focus();
    });

    searchButton.addEventListener('click', performSearch);
    
    searchInput.addEventListener('keypress', function(e) {
        if (e.key === 'Enter') {
            performSearch();
        }
    });

    backButton.addEventListener('click', backToSearch);
    
    // Debounced search for real-time filtering after initial load
    const debouncedFilter = debounce(() => {
        if (!isInitialLoad && searchInput.value.trim().length >= 3) {
            applyFilters(searchInput.value.trim().toLowerCase());
        }
    }, 300);
    
    searchInput.addEventListener('input', debouncedFilter);

    // Keyboard shortcuts
    document.addEventListener('keydown', (e) => {
        if (e.key === '/' && e.target !== searchInput) {
            e.preventDefault();
            searchInput.focus();
        }
        if (e.key === 'Escape' && document.activeElement === searchInput) {
            searchInput.blur();
            if (channelsContainer.classList.contains('visible')) {
                searchInput.value = '';
                applyFilters('');
            }
        }
    });

    // Focus search on page load
    searchInput.focus();

    // Preconnect to API domain
    const link = document.createElement('link');
    link.rel = 'preconnect';
    link.href = new URL(API_URL).origin;
    document.head.appendChild(link);

    // Service Worker registration
    if ('serviceWorker' in navigator) {
        navigator.serviceWorker.register('/sw.js').catch(console.log);
    }

    // Online/offline detection
    window.addEventListener('online', () => {
        if (allChannels.length === 0 && searchInput.value.trim().length >= 3) {
            loadChannels(searchInput.value.trim());
        }
    });
}

// Start the app
if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
} else {
    init();
}

// Export for module usage if needed
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { init, loadChannels, applyFilters };
}
