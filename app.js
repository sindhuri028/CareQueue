const providers = [
  { id: 'northside', name: 'Northside Community Hospital', area: 'North District', address: '24 Garden Avenue · Sample location', rating: '4.8', distance: '1.2 mi', departments: ['General Medicine', 'Cardiology', 'Pediatrics', 'Orthopedics'], wait: 'Sample slots today' },
  { id: 'riverside', name: 'Riverside Medical Centre', area: 'River Quarter', address: '8 Willow Road · Sample location', rating: '4.7', distance: '2.4 mi', departments: ['General Medicine', 'Dermatology', 'ENT', 'Women’s Health'], wait: 'Sample slots tomorrow' },
  { id: 'greenpark', name: 'Greenpark City Hospital', area: 'Central District', address: '105 Park Street · Sample location', rating: '4.9', distance: '3.1 mi', departments: ['Cardiology', 'Neurology', 'Orthopedics', 'General Medicine'], wait: 'Sample slots this week' }
];
const timeSlots = ['09:00 AM', '09:45 AM', '10:30 AM', '11:15 AM', '01:30 PM', '02:15 PM', '03:00 PM'];
const results = document.querySelector('#hospital-results');
const searchInput = document.querySelector('#hospital-search');
const departmentFilter = document.querySelector('#department-filter');
const bookingWrap = document.querySelector('#booking-form-wrap');
const bookingForm = document.querySelector('#appointment-form');
const confirmation = document.querySelector('#booking-confirmation');
const departmentSelect = document.querySelector('#booking-department');
const dateInput = document.querySelector('#appointment-date');
const slotList = document.querySelector('#slot-list');
const selectedSlot = document.querySelector('#selected-slot');
let selectedProvider = null;

const allDepartments = [...new Set(providers.flatMap((provider) => provider.departments))].sort((a, b) => a.localeCompare(b));
allDepartments.forEach((department) => departmentFilter.add(new Option(department, department)));
const today = new Date();
const localToday = new Date(today.getTime() - today.getTimezoneOffset() * 60000).toISOString().slice(0, 10);
dateInput.min = localToday;
dateInput.value = localToday;

function renderProviders() {
  const query = searchInput.value.trim().toLowerCase();
  const department = departmentFilter.value;
  const matches = providers.filter((provider) => {
    const searchable = `${provider.name} ${provider.area} ${provider.address} ${provider.departments.join(' ')}`.toLowerCase();
    return searchable.includes(query) && (!department || provider.departments.includes(department));
  });
  results.replaceChildren();
  document.querySelector('#result-count').textContent = `${matches.length} sample ${matches.length === 1 ? 'provider' : 'providers'}`;
  document.querySelector('#no-results').hidden = matches.length > 0;
  matches.forEach((provider) => {
    const card = document.createElement('article');
    card.className = 'hospital-card glass-card';
    card.innerHTML = `<div class="hospital-card-top"><span class="hospital-icon" aria-hidden="true">✚</span><span class="demo-tag">SAMPLE</span></div><h4></h4><p class="hospital-location"></p><div class="hospital-meta"><span>★ ${provider.rating} <small>sample rating</small></span><span>⌖ ${provider.distance}</span></div><div class="department-tags"></div><div class="hospital-card-bottom"><span class="availability"><i></i></span><span class="availability-label"></span></div><button class="button button-primary provider-select" type="button">Choose provider <span aria-hidden="true">→</span></button>`;
    card.querySelector('h4').textContent = provider.name;
    card.querySelector('.hospital-location').textContent = `${provider.area} · ${provider.address}`;
    card.querySelector('.availability-label').textContent = provider.wait;
    const tags = card.querySelector('.department-tags');
    provider.departments.slice(0, 3).forEach((item) => {
      const tag = document.createElement('span');
      tag.textContent = item;
      tags.appendChild(tag);
    });
    if (provider.departments.length > 3) {
      const more = document.createElement('span');
      more.textContent = `+${provider.departments.length - 3}`;
      tags.appendChild(more);
    }
    card.querySelector('.provider-select').addEventListener('click', () => selectProvider(provider));
    results.appendChild(card);
  });
}

function selectProvider(provider) {
  selectedProvider = provider;
  confirmation.hidden = true;
  bookingWrap.hidden = false;
  document.querySelector('#selected-hospital-label').textContent = `${provider.name} · ${provider.area} (sample listing)`;
  departmentSelect.replaceChildren(new Option('Select a department', ''));
  provider.departments.forEach((department) => departmentSelect.add(new Option(department, department)));
  selectedSlot.value = '';
  renderSlots();
  bookingWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function renderSlots() {
  selectedSlot.value = '';
  slotList.replaceChildren();
  if (!departmentSelect.value || !dateInput.value) {
    const hint = document.createElement('p');
    hint.className = 'slot-placeholder';
    hint.textContent = 'Choose a department and date to see sample times.';
    slotList.appendChild(hint);
    return;
  }
  timeSlots.forEach((time, index) => {
    const label = document.createElement('label');
    label.className = 'time-slot';
    const radio = document.createElement('input');
    radio.type = 'radio';
    radio.name = 'appointment-time';
    radio.value = time;
    radio.required = true;
    radio.addEventListener('change', () => { selectedSlot.value = time; });
    const text = document.createElement('span');
    text.textContent = time;
    label.append(radio, text);
    if (index === 5) label.classList.add('limited-slot');
    slotList.appendChild(label);
  });
  const note = document.createElement('p');
  note.className = 'slot-disclaimer';
  note.textContent = 'Sample availability only — not connected to a provider schedule.';
  slotList.appendChild(note);
}

searchInput.addEventListener('input', renderProviders);
departmentFilter.addEventListener('change', renderProviders);
document.querySelector('#search-button').addEventListener('click', renderProviders);
departmentSelect.addEventListener('change', renderSlots);
dateInput.addEventListener('change', renderSlots);
document.querySelector('#change-provider').addEventListener('click', () => {
  bookingWrap.hidden = true;
  confirmation.hidden = true;
  selectedProvider = null;
  document.querySelector('#find-care').scrollIntoView({ behavior: 'smooth', block: 'start' });
});

bookingForm.addEventListener('submit', (event) => {
  event.preventDefault();
  if (!selectedProvider || !bookingForm.reportValidity()) return;
  if (!selectedSlot.value) {
    slotList.scrollIntoView({ behavior: 'smooth', block: 'center' });
    slotList.setAttribute('data-error', 'Choose one of the sample time slots.');
    return;
  }
  const patientName = document.querySelector('#patient-name').value.trim();
  const phone = document.querySelector('#patient-phone').value.trim();
  const token = Math.floor(100 + Math.random() * 900);
  const reference = `CQ-${Date.now().toString().slice(-6)}-${Math.random().toString(36).slice(2, 5).toUpperCase()}`;
  const date = new Date(`${dateInput.value}T12:00:00`).toLocaleDateString(undefined, { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  const maskedPhone = phone.length > 4 ? `${'•'.repeat(Math.min(phone.length - 4, 8))}${phone.slice(-4)}` : phone;
  confirmation.innerHTML = `<div class="confirmation-top"><span class="confirmation-check">✓</span><span class="demo-tag">SIMULATED CONFIRMATION</span></div><h3>Demo booking created, ${escapeHTML(patientName.split(/\s+/)[0])}.</h3><p class="confirmation-intro">This is a local preview only. The hospital has not received an appointment request.</p><div class="confirmation-details"><div><span>PROVIDER</span><strong class="confirm-provider"></strong></div><div><span>DEPARTMENT</span><strong class="confirm-department"></strong></div><div><span>DATE &amp; TIME</span><strong class="confirm-date"></strong></div><div><span>TEST CONTACT</span><strong class="confirm-phone"></strong></div><div class="token-box"><span>SIMULATED QUEUE TOKEN</span><strong class="token-number"></strong><small>Not valid at a real hospital</small></div><div><span>DEMO REFERENCE</span><strong class="confirm-reference"></strong></div></div><p class="confirmation-warning">For a real appointment, contact the provider directly. This demo does not send SMS, email, or booking data.</p><button class="button button-primary" id="new-demo-booking" type="button">Make another demo booking <span aria-hidden="true">↻</span></button>`;
  confirmation.querySelector('.confirm-provider').textContent = selectedProvider.name;
  confirmation.querySelector('.confirm-department').textContent = departmentSelect.value;
  confirmation.querySelector('.confirm-date').textContent = `${date} · ${selectedSlot.value}`;
  confirmation.querySelector('.confirm-phone').textContent = maskedPhone;
  confirmation.querySelector('.token-number').textContent = `T-${token}`;
  confirmation.querySelector('.confirm-reference').textContent = reference;
  confirmation.querySelector('#new-demo-booking').addEventListener('click', () => {
    bookingForm.reset();
    dateInput.value = localToday;
    selectedSlot.value = '';
    renderSlots();
    confirmation.hidden = true;
    bookingWrap.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
  confirmation.hidden = false;
  confirmation.scrollIntoView({ behavior: 'smooth', block: 'center' });
});

function escapeHTML(value) {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]);
}
renderProviders();

// Local-only, preset chat demo. No message is sent to a server or AI model.
const form = document.querySelector('#chat-form');
const input = document.querySelector('#chat-input');
const messages = document.querySelector('#chat-messages');
const voiceButton = document.querySelector('#voice-button');
const voiceStatus = document.querySelector('#voice-status');
const resetButton = document.querySelector('#reset-chat');
const initialAssistantMessage = 'You can ask how to use this demo or how to prepare for a care visit. What’s on your mind?';
function addMessage(text, kind) {
  const bubble = document.createElement('div');
  bubble.className = `chat-bubble ${kind}-bubble`;
  bubble.textContent = text;
  messages.appendChild(bubble);
  messages.scrollTop = messages.scrollHeight;
}
function demoReply(message) {
  const text = message.toLowerCase();
  if (/emergency|chest pain|can't breathe|cannot breathe|stroke|unconscious/.test(text)) return 'If you may be experiencing a medical emergency, call your local emergency number now. This demo cannot assess emergencies or provide urgent care.';
  if (/book|appointment|token|hospital|department|visit/.test(text)) return 'To try the sample flow, use “Find a hospital” above, choose a sample provider, then select a department, date, and time. The resulting token is simulated; no real booking is sent.';
  if (/care|clinic|find|where|provider/.test(text)) return 'Use the Find a hospital section to explore fictional sample providers and filter by department. For real care, contact a provider directly.';
  return 'Thanks for sharing. I’m a simple website demo, so I can’t give personalized medical guidance. Please contact a qualified healthcare professional for care.';
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
  }, 500);
}
form.addEventListener('submit', (event) => {
  event.preventDefault();
  const text = input.value.trim();
  if (!text) return;
  addMessage(text, 'user');
  input.value = '';
  respond(text);
});
document.querySelectorAll('.suggestion').forEach((button) => button.addEventListener('click', () => {
  input.value = button.textContent.trim();
  form.requestSubmit();
  input.focus();
}));
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
    } catch (error) { voiceStatus.textContent = 'Voice input is already listening.'; }
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
