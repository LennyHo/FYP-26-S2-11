const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const testMatchaBtn = document.getElementById('test-matcha-btn');

function addMessageToChat(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    
    // THE CRITICAL FIX: Changed from innerText to innerHTML
    // This allows the <br> and <button> tags to render properly!
    messageDiv.innerHTML = text; 
    
    chatWindow.appendChild(messageDiv);
    chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function sendMessage() {
    const text = userInput.value.trim();
    if (text === '') return;

    // show user message
    addMessageToChat(text, 'user-message');

    userInput.value = '';

    try {
        const response = await fetch("http://localhost:3000/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text
            })
        });

        const data = await response.json();

        // Display the AI's reply in the chat
        addMessageToChat(data.reply, 'bot-message');

        // Listen for UI commands from the AI (if you still use this hidden logic)
        if (data.system_action && data.system_action.ui_navigation === "checkout") {
            alert("🤖 AI COMMAND RECEIVED: Opening Checkout Page!");
        }

    } catch (error) {
        console.error("Fetch error:", error); 
        addMessageToChat("Error connecting to server. Is the Node.js server running?", 'bot-message');
    }
}

sendBtn.addEventListener('click', sendMessage);

if (testMatchaBtn) {
    testMatchaBtn.addEventListener('click', () => {
        userInput.value = 'I want Matcha Drip with 25% sugar';
        userInput.focus();
    });
}

userInput.addEventListener('keypress', function(e) {
    if (e.key === 'Enter') {
        e.preventDefault(); 
        sendMessage();
    }
});

// ==========================================
// SINGLE PAGE APP (SPA) NAVIGATION LOGIC
// ==========================================

function openCart() {
    const menuView = document.getElementById('menu-view');
    const cartView = document.getElementById('cart-view');
    const cartItemsContainer = document.getElementById('cart-page-items');
    
    // 1. Hide the Menu and Show the Cart
    menuView.style.display = 'none';
    cartView.style.display = 'block';

    // 2. Parse the AI's hidden data
    const hiddenDataBlocks = document.querySelectorAll('.hidden-cart-data');
    
    if (hiddenDataBlocks.length > 0) {
        const latestCartData = hiddenDataBlocks[hiddenDataBlocks.length - 1].innerText.trim();
        let calculatedTotal = 0;
        
        // Clear the cart UI
        cartItemsContainer.innerHTML = ""; 
        
        const drinks = latestCartData.split('\n');
        
        drinks.forEach(drinkLine => {
            const parts = drinkLine.split('|');
            
            // Notice this is now checking for 4 parts instead of 3!
            if (parts.length === 4) { 
                const name = parts[0].trim();
                const details = parts[1].trim();
                const priceString = parts[2].replace(/[^0-9.]/g, '');
                const price = parseFloat(priceString);
                const imageSrc = parts[3].trim(); // <--- GRAB THE IMAGE PATH
                
                if (!isNaN(price)) {
                    calculatedTotal += price;
                    
                    // Inject the HTML for this drink, including the new <img> tag!
                    cartItemsContainer.innerHTML += `
                        <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid var(--border); padding: 20px 0;">
                            <div style="display: flex; align-items: center; gap: 15px;">
                                <!-- THE IMAGE IS RENDERED HERE -->
                                <img src="${imageSrc}" alt="${name}" style="width: 70px; height: 70px; object-fit: cover; border-radius: 12px; background-color: var(--card);">
                                
                                <div>
                                    <h3 style="margin-bottom: 5px; color: var(--foreground);">${name}</h3>
                                    <p style="font-size: 14px; color: var(--muted);">${details}</p>
                                </div>
                            </div>
                            <div style="font-size: 20px; font-weight: bold; color: var(--color-secondary);">S$ ${price.toFixed(2)}</div>
                        </div>
                    `;
                }
            }
        });

        // Update Total
        document.getElementById("cart-page-total").innerText = `Total: S$ ${calculatedTotal.toFixed(2)}`;
        
        // Save total to localStorage just in case they go to checkout
        localStorage.setItem("dripTeaCartTotal", calculatedTotal.toFixed(2));
    } else {
        cartItemsContainer.innerHTML = "<p style='padding: 20px 0;'>Your cart is currently empty.</p>";
        document.getElementById("cart-page-total").innerText = `Total: S$ 0.00`;
    }
}

function closeCart() {
    // Hide the Cart and Show the Menu
    document.getElementById('cart-view').style.display = 'none';
    document.getElementById('menu-view').style.display = 'block';
}

function goToCheckoutPageFromCart() {
    // This assumes you still have a separate checkout.html page for the final payment screen
    window.location.href = "checkout.html";
}

function goToCheckoutPage(totalPrice) {
    // Called directly by the AI chatbot button
    if (totalPrice) {
        localStorage.setItem("dripTeaCartTotal", totalPrice);
    }
    window.location.href = "checkout.html"; 
}