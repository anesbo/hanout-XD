// --- CONFIGURATION ---
const SCRIPT_URL = "https://script.google.com/macros/s/AKfycbxZG0up3qVKhg5gvZkWC19rs8V8C3A0O57j9N-JJyOG7S3BQK-NoVfdbS2y0mb1NAT17A/exec";
const API_KEY = "anes:)";
// --------------------

async function performAction(action, sheetName, data) {
    const payload = { apiKey: API_KEY, action, sheetName, data };
    const res = await fetch(SCRIPT_URL, {
        method: 'POST',
        body: JSON.stringify(payload)
    });
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    return await res.json();
}

document.addEventListener('DOMContentLoaded', () => {

    // --- DOM Elements ---
    const productDetailsContainer = document.getElementById('product-details');
    const loader = document.getElementById('loader');

    const orderForm = document.getElementById('order-form');
    const hiddenProductIdInput = document.getElementById('form-product-id');
    const quantityInput = document.getElementById('quantity');
    const stateSelect = document.getElementById('State');
    const subtotalPriceEl = document.getElementById('subtotal-price');
    const deliveryPriceEl = document.querySelector('#price-summary .price-line:nth-child(2) span:last-child');
    const totalPriceEl = document.getElementById('total-price');
    // -------------------

    const urlParams = new URLSearchParams(window.location.search);
    const productId = urlParams.get('id');
    let currentProduct = null;
    let deliveryPricesMap = new Map();
    let calculatedTotalPrice = 0;

    // --- Price Calculation ---
    function updatePrice() {
        if (!currentProduct) return;
        const quantity = parseInt(quantityInput.value) || 1;
        const selectedState = stateSelect.value;
        
        const subtotal = quantity * parseFloat(currentProduct.Price);
        const deliveryPrice = parseFloat(deliveryPricesMap.get(selectedState)) || 0;
        calculatedTotalPrice = subtotal + deliveryPrice;

        subtotalPriceEl.textContent = `${subtotal.toFixed(2)} DZD`;
        deliveryPriceEl.textContent = deliveryPrice > 0 ? `${deliveryPrice.toFixed(2)} DZD` : 'Select a state';
        totalPriceEl.textContent = `${calculatedTotalPrice.toFixed(2)} DZD`;
    }

    // --- Data Fetching ---
    async function initializePage() {
        if (!productId) {
            loader.textContent = 'Error: Product ID is missing.';
            return;
        }
        loader.style.display = 'block';

        try {
            // Fetch both product details and delivery prices at the same time
            const [productData, deliveryData] = await Promise.all([
                fetch(`${SCRIPT_URL}?sheet=Products&id=${productId}`).then(res => res.json()),
                fetch(`${SCRIPT_URL}?sheet=DeliveryPrices`).then(res => res.json())
            ]);

            if (productData.result === 'error') throw new Error(productData.message);
            if (deliveryData.result === 'error') throw new Error(deliveryData.message);
            
            // Store product and delivery prices
            currentProduct = productData;
            deliveryPricesMap = new Map(deliveryData.map(item => [item.State, item.Price]));

            // Update page content
            loader.style.display = 'none';
            document.title = currentProduct.Name;
            productDetailsContainer.innerHTML = `
                <h1 class="name">${currentProduct.Name}</h1>
                <p class="description">${currentProduct.Description}</p>
                <div class="details-footer">
                    <div class="price">$${currentProduct.Price}</div>
                    <div class="stock">Stock: ${currentProduct.Stock}</div>
                </div>
            `;
            hiddenProductIdInput.value = currentProduct.ProductID;
            quantityInput.max = currentProduct.Stock;
            updatePrice(); // Calculate initial price

        } catch (error) {
            loader.textContent = `Error: ${error.message}`;
        }
    }

    // --- Event Listeners ---
    quantityInput.addEventListener('input', updatePrice);
    stateSelect.addEventListener('change', updatePrice); // Update price when state changes

    orderForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const submitBtn = document.getElementById('submit-order-btn');
        if (!stateSelect.value) {
            alert('Please select a state for delivery.');
            return;
        }

        submitBtn.disabled = true;
        submitBtn.textContent = 'Processing...';

        try {
            const customerFormData = new FormData(orderForm);
            const customerData = Object.fromEntries(customerFormData.entries());
            customerData.CustomerID = `C${Date.now()}`;

            await performAction('add', 'Customers', customerData);

            const orderData = {
                OrderID: `O${Date.now()}`,
                CustomerID: customerData.CustomerID,
                ProductName: currentProduct.Name, // Add this line
                Quantity: customerData.Quantity, // Add this line
                OrderDate: new Date().toLocaleDateString('en-CA'),
                TotalAmount: calculatedTotalPrice.toFixed(2),
                Status: 'Pending'
            };
            await performAction('add', 'Orders', orderData);

            const updatedProductData = { ...currentProduct };
            updatedProductData.Stock = parseInt(currentProduct.Stock) - parseInt(customerData.Quantity);
            await performAction('update', 'Products', updatedProductData);
            
            document.getElementById('confirm-purchase').innerHTML = `
                <h2>✅ Order Placed Successfully!</h2>
                <p>Thank you for your purchase.we will call you to confirm the order</p>
            `;
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order';
        } catch (error) {
            alert(`An error occurred: ${error.message}`);
            submitBtn.disabled = false;
            submitBtn.textContent = 'Place Order';
        }
    });

    // --- Initial Load ---
    initializePage();
});