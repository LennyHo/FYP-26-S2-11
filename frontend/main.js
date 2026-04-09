// Dialogflow CX integration placeholder
console.log('Dialogflow CX frontend loaded');

// This function will be used to send user messages to Dialogflow CX and handle responses
function sendMessageToDialogflowCX(message) {
	// TODO: Integrate with backend API that connects to Dialogflow CX
	// Example:
	// fetch('/api/dialogflow', { method: 'POST', body: JSON.stringify({ message }) })
	//   .then(res => res.json())
	//   .then(data => displayBotResponse(data.response));
	console.log('Message to Dialogflow CX:', message);
}

// Example: Hook up the input form for future integration
document.addEventListener('DOMContentLoaded', () => {
	const form = document.querySelector('.chat-ui-input-row');
	const input = form?.querySelector('input');
	if (form && input) {
		form.addEventListener('submit', (e) => {
			e.preventDefault();
			const msg = input.value.trim();
			if (msg) {
				sendMessageToDialogflowCX(msg);
				input.value = '';
			}
		});
	}

	// Customer Support Chatbot Widget Logic
	const collapsed = document.getElementById('support-chatbot-collapsed');
	const expanded = document.getElementById('support-chatbot-expanded');
	const closeBtn = document.getElementById('support-chatbot-close');
	const supportForm = document.querySelector('.support-chatbot-input-row');
	const supportInput = supportForm?.querySelector('input');
	const supportMessages = document.querySelector('.support-chatbot-messages');

	if (collapsed && expanded) {
		collapsed.addEventListener('click', () => {
			collapsed.style.display = 'none';
			expanded.style.display = 'flex';
		});
	}
	if (closeBtn && collapsed && expanded) {
		closeBtn.addEventListener('click', () => {
			expanded.style.display = 'none';
			collapsed.style.display = 'flex';
		});
	}

	// Basic message sending UI for support chatbot
	if (supportForm && supportInput && supportMessages) {
		supportForm.addEventListener('submit', (e) => {
			e.preventDefault();
			const msg = supportInput.value.trim();
			if (msg) {
				// Display user message
				const userMsg = document.createElement('div');
				userMsg.textContent = msg;
				userMsg.style.margin = '8px 0';
				userMsg.style.textAlign = 'right';
				userMsg.style.color = '#7c3aed';
				supportMessages.appendChild(userMsg);
				supportInput.value = '';
				supportMessages.scrollTop = supportMessages.scrollHeight;
				// Simulate bot reply (placeholder)
				setTimeout(() => {
					const botMsg = document.createElement('div');
					botMsg.textContent = 'Thank you for reaching out! How can I assist you further?';
					botMsg.style.margin = '8px 0';
					botMsg.style.textAlign = 'left';
					botMsg.style.color = '#444';
					supportMessages.appendChild(botMsg);
					supportMessages.scrollTop = supportMessages.scrollHeight;
				}, 700);
			}
		});
	}
});