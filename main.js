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
  // Read dataset (prices & name) from the clicked card
  pmState.name = fromCard.dataset.name;
  pmState.prices = {
    1:  parseFloat(fromCard.dataset.price1 || fromCard.dataset.priceOne || fromCard.dataset.price_1 || fromCard.dataset['price-1'] || fromCard.getAttribute('data-price-1')),
    3:  parseFloat(fromCard.getAttribute('data-price-3')),
    6:  parseFloat(fromCard.getAttribute('data-price-6')),
    12: parseFloat(fromCard.getAttribute('data-price-12')),
  };
  pmState.pack = 1;
  pmState.qty  = 1;

  // Fill UI
  pmNameEl.textContent = pmState.name;
  pmVariantEl.value = '1';
  pmQtyEl.textContent = pmState.qty.toString();
  refreshPmPrice();

  // Show modal
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
    const variantLabel = pmState.pack === 12 ? 'Dozen (12)' : (pmState.pack === 6 ? 'Half-dozen (6)' : 'Single');
    const lineName     = `${pmState.name} – ${variantLabel}`;
    const linePrice    = pmState.prices[pmState.pack];

    addToCart(lineName, linePrice, pmState.qty);  // qty = number of packs
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





