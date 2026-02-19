// Get all mode cards
const autoMode = document.getElementById('autoMode');
const prankMode = document.getElementById('prankMode');
const offMode = document.getElementById('offMode');

const autoStatus = document.getElementById('autoStatus');
const prankStatus = document.getElementById('prankStatus');
const offStatus = document.getElementById('offStatus');

// Load current mode from storage
chrome.storage.sync.get(['mode'], function(result) {
  const currentMode = result.mode || 'off';
  updateUI(currentMode);
});

// Add click listeners
autoMode.addEventListener('click', () => setMode('auto'));
prankMode.addEventListener('click', () => setMode('prank'));
offMode.addEventListener('click', () => setMode('off'));

function setMode(mode) {
  // Save to storage
  chrome.storage.sync.set({ mode: mode }, function() {
    updateUI(mode);
    
    // Send message to content script to update mode
    chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, {
          type: 'MODE_CHANGE',
          mode: mode
        });
      }
    });
  });
}

function updateUI(mode) {
  // Remove all active classes
  autoMode.classList.remove('active');
  prankMode.classList.remove('active');
  offMode.classList.remove('active');

  // Update status texts
  autoStatus.querySelector('.status-text').textContent = 'Inactive';
  prankStatus.querySelector('.status-text').textContent = 'Inactive';
  offStatus.querySelector('.status-text').textContent = 'Inactive';

  // Set active mode
  if (mode === 'auto') {
    autoMode.classList.add('active');
    autoStatus.querySelector('.status-text').textContent = 'Active';
  } else if (mode === 'prank') {
    prankMode.classList.add('active');
    prankStatus.querySelector('.status-text').textContent = 'Active';
  } else {
    offMode.classList.add('active');
    offStatus.querySelector('.status-text').textContent = 'Active';
  }
}