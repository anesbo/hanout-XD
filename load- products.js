// 1. PASTE YOUR WEB APP URL HERE
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzOFkA7JE4_yfOEa-43mDVZ0sjYy5kGc9-aOyPnoM4FLIRIv9Nc0aFPYDHpMLh-H9Zr/exec';

// 2. DOM Elements
const productCatalog = document.getElementById('product-catalog');
const loader = document.getElementById('loader');

// 3. Fetch and Display Products
function fetchProducts() {
    // Show the loader while fetching
    loader.style.display = 'block';
    productCatalog.innerHTML = '';

    // Fetch data from the "Products" sheet
    fetch(`${SCRIPT_URL}?sheet=Products`)
        .then(response => response.json())
        .then(data => {
            if (data.result === 'error') {
                throw new Error(data.message);
            }
            
            loader.style.display = 'none'; // Hide loader
            
            if (data.length === 0) {
                loader.textContent = "No products found. Add some to your 'Products' sheet!";
                loader.style.display = 'block';
                return;
            }

            // Loop through each product and create a card for it
            // Replace the original data.forEach loop with this one

            data.forEach(product => {
                // Create an anchor tag (link) instead of a div
                const cardLink = document.createElement('a');
                cardLink.className = 'product-card';
                
                // Set the link to go to the single product page, passing the ProductID
                // Example: single-product.html?id=P001
                cardLink.href = `./pages/single-product.html?id=${product.ProductID}`;

                // The inner content of the card remains the same
                cardLink.innerHTML = `
                    <div class="name">${product.Name}</div>
                    <div class="description">${product.Description}</div>
                    <div class="footer">
                        <div class="price">$${product.Price}</div>
                        <div class="stock">Stock: ${product.Stock}</div>
                    </div>
                `;
                productCatalog.appendChild(cardLink);
            });

        })
        .catch(error => {
            loader.textContent = `Error: ${error.message}`;
            console.error('Failed to fetch products:', error);
        });
}

// 4. Run the function when the page loads
document.addEventListener('DOMContentLoaded', fetchProducts);