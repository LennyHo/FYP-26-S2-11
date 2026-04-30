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

// Function triggered by the AI's chat button for the cart
function openCart() {
    const cartModal = document.getElementById("cartModal");
    if (cartModal) {
        cartModal.style.display = "flex";
    } else {
        alert("Cart Modal HTML is missing from this page!");
    }
}

// Function to close the cart
function closeCart() {
    document.getElementById("cartModal").style.display = "none";
}

// THE NEW MAGIC: Dynamic Checkout without a database!
// The AI will pass the total price directly into this function!
function goToCheckoutPage(totalPrice) {
    if (totalPrice) {
        // Save the dynamic total price to the browser's local memory
        localStorage.setItem("dripTeaCartTotal", totalPrice);
    }
    
    // Redirect to the checkout page
    window.location.href = "checkout.html"; 
}