// Kitchen items data and search functionality

// Firebase: set your config from Firebase Console (Project settings > General > Your apps). Enables comments for everyone (anonymous sign-in).
var FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAfmUIOflfj_baArR02biMQ7PRdJ3hD3Cc',
  authDomain: 'kitchen-site-ccb99.firebaseapp.com',
  projectId: 'kitchen-site-ccb99',
  storageBucket: 'kitchen-site-ccb99.firebasestorage.app',
  messagingSenderId: '110423074107',
  appId: '1:110423074107:web:c31cd65aad4e6d7f09831e'
};

let allItems = [];
let filteredItems = [];
let selectedCategory = 'all';
let commentsUnsubscribe = null;
let currentDetailItemName = null;
let firebaseInitialized = false;

// Load items from localStorage or use default data
function loadItems() {
    const saved = localStorage.getItem('kitchenItems');
    if (saved) {
        try {
            const parsed = JSON.parse(saved);
            // Filter out removed items (40, 41, 42) - only for items with numeric-style names
            const filtered = parsed.filter(item => {
                const match = item.name.match(/^Item-(\d+)$/);
                if (match) {
                    const num = parseInt(match[1], 10);
                    return num !== 40 && num !== 41 && num !== 42;
                }
                return true;
            });
            // If items were filtered, save the updated list
            if (filtered.length !== parsed.length) {
                localStorage.setItem('kitchenItems', JSON.stringify(filtered));
            }
            // Merge in default location for any item missing it (e.g. old saved data)
            // Normalize image paths (extra_images merged into images)
            const withLocation = filtered.map(item => {
                const image = (item.image && item.image.replace) ? item.image.replace('extra_images/', 'images/') : item.image;
                const hasLocation = item.location !== undefined && item.location !== null && String(item.location).trim() !== '';
                if (hasLocation) {
                    return { ...item, image };
                }
                const defaultItem = kitchenItems.find(d => d.name === item.name || d.image === item.image);
                let location = defaultItem ? (defaultItem.location || '') : '';
                if (!location && image) {
                    if (image.indexOf('images/') === 0) location = 'bin bag';
                }
                return { ...item, image, location };
            });
            localStorage.setItem('kitchenItems', JSON.stringify(withLocation));
            return withLocation;
        } catch (e) {
            console.error('Error loading saved items:', e);
            return kitchenItems;
        }
    }
    return kitchenItems;
}

// Save items to localStorage
function saveItems() {
    localStorage.setItem('kitchenItems', JSON.stringify(allItems));
}

// Initialize the app
document.addEventListener('DOMContentLoaded', () => {
    allItems = loadItems();
    filteredItems = [...allItems];
    
    // Check for item query parameter
    const urlParams = new URLSearchParams(window.location.search);
    const itemName = urlParams.get('item');
    
    if (itemName) {
        // Show detail view
        showItemDetail(itemName);
    } else {
        // Show main list view
        showMainList();
    }
    
    // Back button handler
    const backBtn = document.getElementById('backBtn');
    if (backBtn) {
        backBtn.addEventListener('click', () => {
            window.location.href = 'index.html';
        });
    }
});

function showMainList() {
    const detailView = document.getElementById('itemDetailView');
    const mainView = document.getElementById('mainListView');
    
    if (detailView) detailView.style.display = 'none';
    if (mainView) mainView.style.display = 'block';
    
    // Reset page title
    document.title = 'the Albeshti Kitchen';
    
    // Initialize category filter
    renderCategoryFilter();
    updateItemCount();
    renderItems(filteredItems);
    
    // Search functionality
    const searchInput = document.getElementById('searchInput');
    if (searchInput) {
        searchInput.addEventListener('input', handleSearch);
        
        // Clear search on Escape key
        searchInput.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                searchInput.value = '';
                handleSearch();
            }
        });
    }
    
    // Edit modal handlers
    setupEditModal();
}

function showItemDetail(itemName) {
    const detailView = document.getElementById('itemDetailView');
    const mainView = document.getElementById('mainListView');
    
    if (mainView) mainView.style.display = 'none';
    if (detailView) detailView.style.display = 'block';
    
    // Find the item
    const item = allItems.find(i => i.name === itemName);
    
    if (!item) {
        // Item not found, redirect to main page
        window.location.href = 'index.html';
        return;
    }
    
    // Update page title
    document.title = `${item.name} - the Albeshti Kitchen`;
    
    // Populate detail view
    document.getElementById('detailItemName').textContent = item.name;
    document.getElementById('detailItemImage').src = item.image || '';
    document.getElementById('detailItemImage').alt = item.name;
    
    const categoryEl = document.getElementById('detailItemCategory');
    categoryEl.textContent = item.category;
    categoryEl.className = 'item-detail-category';
    
    const locationEl = document.getElementById('detailItemLocation');
    const locationValue = item.location || (item.image && item.image.indexOf('images/') === 0 ? 'bin bag' : '');
    if (locationValue) {
        locationEl.textContent = 'Location: ' + locationValue;
        locationEl.style.display = 'block';
    } else {
        locationEl.style.display = 'none';
    }
    
    const quantityEl = document.getElementById('detailItemQuantity');
    if (item.quantity && item.quantity > 1) {
        quantityEl.textContent = `Quantity: ×${item.quantity}`;
        quantityEl.style.display = 'block';
    } else {
        quantityEl.style.display = 'none';
    }
    
    const descriptionEl = document.getElementById('detailItemDescription');
    if (item.description) {
        descriptionEl.textContent = item.description;
        descriptionEl.style.display = 'block';
    } else {
        descriptionEl.style.display = 'none';
    }
    
    currentDetailItemName = item.name;
    if (commentsUnsubscribe) {
        commentsUnsubscribe();
        commentsUnsubscribe = null;
    }
    setupCommentsForItem(item.name);
}

function itemSlug(name) {
    return (name || '').toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, '');
}

function ensureFirebase() {
    if (firebaseInitialized || !FIREBASE_CONFIG || !window.firebase) return !!window.firebase;
    try {
        window.firebase.initializeApp(FIREBASE_CONFIG);
        firebaseInitialized = true;
        return true;
    } catch (e) {
        console.warn('Firebase init failed', e);
        return false;
    }
}

function setupCommentsForItem(itemName) {
    var listEl = document.getElementById('comments-list');
    var formEl = document.getElementById('comment-form');
    var textEl = document.getElementById('comment-text');
    var hintEl = document.getElementById('comments-login-hint');
    if (!listEl || !formEl || !textEl) return;
    listEl.innerHTML = '';
    textEl.value = '';
    if (!FIREBASE_CONFIG || !ensureFirebase()) {
        listEl.innerHTML = '<p class="comments-disabled">Comments are disabled. Add your Firebase config in script.js to enable.</p>';
        formEl.style.display = 'none';
        if (hintEl) hintEl.style.display = 'none';
        return;
    }
    formEl.style.display = 'block';
    if (hintEl) hintEl.style.display = 'block';
    var db = firebase.firestore();
    var slug = itemSlug(itemName);
    var itemRef = db.collection('item-comments').doc(slug);
    commentsUnsubscribe = itemRef.collection('comments').orderBy('createdAt', 'asc').onSnapshot(function (snap) {
        listEl.innerHTML = '';
        snap.docs.forEach(function (doc) {
            var d = doc.data();
            var div = document.createElement('div');
            div.className = 'comment-item';
            var time = d.createdAt && d.createdAt.toDate ? d.createdAt.toDate() : new Date();
            var dateStr = time.toLocaleDateString() + ' ' + time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
            div.innerHTML = '<span class="comment-meta">' + escapeHtml(d.author || 'Guest') + ' · ' + dateStr + '</span><p class="comment-text">' + escapeHtml(d.text || '') + '</p>';
            listEl.appendChild(div);
        });
    }, function (err) {
        listEl.innerHTML = '<p class="comments-disabled">Could not load comments.</p>';
    });
    formEl.onsubmit = function (e) {
        e.preventDefault();
        var text = textEl.value.trim();
        if (!text) return;
        firebase.auth().signInAnonymously().then(function () {
            itemRef.set({ itemName: itemName }, { merge: true });
            return itemRef.collection('comments').add({
                text: text,
                author: 'Guest',
                createdAt: firebase.firestore.FieldValue.serverTimestamp()
            });
        }).then(function () {
            textEl.value = '';
        }).catch(function (err) {
            alert('Failed to post comment. Try again.');
        });
    };
}

function handleSearch() {
    const searchTerm = document.getElementById('searchInput').value.toLowerCase().trim();
    
    let items = allItems;
    
    // Filter by category first
    if (selectedCategory !== 'all') {
        items = items.filter(item => 
            item.category.toLowerCase() === selectedCategory.toLowerCase()
        );
    }
    
    // Then filter by search term
    if (searchTerm !== '') {
        filteredItems = items.filter(item => {
            const nameMatch = item.name.toLowerCase().includes(searchTerm);
            const categoryMatch = item.category.toLowerCase().includes(searchTerm);
            const descriptionMatch = item.description && item.description.toLowerCase().includes(searchTerm);
            const locationMatch = item.location && item.location.toLowerCase().includes(searchTerm);
            return nameMatch || categoryMatch || descriptionMatch || locationMatch;
        });
    } else {
        filteredItems = items;
    }
    
    updateItemCount();
    renderItems(filteredItems);
}

function getUniqueCategories() {
    const categories = new Set();
    allItems.forEach(item => {
        if (item.category) {
            categories.add(item.category.toLowerCase());
        }
    });
    return Array.from(categories).sort();
}

function renderCategoryFilter() {
    const filterContainer = document.getElementById('categoryFilter');
    const categories = getUniqueCategories();
    
    let html = '<button class="category-btn active" data-category="all">All</button>';
    
    categories.forEach(category => {
        const displayName = category.charAt(0).toUpperCase() + category.slice(1);
        html += `<button class="category-btn" data-category="${category}">${escapeHtml(displayName)}</button>`;
    });
    
    filterContainer.innerHTML = html;
    
    // Add click handlers
    filterContainer.querySelectorAll('.category-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const category = btn.getAttribute('data-category');
            selectCategory(category);
        });
    });
}

function selectCategory(category) {
    selectedCategory = category;
    
    // Update active state
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-category') === category) {
            btn.classList.add('active');
        }
    });
    
    // Re-apply filters
    handleSearch();
}

function renderItems(items) {
    const grid = document.getElementById('itemsGrid');
    const noResults = document.getElementById('noResults');
    
    if (items.length === 0) {
        grid.innerHTML = '';
        noResults.style.display = 'block';
        return;
    }
    
    noResults.style.display = 'none';
    grid.innerHTML = items.map((item) => createItemCard(item)).join('');
    
    // Add click and edit button event listeners
    items.forEach((item) => {
        // Find the card by matching the item
        const cards = grid.children;
        for (let i = 0; i < cards.length; i++) {
            const card = cards[i];
            const nameEl = card.querySelector('.item-name');
            if (nameEl && nameEl.textContent.includes(item.name)) {
                // Make card clickable to navigate to detail page
                card.style.cursor = 'pointer';
                card.addEventListener('click', (e) => {
                    // Don't navigate if clicking the edit button
                    if (!e.target.closest('.item-edit-btn')) {
                        window.location.href = `index.html?item=${encodeURIComponent(item.name)}`;
                    }
                });
                
                // Edit button
                const editBtn = card.querySelector('.item-edit-btn');
                if (editBtn) {
                    editBtn.addEventListener('click', (e) => {
                        e.stopPropagation();
                        // Find the index in allItems
                        const itemIndex = allItems.findIndex(ai => ai === item || 
                            (ai.image === item.image && ai.name === item.name));
                        if (itemIndex !== -1) {
                            openEditModal(item, itemIndex);
                        }
                    });
                }
                break;
            }
        }
    });
}

function createItemCard(item) {
    const imageSrc = item.image || 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="200" height="200"%3E%3Crect fill="%23f0f0f0" width="200" height="200"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="%23999" font-family="Arial" font-size="14"%3ENo Image%3C/text%3E%3C/svg%3E';
    const imageAlt = item.name;
    const quantity = item.quantity || 1;
    const quantityDisplay = quantity > 1 ? `<span class="item-quantity">×${quantity}</span>` : '';
    const locationValue = item.location || (item.image && item.image.indexOf('images/') === 0 ? 'bin bag' : '');
    const locationDisplay = locationValue ? `<div class="item-location">${escapeHtml(locationValue)}</div>` : '';
    const description = item.description ? `<div class="item-description">${escapeHtml(item.description)}</div>` : '';
    
    return `
        <div class="item-card">
            <button class="item-edit-btn" aria-label="Edit item">✏️</button>
            <div class="item-image">
                <img src="${imageSrc}" alt="${imageAlt}" loading="lazy" 
                     onerror="this.onerror=null; this.parentElement.innerHTML='📦';">
            </div>
            <div class="item-info">
                <div class="item-name">${escapeHtml(item.name)}${quantityDisplay}</div>
                <div class="item-category">${escapeHtml(item.category)}</div>
                ${locationDisplay}
                ${description}
            </div>
        </div>
    `;
}

function openEditModal(item, index) {
    const modal = document.getElementById('editModal');
    const form = document.getElementById('editForm');
    
    document.getElementById('editItemIndex').value = index;
    document.getElementById('editName').value = item.name;
    document.getElementById('editCategory').value = item.category;
    document.getElementById('editLocation').value = item.location || '';
    document.getElementById('editQuantity').value = item.quantity || 1;
    document.getElementById('editDescription').value = item.description || '';
    
    modal.style.display = 'block';
    document.body.style.overflow = 'hidden';
    document.getElementById('editName').focus();
}

function closeEditModal() {
    const modal = document.getElementById('editModal');
    modal.style.display = 'none';
    document.body.style.overflow = '';
    document.getElementById('editForm').reset();
}

function setupEditModal() {
    const modal = document.getElementById('editModal');
    const backdrop = document.getElementById('editModalBackdrop');
    const closeBtn = document.getElementById('editModalClose');
    const cancelBtn = document.getElementById('editCancelBtn');
    const form = document.getElementById('editForm');
    
    backdrop.addEventListener('click', closeEditModal);
    closeBtn.addEventListener('click', closeEditModal);
    cancelBtn.addEventListener('click', closeEditModal);
    
    form.addEventListener('submit', (e) => {
        e.preventDefault();
        saveEditedItem();
    });
    
    // Close on Escape key
    document.addEventListener('keydown', (e) => {
        if (e.key === 'Escape' && modal.style.display === 'block') {
            closeEditModal();
        }
    });
}

function saveEditedItem() {
    const index = parseInt(document.getElementById('editItemIndex').value);
    const name = document.getElementById('editName').value.trim();
    const category = document.getElementById('editCategory').value.trim();
    const location = document.getElementById('editLocation').value.trim();
    const quantity = parseInt(document.getElementById('editQuantity').value) || 1;
    const description = document.getElementById('editDescription').value.trim();
    
    if (!name || !category) {
        alert('Please fill in name and category');
        return;
    }
    
    // Update the item
    const item = allItems[index];
    item.name = name;
    item.category = category;
    item.location = location;
    item.quantity = quantity;
    item.description = description;
    
    // Save to localStorage
    saveItems();
    
    // Update filtered items if this item is in the current view
    const filteredIndex = filteredItems.findIndex(fi => fi === item);
    if (filteredIndex !== -1) {
        filteredItems[filteredIndex] = item;
    }
    
    // Re-render
    renderCategoryFilter(); // Refresh category filter in case categories changed
    renderItems(filteredItems);
    updateItemCount();
    
    closeEditModal();
}


function escapeHtml(text) {
    const div = document.createElement('div');
    div.textContent = text;
    return div.innerHTML;
}

function updateItemCount() {
    const itemCountEl = document.getElementById('itemCount');
    const filteredCountEl = document.getElementById('filteredCount');
    
    itemCountEl.textContent = `${allItems.length} item${allItems.length !== 1 ? 's' : ''}`;
    
    if (filteredItems.length !== allItems.length) {
        filteredCountEl.textContent = `Showing ${filteredItems.length}`;
    } else {
        filteredCountEl.textContent = '';
    }
}
