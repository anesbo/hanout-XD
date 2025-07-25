// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzOFkA7JE4_yfOEa-43mDVZ0sjYy5kGc9-aOyPnoM4FLIRIv9Nc0aFPYDHpMLh-H9Zr/exec";
const API_KEY = "anes:)";
// --------------------

// --- DOM Element Selections ---
const productForm = document.getElementById('product-form');
const productsTableBody = document.querySelector('#products-table tbody');
const ordersTableBody = document.querySelector('#orders-table tbody');
const clearFormBtn = document.getElementById('clear-form-btn');
const mainContainer = document.querySelector('.container'); // The main container for our single event listener

// --- API Helper Function ---
async function performAction(payload) {
    payload.apiKey = API_KEY; // Add the API key automatically
    const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    return await res.json();
}

// --- DATA FETCHING & DISPLAY ---
async function fetchData(sheetName) {
    const res = await fetch(`${SCRIPT_URL}?sheet=${sheetName}`);
    return await res.json();
}

// Replace your entire displayData function in admin.js with this one.
function displayData(data, tableBody) {
    const table = tableBody.parentElement;
    const thead = table.querySelector('thead');
    thead.innerHTML = '';
    tableBody.innerHTML = '';

    if (!data || data.length === 0) return;

    const headers = Object.keys(data[0]);
    const headerRow = document.createElement('tr');
    headerRow.innerHTML = headers.map(h => `<th>${h}</th>`).join('') + '<th>Actions</th>';
    thead.appendChild(headerRow);

    data.forEach(item => {
        const row = document.createElement('tr');
        row.innerHTML = headers.map(h => `<td>${item[h]}</td>`).join('');

        let buttons = '';
        if (table.id === 'products-table') {
            row.dataset.id = item.ProductID;
            buttons = `
                <button class="action-btn edit-btn">Edit</button>
                <button class="action-btn delete-btn">Delete</button>`;
        } else if (table.id === 'orders-table') {
            row.dataset.id = item.OrderID;
            buttons = `
                <button class="action-btn status-done-btn">Done</button>
                <button class="action-btn status-canceled-btn">Canceled</button>
                <button class="action-btn delete-btn">Delete</button>`;
        }
        
        // --- THIS IS THE KEY CHANGE ---
        // We wrap the buttons in a div container inside the table cell.
        row.innerHTML += `<td><div class="action-buttons-container">${buttons}</div></td>`;
        tableBody.appendChild(row);
    });
}

// --- EVENT LISTENERS ---

// Listener for the Product Form
productForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const formData = new FormData(productForm);
    const data = Object.fromEntries(formData.entries());
    const id = data.ProductID;
    const action = id ? 'update' : 'add';
    if (!id) data.ProductID = `P${Date.now()}`;

    const result = await performAction({ action, sheetName: 'Products', id: (id || null), data });
    alert(result.message);
    if (result.result === 'success') {
        productForm.reset();
        refreshProducts();
    }
});

clearFormBtn.addEventListener('click', () => productForm.reset());

// *** NEW: SINGLE EVENT LISTENER FOR ALL TABLE BUTTONS ***
// This replaces both of the old 'productsTableBody' and 'ordersTableBody' listeners.
// Replace your existing mainContainer.addEventListener with this new block
// Replace the old mainContainer event listener in admin.js
mainContainer.addEventListener('click', async (e) => {
    const target = e.target;
    if (!target.classList.contains('action-btn')) return;

    const table = target.closest('table');
    const id = target.closest('tr').dataset.id;
    let result;

    // --- Product Actions ---
    if (table.id === 'products-table') {
        if (target.classList.contains('edit-btn')) {
            const product = (await fetchData('Products')).find(p => p.ProductID == id);
            for (const key in product) {
                if (productForm.elements[key]) productForm.elements[key].value = product[key];
            }
        } else if (target.classList.contains('delete-btn')) {
            if (!confirm(`Are you sure you want to delete product ${id}?`)) return;
            result = await performAction({ action: 'delete', sheetName: 'Products', id: id });
        }
    }
    // --- Order Actions ---
    else if (table.id === 'orders-table') {
        // --- NEW: Handle the new delete button for orders ---
        if (target.classList.contains('delete-btn')) {
            if (!confirm(`Are you sure you want to PERMANENTLY DELETE order ${id}? This cannot be undone.`)) return;
            result = await performAction({ action: 'delete', sheetName: 'Orders', id: id });
        } else {
            // This is the existing logic for status updates
            let newStatus = '';
            if (target.classList.contains('status-done-btn')) newStatus = 'Done';
            if (target.classList.contains('status-canceled-btn')) newStatus = 'Canceled';

            if (newStatus && confirm(`Are you sure you want to set order ${id} to '${newStatus}'?`)) {
                result = await performAction({ action: 'updateStatus', sheetName: 'Orders', id: id, newStatus });
            }
        }
    }

    // --- Handle Result and Refresh ---
    if (result) {
        alert(result.message);
        if (result.result === 'success') {
            if (table.id === 'products-table') refreshProducts();
            if (table.id === 'orders-table') refreshOrders();
        }
    }
});

// --- INITIAL LOAD ---
async function refreshProducts() {
    displayData(await fetchData('Products'), productsTableBody);
}
async function refreshOrders() {
    const [orders, customers] = await Promise.all([fetchData('Orders'), fetchData('Customers')]);
    if (orders.length === 0) {
        ordersTableBody.innerHTML = '<tr><td colspan="10">No orders found.</td></tr>';
        return;
    }
    const customersMap = new Map(customers.map(c => [c.CustomerID, c]));
    const joinedData = orders.map(order => ({
        OrderID: order.OrderID,
        CustomerName: (customersMap.get(order.CustomerID) || {}).Name || 'N/A',
        ProductName: order.ProductName || 'N/A',
        Quantity: order.Quantity || 'N/A',
        PhoneNumber:'0'+(customersMap.get(order.CustomerID) || {}).PhoneNumber || 'N/A',
        State: (customersMap.get(order.CustomerID) || {}).State || 'N/A',
        OrderDate: order.OrderDate,
        TotalAmount: order.TotalAmount,
        Status: order.Status,
    }));
    displayData(joinedData, ordersTableBody);
}

document.addEventListener('DOMContentLoaded', () => {
    refreshProducts();
    refreshOrders();
});