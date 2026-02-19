async function loadSynonyms() {
  const res = await fetch(chrome.runtime.getURL("synonyms.json"));
  return await res.json();
}

// Get current mode from storage
let currentMode = 'off';
chrome.storage.sync.get(['mode'], function(result) {
  currentMode = result.mode || 'off';
});

// Listen for mode changes
chrome.runtime.onMessage.addListener((msg, sender, sendResponse) => {
  if (msg.type === 'MODE_CHANGE') {
    currentMode = msg.mode;
  }
});

loadSynonyms().then(synonyms => {
  // Store transformed text for each input field
  const transformedTextMap = new WeakMap();
  const originalTextMap = new WeakMap();
  
  // Function to create typos (for prank mode)
  function createTypo(word) {
    if (word.length <= 2) return word;
    
    const typoTypes = [
      // Swap adjacent characters
      () => {
        const pos = Math.floor(Math.random() * (word.length - 1));
        return word.slice(0, pos) + word[pos + 1] + word[pos] + word.slice(pos + 2);
      },
      // Duplicate a character
      () => {
        const pos = Math.floor(Math.random() * word.length);
        return word.slice(0, pos) + word[pos] + word.slice(pos);
      },
      // Remove a character
      () => {
        const pos = Math.floor(Math.random() * word.length);
        return word.slice(0, pos) + word.slice(pos + 1);
      },
      // Replace with nearby keyboard key
      () => {
        const keyboard = {
          'a': 'sq', 'b': 'vn', 'c': 'xv', 'd': 'sf', 'e': 'wr', 'f': 'dg',
          'g': 'fh', 'h': 'gj', 'i': 'uo', 'j': 'hk', 'k': 'jl', 'l': 'k',
          'm': 'n', 'n': 'bm', 'o': 'ip', 'p': 'o', 'q': 'wa', 'r': 'et',
          's': 'ad', 't': 'ry', 'u': 'yi', 'v': 'cb', 'w': 'qe', 'x': 'zc',
          'y': 'tu', 'z': 'x'
        };
        const pos = Math.floor(Math.random() * word.length);
        const char = word[pos].toLowerCase();
        if (keyboard[char]) {
          const nearby = keyboard[char][Math.floor(Math.random() * keyboard[char].length)];
          return word.slice(0, pos) + nearby + word.slice(pos + 1);
        }
        return word;
      }
    ];
    
    const typoFunc = typoTypes[Math.floor(Math.random() * typoTypes.length)];
    return typoFunc();
  }
  
  // Listen to input events to build transformed text in background
  document.addEventListener("input", function (e) {
    if (currentMode === 'off') return; // Skip if mode is off
    
    const target = e.target;

    // Step 1: Get text safely
    let text = null;

    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      text = target.value ?? "";
    } 
    else if (target.isContentEditable) {
      text = target.innerText ?? "";
    } 
    else {
      return; // Not a writable element — skip
    }

    // Step 2: If there's no text, skip
    if (!text || typeof text !== "string") {
      transformedTextMap.delete(target);
      originalTextMap.delete(target);
      return;
    }

    // Store original text
    originalTextMap.set(target, text);

    // Step 3: Transform the text in background (without showing it)
    let words = text.trim().split(/\s+/);
    if (words.length === 0) {
      transformedTextMap.delete(target);
      return;
    }

    // Transform each word based on mode
    let transformedWords;
    
    if (currentMode === 'auto') {
      // Auto Rewriter Mode: Use synonyms
      transformedWords = words.map(word => {
        let lowerWord = word.toLowerCase();
        if (synonyms[lowerWord]) {
          let options = synonyms[lowerWord];
          return options[Math.floor(Math.random() * options.length)];
        }
        return word; // Keep original if no synonym
      });
    } 
    else if (currentMode === 'prank') {
      // Prank Mode: Create typos based on word count rules
      const wordCount = words.length;
      let numWordsToChange = 0;
      
      if (wordCount === 1) {
        numWordsToChange = 1; // Change the 1 word
      } else if (wordCount === 2 || wordCount === 4) {
        numWordsToChange = Math.floor(wordCount / 2); // Change 1/2 words
      } else if (wordCount === 3) {
        numWordsToChange = Math.floor(wordCount / 3); // Change 1/3 words (1 word)
      } else if (wordCount > 4) {
        numWordsToChange = Math.floor(wordCount / 5); // Change 1/5 words
      }
      
      // Randomly select which words to change
      const indicesToChange = [];
      while (indicesToChange.length < numWordsToChange) {
        const randomIndex = Math.floor(Math.random() * wordCount);
        if (!indicesToChange.includes(randomIndex)) {
          indicesToChange.push(randomIndex);
        }
      }
      
      // Apply typos to selected words
      transformedWords = words.map((word, index) => {
        if (indicesToChange.includes(index)) {
          return createTypo(word);
        }
        return word;
      });
    } else {
      transformedWords = words;
    }

    let transformedText = transformedWords.join(" ");
    
    // Store the transformed version (user still sees original)
    transformedTextMap.set(target, transformedText);
  }, true);

  // Function to replace text with transformed version
  function replaceWithTransformed(target) {
    if (currentMode === 'off') return; // Skip if mode is off
    
    const transformedText = transformedTextMap.get(target);
    
    if (transformedText) {
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
        target.value = transformedText;
        // Trigger input event so frameworks detect the change
        target.dispatchEvent(new Event('input', { bubbles: true }));
        target.dispatchEvent(new Event('change', { bubbles: true }));
      } else if (target.isContentEditable) {
        target.innerText = transformedText;
        target.dispatchEvent(new Event('input', { bubbles: true }));
      }
    }
  }

  // Listen for Enter key press (ONLY plain Enter without modifier keys)
  document.addEventListener("keydown", function (e) {
    if (currentMode === 'off') return; // Skip if mode is off
    
    // Only trigger if Enter is pressed WITHOUT Shift, Ctrl, Alt, or Meta (Cmd)
    if (e.key === "Enter" && !e.shiftKey && !e.ctrlKey && !e.altKey && !e.metaKey) {
      const target = e.target;
      
      // Check if this is a text input element
      if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
        // Replace with transformed text immediately
        replaceWithTransformed(target);
      }
    }
  }, true);

  // Listen for any click on buttons (including dynamic submit buttons)
  document.addEventListener("click", function (e) {
    if (currentMode === 'off') return; // Skip if mode is off
    
    const target = e.target;
    
    // Check if clicked element is a button or looks like a submit button
    if (
      target.tagName === "BUTTON" ||
      target.type === "submit" ||
      target.getAttribute("role") === "button" ||
      target.classList.contains("submit") ||
      target.classList.contains("send") ||
      target.closest("button")
    ) {
      // Find all input fields on the page
      const inputs = document.querySelectorAll("input, textarea, [contenteditable='true']");
      
      // Replace all fields that have transformed text
      inputs.forEach(input => {
        replaceWithTransformed(input);
      });
    }
  }, true);

  // Listen for traditional form submission
  document.addEventListener("submit", function (e) {
    if (currentMode === 'off') return; // Skip if mode is off
    
    const form = e.target;
    
    // Find all input fields in the form
    const inputs = form.querySelectorAll("input, textarea, [contenteditable='true']");
    
    // Replace with transformed text before submission
    inputs.forEach(target => {
      replaceWithTransformed(target);
    });
  }, true);

  // Observe DOM changes for dynamically added elements
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === 1) { // Element node
          // Check if the added node is an input or contains inputs
          const inputs = [];
          if (node.matches && (node.matches('input') || node.matches('textarea') || node.isContentEditable)) {
            inputs.push(node);
          }
          if (node.querySelectorAll) {
            inputs.push(...node.querySelectorAll("input, textarea, [contenteditable='true']"));
          }
          
          // The inputs are now being tracked by the input event listener
        }
      });
    });
  });

  // Start observing the document
  observer.observe(document.body, {
    childList: true,
    subtree: true
  });
});