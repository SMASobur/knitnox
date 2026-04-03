/**
 * Knitnox App Store - Main Application Script
 * Version: 1.0.0
 * 
 * This file contains all JavaScript logic for the Knitnox app store,
 * including SPA navigation, infinite scroll, app loading, and search.
 */

// ============================================
// STATE MANAGEMENT
// ============================================
let allApps = [];
let filteredApps = [];
let displayedApps = [];
let currentApp = null;
let deferredPrompt = null;

// Infinite scroll configuration
const INITIAL_LOAD_COUNT = 20;
const LOAD_MORE_COUNT = 10;
let currentIndex = 0;
let isLoading = false;
let hasMore = true;

// ============================================
// PWA INSTALLATION
// ============================================
window.addEventListener('beforeinstallprompt', (e) => {
  e.preventDefault();
  deferredPrompt = e;
});

// ============================================
// NAVIGATION
// ============================================
function showView(viewId) {
  document.querySelectorAll('.view').forEach(v => v.classList.remove('active'));
  document.getElementById(viewId).classList.add('active');
  
  // Update URL hash without triggering scroll
  if (viewId === 'home-view') {
    history.pushState(null, '', '#home');
  } else if (viewId === 'apps-view') {
    history.pushState(null, '', '#apps');
  } else if (viewId === 'detail-view') {
    history.pushState(null, '', '#app');
  }
}

// ============================================
// APP LOADING
// ============================================
async function loadApps() {
  try {
    const response = await fetch('apps.json');
    allApps = await response.json();
    filteredApps = [...allApps];
    
    // Reset infinite scroll state
    currentIndex = 0;
    hasMore = true;
    displayedApps = [];
    
    // Load initial batch
    loadMoreApps();
  } catch (error) {
    console.error('Error loading apps:', error);
    document.getElementById('apps-container').innerHTML = 
      '<div class="no-apps">Error loading apps. Please try again later.</div>';
  }
}

// ============================================
// INFINITE SCROLL - Load apps in batches
// ============================================
function loadMoreApps() {
  if (isLoading || !hasMore) return;
  
  isLoading = true;
  
  // Determine how many to load (20 initially, then 10 more each time)
  const loadCount = currentIndex === 0 ? INITIAL_LOAD_COUNT : LOAD_MORE_COUNT;
  
  // Get next batch of apps
  const nextBatch = filteredApps.slice(currentIndex, currentIndex + loadCount);
  
  if (nextBatch.length === 0) {
    hasMore = false;
    isLoading = false;
    removeLoadingIndicator();
    return;
  }
  
  // Add to displayed apps
  displayedApps = [...displayedApps, ...nextBatch];
  currentIndex += nextBatch.length;
  
  // Check if there are more apps to load
  hasMore = currentIndex < filteredApps.length;
  
  // Render apps
  renderApps(displayedApps, !hasMore);
  
  isLoading = false;
}

// ============================================
// RENDER APPS - Group by category and display
// ============================================
function renderApps(apps, isComplete = false) {
  const container = document.getElementById('apps-container');
  const noApps = document.getElementById('no-apps');
  
  if (apps.length === 0) {
    container.innerHTML = '';
    noApps.style.display = 'block';
    removeLoadingIndicator();
    return;
  }
  
  noApps.style.display = 'none';
  
  // Group apps by category
  const categories = {};
  apps.forEach(app => {
    const category = app.category || 'Other';
    if (!categories[category]) {
      categories[category] = [];
    }
    categories[category].push(app);
  });
  
  // Render each category with its apps
  container.innerHTML = Object.keys(categories).sort().map(category => `
    <div class="category-section">
      <h2 class="category-header">${category}</h2>
      <div class="apps-grid">
        ${categories[category].map(app => `
          <div class="app-card" onclick="showAppDetail('${app.id}')">
            <img src="${app.icon}" alt="${app.name}" class="app-icon">
            <div class="app-info">
              <h3>${app.name}</h3>
              <p>${app.shortDescription}</p>
            </div>
          </div>
        `).join('')}
      </div>
    </div>
  `).join('');
  
  // Add loading indicator if there are more apps
  if (hasMore && !isComplete) {
    addLoadingIndicator();
  } else {
    removeLoadingIndicator();
  }
}

// ============================================
// LOADING INDICATOR
// ============================================
function addLoadingIndicator() {
  const container = document.getElementById('apps-container');
  let loadingDiv = document.getElementById('loading-indicator');
  
  if (!loadingDiv) {
    loadingDiv = document.createElement('div');
    loadingDiv.id = 'loading-indicator';
    loadingDiv.className = 'loading';
    loadingDiv.textContent = 'Loading more apps';
    container.appendChild(loadingDiv);
  }
}

function removeLoadingIndicator() {
  const loadingDiv = document.getElementById('loading-indicator');
  if (loadingDiv) {
    loadingDiv.remove();
  }
}

// ============================================
// INFINITE SCROLL DETECTION
// ============================================
function setupInfiniteScroll() {
  let scrollTimeout;
  
  window.addEventListener('scroll', () => {
    // Debounce scroll events
    clearTimeout(scrollTimeout);
    scrollTimeout = setTimeout(() => {
      // Check if we're near the bottom of the page
      const scrollPosition = window.innerHeight + window.scrollY;
      const threshold = document.documentElement.scrollHeight - 500;
      
      if (scrollPosition >= threshold && hasMore && !isLoading) {
        loadMoreApps();
      }
    }, 100);
  });
}

// ============================================
// SEARCH / FILTER
// ============================================
function filterApps(searchTerm) {
  const term = searchTerm.toLowerCase().trim();
  
  // Filter apps
  if (term === '') {
    filteredApps = [...allApps];
  } else {
    filteredApps = allApps.filter(app => 
      app.name.toLowerCase().includes(term) || 
      app.shortDescription.toLowerCase().includes(term) ||
      app.fullDescription.toLowerCase().includes(term) ||
      (app.category && app.category.toLowerCase().includes(term))
    );
  }
  
  // Reset infinite scroll state
  currentIndex = 0;
  hasMore = true;
  displayedApps = [];
  
  // Load initial batch of filtered apps
  loadMoreApps();
}

// ============================================
// APP DETAIL VIEW
// ============================================
function showAppDetail(appId) {
  currentApp = allApps.find(app => app.id === appId);
  if (!currentApp) return;

  document.getElementById('detail-app-icon').src = currentApp.icon;
  document.getElementById('detail-app-icon').alt = currentApp.name;
  document.getElementById('detail-app-name').textContent = currentApp.name;
  document.getElementById('detail-app-short').textContent = currentApp.shortDescription;
  document.getElementById('detail-app-description').textContent = currentApp.fullDescription;

  // Load screenshots
  const screenshotsContainer = document.getElementById('detail-screenshots');
  if (currentApp.screenshots && currentApp.screenshots.length > 0) {
    screenshotsContainer.innerHTML = currentApp.screenshots.map(screenshot => 
      `<img src="${screenshot}" alt="${currentApp.name} screenshot">`
    ).join('');
    screenshotsContainer.style.display = 'block';
  } else {
    screenshotsContainer.style.display = 'none';
  }

  showView('detail-view');
  
  // Scroll to top
  window.scrollTo(0, 0);
}

// ============================================
// APP ACTIONS
// ============================================
function openApp() {
  if (currentApp) {
    window.open(currentApp.url, '_blank');
  }
}

async function installApp() {
  if (!currentApp) return;

  try {
    const manifestResponse = await fetch(currentApp.manifestUrl);
    const manifest = await manifestResponse.json();
    
    // Check if browser supports PWA installation
    if ('serviceWorker' in navigator) {
      // For now, just open the app - full PWA installation requires
      // the app to have its own service worker registered
      window.open(currentApp.url, '_blank');
      alert('App opened! To install as PWA, open the app and use your browser\'s install option.');
    } else {
      alert('Your browser does not support PWA installation.');
    }
  } catch (error) {
    console.error('Installation error:', error);
    window.open(currentApp.url, '_blank');
  }
}

// ============================================
// EVENT LISTENERS
// ============================================
function initializeEventListeners() {
  // Get Started button
  document.getElementById('get-started-btn').addEventListener('click', (e) => {
    e.preventDefault();
    showView('apps-view');
    if (allApps.length === 0) {
      loadApps();
    }
    window.scrollTo(0, 0);
  });

  // Back to home
  document.getElementById('back-to-home').addEventListener('click', (e) => {
    e.preventDefault();
    showView('home-view');
    window.scrollTo(0, 0);
  });

  // Back to apps
  document.getElementById('back-to-apps').addEventListener('click', (e) => {
    e.preventDefault();
    showView('apps-view');
    window.scrollTo(0, 0);
  });

  // Search input
  document.getElementById('search-input').addEventListener('input', (e) => {
    filterApps(e.target.value);
  });

  // Open app button
  document.getElementById('open-app-btn').addEventListener('click', openApp);

  // Install app button
  document.getElementById('install-app-btn').addEventListener('click', installApp);

  // Handle browser back/forward buttons
  window.addEventListener('popstate', () => {
    const hash = window.location.hash;
    if (hash === '#apps' || hash === '#app') {
      showView('apps-view');
      if (allApps.length === 0) loadApps();
    } else {
      showView('home-view');
    }
  });

  // Handle initial hash
  window.addEventListener('load', () => {
    const hash = window.location.hash;
    if (hash === '#apps') {
      showView('apps-view');
      loadApps();
    }
  });

  // Setup infinite scroll
  setupInfiniteScroll();
}

// ============================================
// INITIALIZATION
// ============================================
// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializeEventListeners);
} else {
  initializeEventListeners();
}

// Make functions globally accessible
window.showAppDetail = showAppDetail;
window.openApp = openApp;
window.installApp = installApp;
