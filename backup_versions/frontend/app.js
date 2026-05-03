const chatWindow = document.getElementById('chat-window');
const userInput = document.getElementById('user-input');
const sendBtn = document.getElementById('send-btn');
const testMatchaBtn = document.getElementById('test-matcha-btn');

function addMessageToChat(text, className) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${className}`;
    messageDiv.innerText = text;
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
        const response = await fetch("http://localhost:5000/chat", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                message: text
            })
        });

        const data = await response.json();

        // 1. Display the AI's text reply in the chat
        addMessageToChat(data.reply, 'bot-message');

        // 2. THE NEW MAGIC: Listen for UI commands from the AI
        if (data.system_action && data.system_action.ui_navigation === "checkout") {
            
            // For testing right now: Pop up an alert
            alert("🤖 AI COMMAND RECEIVED: Opening Checkout Page!");
            
            // FUTURE UI LOGIC: When you build your cart UI, replace the alert with your CSS changes.
            // Example:
            // document.getElementById("cart-panel").classList.add("slide-in-open");
            // document.getElementById("menu-panel").style.display = "none";
        }

    } catch (error) {
        console.error("Fetch error:", error); // Logs the exact error in your browser console
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