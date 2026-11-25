const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-input');
const messages = document.querySelector('#chat-messages');
const voiceButton = document.querySelector('#voice-button');
const voiceStatus = document.querySelector('#voice-status');
const resetButton = document.querySelector('#reset-chat');

const initialAssistantMessage = 'You can ask about preparing for an appointment, finding the right type of care, or general wellbeing information. What’s on your mind?';

function addMessage(text, kind) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${kind}-bubble`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
  return bubble;
}

function demoReply(message) {
  const text = message.toLowerCase();
  if (/appointment|doctor|visit|checkup/.test(text)) {
    return 'A little preparation can help. You might note when this started, what you’ve noticed, and any questions you want to ask. For advice about your situation, please contact a qualified healthcare professional.';
  }
  if (/emergency|chest pain|can't breathe|cannot breathe|stroke|unconscious/.test(text)) {
    return 'If you may be experiencing a medical emergency, call your local emergency number now. This demo cannot assess emergencies or provide urgent care.';
  }
  if (/care|clinic|find|where|provider/.test(text)) {
    return 'A primary care clinician is often a good starting point for non-urgent concerns. You can contact your local clinic or health service to ask about available care. If symptoms are severe or worsening, seek prompt professional help.';
  }
  if (/feel|symptom|hurt|pain|sick|wellbeing|health/.test(text)) {
    return 'I’m sorry you’re dealing with that. I can’t diagnose symptoms, but you could write down what you’re experiencing and when it began, then discuss it with a healthcare professional. If it feels urgent or gets worse, seek medical care promptly.';
  }
  return 'Thanks for sharing. I’m a simple website demo, so I can’t give personalized medical guidance. I can help you prepare questions for a healthcare professional or think about how to find care.';
}

function respond(text) {
  const typing = document.createElement('div');
  typing.className = 'chat-bubble assistant-bubble typing';
  typing.setAttribute('aria-label', 'CareQueue is preparing a demo reply');
  typing.innerHTML = '<i></i><i></i><i></i>';
  messages.appendChild(typing);
  messages.scrollTop = messages.scrollHeight;
  window.setTimeout(() => {
    typing.remove();
    const reply = demoReply(text);
    addMessage(reply, 'assistant');
    if ('speechSynthesis' in window && voiceStatus.dataset.speak === 'true') {
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(new SpeechSynthesisUtterance(reply));
      voiceStatus.dataset.speak = 'false';
    }
  }, 650);
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  input.value = '';
  respond(text);
});

document.querySelectorAll('.suggestion').forEach((button) => {
  button.addEventListener('click', () => {
    input.value = button.textContent.trim();
    form.requestSubmit();
    input.focus();
  });
});

resetButton.addEventListener('click', () => {
  messages.innerHTML = '<div class="chat-welcome"><span class="welcome-sparkle">✳</span><h3>Hi, I’m here to help.</h3><p>What would you like to talk through?</p></div>';
  addMessage(initialAssistantMessage, 'assistant');
  voiceStatus.textContent = 'Demo only · Not medical advice';
  voiceStatus.classList.remove('error');
  if ('speechSynthesis' in window) window.speechSynthesis.cancel();
});

const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
if (SpeechRecognition) {
  const recognition = new SpeechRecognition();
  recognition.lang = navigator.language || 'en-US';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  voiceButton.addEventListener('click', () => {
    try {
      voiceStatus.classList.remove('error');
      voiceStatus.textContent = 'Listening… speak your question';
      voiceStatus.dataset.speak = 'true';
      voiceButton.classList.add('listening');
      recognition.start();
    } catch (error) {
      voiceStatus.textContent = 'Voice input is already listening.';
    }
  });
  recognition.addEventListener('result', (event) => {
    input.value = event.results[0][0].transcript;
    form.requestSubmit();
  });
  recognition.addEventListener('end', () => {
    voiceButton.classList.remove('listening');
    if (voiceStatus.textContent.startsWith('Listening')) voiceStatus.textContent = 'Demo only · Not medical advice';
  });
  recognition.addEventListener('error', () => {
    voiceButton.classList.remove('listening');
    voiceStatus.textContent = 'Could not access voice input. Check your browser microphone permission.';
    voiceStatus.classList.add('error');
  });
} else {
  voiceButton.addEventListener('click', () => {
    voiceStatus.textContent = 'Voice input is not supported in this browser. Try a recent version of Chrome.';
    voiceStatus.classList.add('error');
  });
}
