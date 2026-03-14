import {
  getFirestore,
  collection,
  addDoc,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  increment
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import { app, firebaseReady, firebaseConfigError } from "./firebase-config.js";

const COLLECTIONS = {
  products: "customCafeGithubProducts",
  sales: "customCafeGithubSales"
};

const DEFAULT_PRODUCTS = [
  {
    name: "Espresso Black",
    price: 18,
    stock: 80,
    minStock: 15,
    category: "Boisson chaude",
    badge: "Classique",
    image: "images/cafe-espresso.svg"
  },
  {
    name: "Latte Vanille",
    price: 35,
    stock: 55,
    minStock: 10,
    category: "Boisson chaude",
    badge: "Best-seller",
    image: "images/cafe-latte.svg"
  },
  {
    name: "Iced Coffee",
    price: 32,
    stock: 45,
    minStock: 8,
    category: "Boisson froide",
    badge: "Fresh",
    image: "images/cafe-iced.svg"
  },
  {
    name: "Muffin Choco",
    price: 24,
    stock: 40,
    minStock: 10,
    category: "Dessert",
    badge: "Gourmand",
    image: "images/cafe-dessert.svg"
  },
  {
    name: "Cookie Caramel",
    price: 20,
    stock: 50,
    minStock: 12,
    category: "Snack",
    badge: "Promo",
    image: "images/cafe-snack.svg"
  },
  {
    name: "BadSide Signature",
    price: 42,
    stock: 28,
    minStock: 8,
    category: "Signature",
    badge: "Maison",
    image: "images/cafe-signature.svg"
  }
];

const state = {
  products: [],
  sales: [],
  categoryFilter: "all",
  catalogSearch: "",
  stockSearch: "",
  currentSaleLines: []
};

const el = {
  navButtons: [...document.querySelectorAll(".nav-btn")],
  panels: [...document.querySelectorAll(".panel")],
  panelTitle: document.getElementById("panel-title"),
  firebaseStatus: document.getElementById("firebase-status"),
  firebaseWarning: document.getElementById("firebase-warning"),
  quickSyncBtn: document.getElementById("quick-sync-btn"),
  toast: document.getElementById("toast"),
  statRevenue: document.getElementById("stat-revenue"),
  statSalesCount: document.getElementById("stat-sales-count"),
  statAverage: document.getElementById("stat-average"),
  statProductsCount: document.getElementById("stat-products-count"),
  statLowStock: document.getElementById("stat-low-stock"),
  lowStockList: document.getElementById("low-stock-list"),
  latestSalesList: document.getElementById("latest-sales-list"),
  catalogGrid: document.getElementById("catalog-grid"),
  catalogSearch: document.getElementById("catalog-search"),
  catalogCategoryFilter: document.getElementById("catalog-category-filter"),
  saleForm: document.getElementById("sale-form"),
  saleEmployeeName: document.getElementById("sale-employee-name"),
  saleNote: document.getElementById("sale-note"),
  saleLines: document.getElementById("sale-lines"),
  saleLineTemplate: document.getElementById("sale-line-template"),
  addLineBtn: document.getElementById("add-line-btn"),
  clearTicketBtn: document.getElementById("clear-ticket-btn"),
  receiptPreview: document.getElementById("receipt-preview"),
  salesList: document.getElementById("sales-list"),
  productForm: document.getElementById("product-form"),
  productName: document.getElementById("product-name"),
  productPrice: document.getElementById("product-price"),
  productStock: document.getElementById("product-stock"),
  productMinStock: document.getElementById("product-min-stock"),
  productCategory: document.getElementById("product-category"),
  productBadge: document.getElementById("product-badge"),
  productImage: document.getElementById("product-image"),
  stockSearch: document.getElementById("stock-search"),
  stockTableBody: document.getElementById("stock-table-body")
};

const db = firebaseReady ? getFirestore(app) : null;

function euro(value = 0) {
  return new Intl.NumberFormat("fr-BE", {
    style: "currency",
    currency: "EUR",
    minimumFractionDigits: 2
  }).format(Number(value) || 0);
}

function showToast(message, type = "info") {
  if (!el.toast) return;
  el.toast.textContent = message;
  el.toast.className = "toast show";
  if (type === "error") el.toast.style.borderColor = "rgba(255,107,107,0.5)";
  else if (type === "success") el.toast.style.borderColor = "rgba(63,213,138,0.5)";
  else el.toast.style.borderColor = "rgba(255,255,255,0.08)";

  clearTimeout(showToast._timer);
  showToast._timer = setTimeout(() => {
    el.toast.classList.remove("show");
  }, 2600);
}

function escapeHtml(value = "") {
  return String(value).replace(/[&<>"']/g, (match) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[match]));
}

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
}

function emptyLine() {
  return {
    localId: uid(),
    productId: "",
    productName: "",
    quantity: 1,
    unitPrice: 0,
    stock: 0,
    lineTotal: 0
  };
}

function getSafeTimestamp(value) {
  if (!value) return 0;
  if (typeof value.seconds === "number") return value.seconds * 1000;
  const parsed = new Date(value).getTime();
  return Number.isFinite(parsed) ? parsed : 0;
}

function sortByNewest(list) {
  return [...list].sort((a, b) => getSafeTimestamp(b.createdAt) - getSafeTimestamp(a.createdAt));
}

function setFirebaseStatus() {
  if (!firebaseReady) {
    el.firebaseStatus.textContent = "Configurer Firebase";
    el.firebaseStatus.className = "status-pill warning";
    el.firebaseWarning.classList.remove("hidden");
    el.firebaseWarning.querySelector("span").textContent = firebaseConfigError || "Configuration Firebase invalide.";
    return;
  }

  el.firebaseStatus.textContent = "Connecté à Firebase";
  el.firebaseStatus.className = "status-pill ok";
  el.firebaseWarning.classList.add("hidden");
}

function updatePanelTitle(panelId) {
  const titles = {
    "dashboard-panel": "Dashboard général",
    "catalog-panel": "Catalogue produits",
    "cashier-panel": "Caisse temps réel",
    "sales-panel": "Historique des ventes",
    "stock-panel": "Gestion du stock",
    "settings-panel": "Configuration"
  };
  el.panelTitle.textContent = titles[panelId] || "Custom Café";
}

function initNavigation() {
  el.navButtons.forEach((button) => {
    button.addEventListener("click", () => {
      const panelId = button.dataset.panel;
      el.navButtons.forEach((btn) => btn.classList.remove("active"));
      el.panels.forEach((panel) => panel.classList.remove("active"));
      button.classList.add("active");
      document.getElementById(panelId)?.classList.add("active");
      updatePanelTitle(panelId);
    });
  });
}

function computeStats() {
  const revenue = state.sales.reduce((sum, sale) => sum + Number(sale.total || 0), 0);
  const salesCount = state.sales.length;
  const average = salesCount ? revenue / salesCount : 0;
  const lowStock = state.products.filter((product) => Number(product.stock || 0) <= Number(product.minStock || 0));
  return { revenue, salesCount, average, lowStock };
}

function getFilteredProducts() {
  const q = state.catalogSearch.trim().toLowerCase();
  return state.products.filter((product) => {
    const matchesCategory = state.categoryFilter === "all" || product.category === state.categoryFilter;
    const hay = `${product.name} ${product.badge} ${product.category}`.toLowerCase();
    const matchesSearch = !q || hay.includes(q);
    return matchesCategory && matchesSearch;
  });
}

function getStockFilteredProducts() {
  const q = state.stockSearch.trim().toLowerCase();
  return state.products.filter((product) => {
    if (!q) return true;
    const hay = `${product.name} ${product.category} ${product.badge}`.toLowerCase();
    return hay.includes(q);
  });
}

function renderCategoryFilter() {
  const categories = ["all", ...new Set(state.products.map((product) => product.category).filter(Boolean))];
  const current = state.categoryFilter;
  el.catalogCategoryFilter.innerHTML = categories.map((category) => {
    const label = category === "all" ? "Toutes les catégories" : category;
    return `<option value="${escapeHtml(category)}">${escapeHtml(label)}</option>`;
  }).join("");
  el.catalogCategoryFilter.value = categories.includes(current) ? current : "all";
}

function renderDashboard() {
  const stats = computeStats();
  el.statRevenue.textContent = euro(stats.revenue);
  el.statSalesCount.textContent = String(stats.salesCount);
  el.statAverage.textContent = euro(stats.average);
  el.statProductsCount.textContent = String(state.products.length);
  el.statLowStock.textContent = String(stats.lowStock.length);

  if (!stats.lowStock.length) {
    el.lowStockList.innerHTML = `<div class="empty-state-inline">Aucun stock bas.</div>`;
  } else {
    el.lowStockList.innerHTML = stats.lowStock.slice(0, 6).map((product) => `
      <div class="sale-card">
        <div class="sale-item-head">
          <strong>${escapeHtml(product.name)}</strong>
          <span class="qty-bubble low">${product.stock}</span>
        </div>
        <div class="sale-meta">Min conseillé : ${product.minStock} • ${escapeHtml(product.category)}</div>
      </div>
    `).join("");
  }

  const latestSales = sortByNewest(state.sales).slice(0, 5);
  if (!latestSales.length) {
    el.latestSalesList.innerHTML = `<div class="empty-state-inline">Aucune vente.</div>`;
  } else {
    el.latestSalesList.innerHTML = latestSales.map((sale) => `
      <div class="sale-card">
        <div class="sale-item-head">
          <strong>${escapeHtml(sale.employeeName || "Employé")}</strong>
          <span>${euro(sale.total)}</span>
        </div>
        <div class="sale-meta">${formatDate(sale.createdAt)}${sale.note ? ` • ${escapeHtml(sale.note)}` : ""}</div>
      </div>
    `).join("");
  }
}

function renderCatalog() {
  renderCategoryFilter();
  const products = getFilteredProducts();

  if (!products.length) {
    el.catalogGrid.innerHTML = `<div class="empty-state">Aucun produit trouvé.</div>`;
    return;
  }

  el.catalogGrid.innerHTML = products.map((product) => {
    const low = Number(product.stock) <= Number(product.minStock || 0);
    return `
      <article class="product-card">
        <div class="product-image-wrap">
          <img class="product-image" src="${escapeHtml(product.image || 'images/cafe-signature.svg')}" alt="${escapeHtml(product.name)}" />
        </div>
        <div class="product-body">
          <div class="product-top">
            <div>
              <h4>${escapeHtml(product.name)}</h4>
              <div class="product-meta">${escapeHtml(product.category)}</div>
            </div>
            ${product.badge ? `<span class="product-badge">${escapeHtml(product.badge)}</span>` : ""}
          </div>
          <div class="product-footer">
            <div class="product-price">${euro(product.price)}</div>
            <div class="stock-chip ${low ? 'low' : 'good'}">Stock : ${product.stock}</div>
          </div>
        </div>
      </article>
    `;
  }).join("");
}

function renderSaleLines() {
  if (!state.currentSaleLines.length) state.currentSaleLines = [emptyLine()];
  el.saleLines.innerHTML = "";

  state.currentSaleLines.forEach((line) => {
    const row = el.saleLineTemplate.content.firstElementChild.cloneNode(true);
    const productSelect = row.querySelector(".line-product");
    const qtyInput = row.querySelector(".line-qty");
    const priceInput = row.querySelector(".line-price");
    const stockEl = row.querySelector(".line-stock");
    const totalEl = row.querySelector(".line-total");
    const removeBtn = row.querySelector(".remove-line");

    productSelect.innerHTML = `<option value="">Choisir un produit</option>${state.products.map((product) => `
      <option value="${product.id}">${escapeHtml(product.name)} • ${euro(product.price)} • stock ${product.stock}</option>
    `).join("")}`;
    productSelect.value = line.productId || "";
    qtyInput.value = line.quantity;
    priceInput.value = Number(line.unitPrice || 0).toFixed(2);
    stockEl.textContent = `Stock : ${line.stock || 0}`;
    totalEl.textContent = euro(line.lineTotal || 0);

    productSelect.addEventListener("change", (event) => {
      const product = state.products.find((item) => item.id === event.target.value);
      if (!product) {
        Object.assign(line, emptyLine(), { localId: line.localId });
      } else {
        line.productId = product.id;
        line.productName = product.name;
        line.quantity = 1;
        line.unitPrice = Number(product.price || 0);
        line.stock = Number(product.stock || 0);
        line.lineTotal = line.unitPrice;
      }
      renderSaleLines();
      renderReceiptPreview();
    });

    qtyInput.addEventListener("input", (event) => {
      line.quantity = Math.max(1, Number(event.target.value || 1));
      line.lineTotal = line.quantity * Number(line.unitPrice || 0);
      renderSaleLines();
      renderReceiptPreview();
    });

    priceInput.addEventListener("input", (event) => {
      line.unitPrice = Math.max(0, Number(event.target.value || 0));
      line.lineTotal = line.quantity * line.unitPrice;
      renderSaleLines();
      renderReceiptPreview();
    });

    removeBtn.addEventListener("click", () => {
      state.currentSaleLines = state.currentSaleLines.filter((item) => item.localId !== line.localId);
      if (!state.currentSaleLines.length) state.currentSaleLines = [emptyLine()];
      renderSaleLines();
      renderReceiptPreview();
    });

    el.saleLines.appendChild(row);
  });
}

function renderReceiptPreview() {
  const validLines = state.currentSaleLines.filter((line) => line.productId);
  if (!validLines.length) {
    el.receiptPreview.innerHTML = `<div class="empty-state-inline">Aucune ligne dans le ticket.</div>`;
    return;
  }

  const total = validLines.reduce((sum, line) => sum + Number(line.lineTotal || 0), 0);
  el.receiptPreview.innerHTML = `
    <div class="receipt-lines">
      ${validLines.map((line) => `
        <div class="receipt-line">
          <span>${escapeHtml(line.productName)}</span>
          <span>${line.quantity} × ${euro(line.unitPrice)}</span>
          <strong>${euro(line.lineTotal)}</strong>
        </div>
      `).join("")}
    </div>
    <div class="receipt-total">
      <span>Total</span>
      <strong>${euro(total)}</strong>
    </div>
  `;
}

function renderSales() {
  const sales = sortByNewest(state.sales);
  if (!sales.length) {
    el.salesList.innerHTML = `<div class="empty-state">Aucune vente enregistrée.</div>`;
    return;
  }

  el.salesList.innerHTML = sales.map((sale) => `
    <article class="sale-card">
      <div class="sale-item-head">
        <strong>${escapeHtml(sale.employeeName || "Employé")}</strong>
        <span>${euro(sale.total)}</span>
      </div>
      <div class="sale-meta">${formatDate(sale.createdAt)}${sale.note ? ` • ${escapeHtml(sale.note)}` : ""}</div>
      <ul class="sale-lines-list">
        ${(Array.isArray(sale.items) ? sale.items : []).map((item) => `
          <li>${escapeHtml(item.productName || "Produit")} × ${item.quantity} — ${euro(item.lineTotal)}</li>
        `).join("")}
      </ul>
      <div class="sale-actions">
        <button class="btn danger" type="button" data-delete-sale="${sale.id}">Supprimer</button>
      </div>
    </article>
  `).join("");
}

function renderStockTable() {
  const products = getStockFilteredProducts();
  if (!products.length) {
    el.stockTableBody.innerHTML = `<tr><td colspan="6"><div class="empty-state-inline">Aucun produit.</div></td></tr>`;
    return;
  }

  el.stockTableBody.innerHTML = products.map((product) => {
    const low = Number(product.stock) <= Number(product.minStock || 0);
    return `
      <tr>
        <td>
          <strong>${escapeHtml(product.name)}</strong><br>
          <span class="muted">${product.badge ? escapeHtml(product.badge) : 'Sans badge'}</span>
        </td>
        <td>${escapeHtml(product.category)}</td>
        <td>${euro(product.price)}</td>
        <td><span class="qty-bubble ${low ? 'low' : 'good'}">${product.stock}</span></td>
        <td>${product.minStock}</td>
        <td>
          <div class="inline-actions">
            <button class="btn secondary" type="button" data-stock-adjust="${product.id}" data-stock-delta="1">+1</button>
            <button class="btn secondary" type="button" data-stock-adjust="${product.id}" data-stock-delta="5">+5</button>
            <button class="btn ghost" type="button" data-stock-adjust="${product.id}" data-stock-delta="-1">-1</button>
            <button class="btn danger" type="button" data-delete-product="${product.id}">Supprimer</button>
          </div>
        </td>
      </tr>
    `;
  }).join("");
}

function renderAll() {
  renderDashboard();
  renderCatalog();
  renderSaleLines();
  renderReceiptPreview();
  renderSales();
  renderStockTable();
}

function formatDate(value) {
  const time = getSafeTimestamp(value);
  if (!time) return "Date inconnue";
  return new Intl.DateTimeFormat("fr-BE", {
    dateStyle: "short",
    timeStyle: "short"
  }).format(new Date(time));
}

async function seedProductsIfEmpty() {
  const snapshot = await getDocs(collection(db, COLLECTIONS.products));
  if (!snapshot.empty) return;
  for (const product of DEFAULT_PRODUCTS) {
    await addDoc(collection(db, COLLECTIONS.products), {
      ...product,
      createdAt: serverTimestamp()
    });
  }
}

function subscribeProducts() {
  const q = query(collection(db, COLLECTIONS.products), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    state.products = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    state.currentSaleLines = state.currentSaleLines.map((line) => {
      if (!line.productId) return line;
      const fresh = state.products.find((product) => product.id === line.productId);
      if (!fresh) return { ...emptyLine(), localId: line.localId };
      return {
        ...line,
        productName: fresh.name,
        stock: Number(fresh.stock || 0),
        unitPrice: Number(line.unitPrice || fresh.price || 0),
        lineTotal: Number(line.quantity || 1) * Number(line.unitPrice || fresh.price || 0)
      };
    });
    renderAll();
  });
}

function subscribeSales() {
  const q = query(collection(db, COLLECTIONS.sales), orderBy("createdAt", "desc"));
  onSnapshot(q, (snapshot) => {
    state.sales = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }));
    renderAll();
  });
}

async function createProduct(event) {
  event.preventDefault();
  if (!firebaseReady) return showToast("Firebase non configuré.", "error");

  const payload = {
    name: el.productName.value.trim(),
    price: Number(el.productPrice.value || 0),
    stock: Number(el.productStock.value || 0),
    minStock: Number(el.productMinStock.value || 0),
    category: el.productCategory.value,
    badge: el.productBadge.value.trim(),
    image: el.productImage.value,
    createdAt: serverTimestamp()
  };

  if (!payload.name) return showToast("Nom du produit requis.", "error");
  await addDoc(collection(db, COLLECTIONS.products), payload);
  el.productForm.reset();
  el.productMinStock.value = 10;
  showToast("Produit ajouté.", "success");
}

async function createSale(event) {
  event.preventDefault();
  if (!firebaseReady) return showToast("Firebase non configuré.", "error");

  const employeeName = el.saleEmployeeName.value.trim();
  if (!employeeName) return showToast("Nom employé requis.", "error");

  const validLines = state.currentSaleLines.filter((line) => line.productId);
  if (!validLines.length) return showToast("Ajoute au moins une ligne.", "error");

  const preparedLines = validLines.map((line) => {
    const product = state.products.find((item) => item.id === line.productId);
    if (!product) throw new Error(`Produit introuvable: ${line.productName}`);
    const quantity = Math.max(1, Number(line.quantity || 1));
    if (Number(product.stock || 0) < quantity) throw new Error(`Stock insuffisant pour ${product.name}`);
    return {
      productId: product.id,
      productName: product.name,
      quantity,
      unitPrice: Number(line.unitPrice || 0),
      lineTotal: quantity * Number(line.unitPrice || 0)
    };
  });

  const total = preparedLines.reduce((sum, item) => sum + item.lineTotal, 0);

  await addDoc(collection(db, COLLECTIONS.sales), {
    employeeName,
    note: el.saleNote.value.trim(),
    total,
    items: preparedLines,
    createdAt: serverTimestamp()
  });

  for (const line of preparedLines) {
    await updateDoc(doc(db, COLLECTIONS.products, line.productId), {
      stock: increment(-line.quantity)
    });
  }

  state.currentSaleLines = [emptyLine()];
  el.saleForm.reset();
  showToast("Vente enregistrée.", "success");
  renderSaleLines();
  renderReceiptPreview();
}

async function adjustStock(productId, delta) {
  if (!firebaseReady) return;
  const product = state.products.find((item) => item.id === productId);
  if (!product) return;
  const nextStock = Number(product.stock || 0) + Number(delta || 0);
  if (nextStock < 0) return showToast("Stock déjà à 0.", "error");
  await updateDoc(doc(db, COLLECTIONS.products, productId), {
    stock: increment(Number(delta || 0))
  });
}

async function deleteProduct(productId) {
  if (!firebaseReady) return;
  await deleteDoc(doc(db, COLLECTIONS.products, productId));
  showToast("Produit supprimé.", "success");
}

async function deleteSale(saleId) {
  if (!firebaseReady) return;
  await deleteDoc(doc(db, COLLECTIONS.sales, saleId));
  showToast("Vente supprimée.", "success");
}

function initEvents() {
  el.catalogSearch.addEventListener("input", (event) => {
    state.catalogSearch = event.target.value;
    renderCatalog();
  });

  el.catalogCategoryFilter.addEventListener("change", (event) => {
    state.categoryFilter = event.target.value;
    renderCatalog();
  });

  el.stockSearch.addEventListener("input", (event) => {
    state.stockSearch = event.target.value;
    renderStockTable();
  });

  el.addLineBtn.addEventListener("click", () => {
    state.currentSaleLines.push(emptyLine());
    renderSaleLines();
    renderReceiptPreview();
  });

  el.clearTicketBtn.addEventListener("click", () => {
    state.currentSaleLines = [emptyLine()];
    renderSaleLines();
    renderReceiptPreview();
  });

  el.productForm.addEventListener("submit", (event) => {
    createProduct(event).catch((error) => {
      console.error(error);
      showToast(error.message || "Erreur produit.", "error");
    });
  });

  el.saleForm.addEventListener("submit", (event) => {
    createSale(event).catch((error) => {
      console.error(error);
      showToast(error.message || "Erreur vente.", "error");
    });
  });

  document.addEventListener("click", (event) => {
    const stockBtn = event.target.closest("[data-stock-adjust]");
    const deleteProductBtn = event.target.closest("[data-delete-product]");
    const deleteSaleBtn = event.target.closest("[data-delete-sale]");

    if (stockBtn) {
      adjustStock(stockBtn.dataset.stockAdjust, Number(stockBtn.dataset.stockDelta)).catch((error) => {
        console.error(error);
        showToast("Erreur stock.", "error");
      });
    }

    if (deleteProductBtn) {
      if (!confirm("Supprimer ce produit ?")) return;
      deleteProduct(deleteProductBtn.dataset.deleteProduct).catch((error) => {
        console.error(error);
        showToast("Erreur suppression produit.", "error");
      });
    }

    if (deleteSaleBtn) {
      if (!confirm("Supprimer cette vente ?")) return;
      deleteSale(deleteSaleBtn.dataset.deleteSale).catch((error) => {
        console.error(error);
        showToast("Erreur suppression vente.", "error");
      });
    }
  });

  el.quickSyncBtn.addEventListener("click", () => {
    renderAll();
    showToast(firebaseReady ? "Interface actualisée." : "Firebase pas encore configuré.");
  });
}

async function init() {
  setFirebaseStatus();
  initNavigation();
  initEvents();
  state.currentSaleLines = [emptyLine()];
  renderAll();

  if (!firebaseReady) return;

  await seedProductsIfEmpty();
  subscribeProducts();
  subscribeSales();
}

init().catch((error) => {
  console.error(error);
  showToast("Erreur chargement site.", "error");
});
