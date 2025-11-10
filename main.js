// --- cart logic ---
let cart = JSON.parse(localStorage.getItem('cart')) || [];

// Re-draw the badge (only if the badge exists)
function updateCartCount() {
  const badge = document.getElementById('cart-count');
  if (badge) {
    badge.textContent = cart.reduce((sum, item) => sum + item.qty, 0);
  }
}

// Save & refresh badge AND live‐update cart page if open
function saveCart() {
  localStorage.setItem('cart', JSON.stringify(cart));
  updateCartCount();
  if (document.getElementById('cart-items')) {
    renderCartPage();
  }
}

function syncCartWithMenu() {
  document.querySelectorAll('.product.configurable').forEach(card => {
    const name = card.dataset.name;
    const newPrice = parseFloat(card.dataset.price1);
    const item = cart.find(i => i.name.startsWith(name));
    if (item) {
      item.price = newPrice; // update price
      item.name = name;      // update name
    }
  });
  saveCart();
}

// Add item (or bump qty)
function addToCart(name, price) {
  const idx = cart.findIndex(i => i.name === name);
  if (idx > -1) {
    cart[idx].qty++;
  } else {
    cart.push({ name, price: parseFloat(price), qty: 1 });
  }
  saveCart();
}

document.addEventListener('DOMContentLoaded', () => {
  // Only update badge if on index.html (or wherever you have #cart-count)
  updateCartCount();

  // Wire up add-to-cart buttons if they exist
  document.querySelectorAll('.add-to-cart:not(#pm-add)').forEach(btn => {
  btn.addEventListener('click', () => {
    addToCart(btn.dataset.name, btn.dataset.price);
  });
  });

  // If you’re on cart.html (i.e. #cart-items exists), render and sync
  if (document.getElementById('cart-items')) {
    renderCartPage();
    syncCartWithMenu();
  }
}); 

// Render the cart with “–” and “+” buttons
function renderCartPage() {
  const container = document.getElementById('cart-items');
  container.innerHTML = '';
  let total = 0;

  cart.forEach(item => {
    total += item.price * item.qty;
    const row = document.createElement('div');
    row.className = 'cart-row';
    row.innerHTML = `
      <span class="cart-name">${item.name}</span>
      <div class="cart-qty">
        <button class="decrement">–</button>
        <span>${item.qty}</span>
        <button class="increment">+</button>
      </div>
      <span class="cart-line-total">$${(item.price * item.qty).toFixed(2)}</span>
    `;

    row.querySelector('.decrement').addEventListener('click', () => {
      if (item.qty > 1) item.qty--;
      else cart = cart.filter(i => i.name !== item.name);
      saveCart();
    });
    row.querySelector('.increment').addEventListener('click', () => {
      item.qty++;
      saveCart();
    });

    container.appendChild(row);
  });

  document.getElementById('cart-total').textContent = total.toFixed(2);
}
// simple dropdown toggle (works on click; good for touch devices)
document.addEventListener('DOMContentLoaded', () => {
  const dd = document.querySelector('.dropdown');
  if (dd) {
    const btn = dd.querySelector('.dropbtn');
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      dd.classList.toggle('open');
      btn.setAttribute('aria-expanded', dd.classList.contains('open'));
    });
    document.addEventListener('click', () => {
      dd.classList.remove('open');
      btn.setAttribute('aria-expanded', 'false');
    });
  }
});
// Show only the category indicated by the URL hash on menu.html
function showCategoryFromHash() {
  const cat = (location.hash || '').replace('#','').trim(); // e.g. "cookies"
  const sections = document.querySelectorAll('.category');   // each <section id="cakes" class="category">
  if (!sections.length) return;

  // If a category is provided, hide the others; otherwise show all
  sections.forEach(sec => {
    sec.style.display = !cat || sec.id === cat ? 'block' : 'none';
  });

  // Optional: update the dropdown state/active link
  document.querySelectorAll('.dropdown-menu a').forEach(a => {
    a.classList.toggle('active', a.getAttribute('href').endsWith(`#${cat}`));
  });
}

document.addEventListener('DOMContentLoaded', showCategoryFromHash);
window.addEventListener('hashchange', showCategoryFromHash);

/* ========= Configurable product (modal) ========= */

let pmState = {
  name: '',
  prices: {1:0, 3:0, 6:0, 12:0},  // per-pack price
  pack: 1,                   // 1, 6 or 12
  qty: 1                     // number of packs
};

const pmEl        = document.getElementById('product-modal');
const pmNameEl    = document.getElementById('pm-name');
const pmVariantEl = document.getElementById('pm-variant');
const pmQtyEl     = document.getElementById('pm-qty');
const pmPriceEl   = document.getElementById('pm-price');
const pmAddBtn    = document.getElementById('pm-add');
const pmCloseBtn  = document.getElementById('pm-close');

function openProductModal(fromCard) {
  // --- Base setup ---
  pmState.name = fromCard.dataset.name;
  pmState.prices = {
    1:  parseFloat(fromCard.getAttribute('data-price-1')) || 0,
    3:  parseFloat(fromCard.getAttribute('data-price-3')) || 0,
    4:  parseFloat(fromCard.getAttribute('data-price-4')) || 0,
    6:  parseFloat(fromCard.getAttribute('data-price-6')) || 0,
    12: parseFloat(fromCard.getAttribute('data-price-12')) || 0
  };
  pmState.pack = 1;
  pmState.qty  = 1;

  pmNameEl.textContent = pmState.name;
  pmQtyEl.textContent = pmState.qty.toString();

  const variantSelect = pmVariantEl;
  variantSelect.innerHTML = ''; // clear any old options

  const productName = (fromCard.dataset.name || '').toLowerCase();

  // === Special logic for variants ===
  if (productName.includes('assorted cupcakes')) {
    // show only 4, 6, and 12
    variantSelect.innerHTML = `
      <option value="4" selected>Four pieces (4)</option>
      <option value="6">Half-dozen (6)</option>
      <option value="12">Dozen (12)</option>
    `;
    pmState.pack = 4;
  } 
  else if (productName.includes('assorted cookies')) {
    // show only 6 and 12
    variantSelect.innerHTML = `
      <option value="6" selected>Half-dozen (6)</option>
      <option value="12">Dozen (12)</option>
    `;
    pmState.pack = 6;
  } 
  else {
    // default for everything else
    variantSelect.innerHTML = `
      <option value="1" selected>Single</option>
      <option value="3">Three pieces (3)</option>
      <option value="6">Half-dozen (6)</option>
      <option value="12">Dozen (12)</option>
    `;
    pmState.pack = 1;
  }

  refreshPmPrice();

  // === FLAVOR PICKER LOGIC ===
  const flavorSection = document.getElementById('flavor-section');
  const flavorGrid = document.getElementById('flavor-grid');
  const flavorNote = document.getElementById('flavor-limit-note');
  flavorGrid.innerHTML = '';
  flavorSection.style.display = 'none';

  if (productName.includes('assorted cookies')) {
    flavorSection.style.display = 'block';

    const flavors = [
      { name: 'Red velvet cookie', img: 'images/cookies/six red velvet cookies.jpeg' },
      { name: "S'mores cookie", img: "images/cookies/S'mores cookies.jpg" },
      { name: 'Chocolate chip cookie', img: 'images/cookies/chocolate chip cookies.jpg' },
      { name: 'Cookies n cream cookie', img: 'images/cookies/cookies n cream cookies.webp' },
      { name: 'Cookie monster cookie', img: 'images/cookies/Cookie-Monster-Cookies.jpg' },
      { name: 'Strawberry crunch cookie', img: 'images/cookies/Strawberry crunch cookies.webp' },
      { name: 'Grinch cookie', img: 'images/cookies/Grinch cookies.jpg' }
    ];

    // Create clickable image cards
    flavors.forEach(flavor => {
      const div = document.createElement('div');
      div.classList.add('flavor-option');
      div.innerHTML = `
        <img src="${flavor.img}" alt="${flavor.name}">
        <span>${flavor.name}</span>
      `;
      div.addEventListener('click', () => {
        div.classList.toggle('selected');
        enforceFlavorLimit();
      });
      flavorGrid.appendChild(div);
    });

    function enforceFlavorLimit() {
      const selected = flavorGrid.querySelectorAll('.selected');
      const limit = parseInt(pmVariantEl.value, 10);
      flavorNote.textContent = `You can select up to ${limit} flavors. (${selected.length}/${limit} chosen)`;

      if (selected.length > limit) {
        selected[selected.length - 1].classList.remove('selected');
        flavorNote.textContent = `You can select up to ${limit} flavors. Limit reached!`;
      }
    }

    // Update the flavor limit note when quantity changes
    pmVariantEl.addEventListener('change', enforceFlavorLimit);
    enforceFlavorLimit();
  }

  // Finally, show modal
  pmEl.style.display = 'flex';
}

function closeProductModal() {
  pmEl.style.display = 'none';
}

function refreshPmPrice() {
  const priceForPack = pmState.prices[pmState.pack] || 0;
  const total = priceForPack * pmState.qty;
  pmPriceEl.textContent = total.toFixed(2);
}

// Wire the modal controls
if (pmEl) {
  // Open on “Select Options”
  document.addEventListener('click', (e) => {
    const btn = e.target.closest('.configure-btn');
    if (!btn) return;
    const card = btn.closest('.product.configurable');
    if (card) openProductModal(card);
  });

  // Variant dropdown
  pmVariantEl.addEventListener('change', () => {
    pmState.pack = parseInt(pmVariantEl.value, 10);
    refreshPmPrice();
  });

  // Quantity +/- (number of packs)
  document.getElementById('pm-inc').addEventListener('click', () => {
    pmState.qty++; pmQtyEl.textContent = pmState.qty; refreshPmPrice();
  });
  document.getElementById('pm-dec').addEventListener('click', () => {
    if (pmState.qty > 1) { pmState.qty--; pmQtyEl.textContent = pmState.qty; refreshPmPrice(); }
  });

  // Add to cart (name includes the variant label)
pmAddBtn.addEventListener('click', () => {
  const variantLabel = pmState.pack === 12 ? 'Dozen (12)' : (pmState.pack === 6 ? 'Half-dozen (6)' : (pmState.pack === 4 ? 'Four pieces (4)' : 'Single'));
  let lineName = `${pmState.name} – ${variantLabel}`;
  const linePrice = pmState.prices[pmState.pack];
  
  // Include selected flavors if applicable
  const selectedFlavors = [...document.querySelectorAll('.flavor-option.selected')].map(div => div.textContent);
  if (selectedFlavors.length > 0) {
    lineName += ` [${selectedFlavors.join(', ')}]`;
  }

  addToCart(lineName, linePrice, pmState.qty);
  closeProductModal();
});

  
/* === Upgrade addToCart to accept a quantity (keeps old calls working) === */
const _oldAddToCart = addToCart;
addToCart = function(name, price, qty = 1) {
  const idx = cart.findIndex(i => i.name === name);
  if (idx > -1) {
    cart[idx].qty += qty;
  } else {
    cart.push({ name, price: parseFloat(price), qty });
  }
  saveCart();
};
  // Close handlers
  pmCloseBtn.addEventListener('click', closeProductModal);
  pmEl.addEventListener('click', (e) => { if (e.target === pmEl) closeProductModal(); });
}













