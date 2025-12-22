async function loadSynonyms() {
  const res = await fetch(chrome.runtime.getURL("synonyms.json"));
  return await res.json();
}

loadSynonyms().then(synonyms => {
  document.addEventListener("input", function (e) {
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
    if (!text || typeof text !== "string") return;

    // Step 3: Safety before split()
    if (!text.includes(" ")) return; // user still typing first word

    let words = text.trim().split(/\s+/);
    if (words.length === 0) return;

    let lastWord = words[words.length - 1].toLowerCase();
    if (!synonyms[lastWord]) return;

    // Step 4: Pick synonym
    let options = synonyms[lastWord];
    let randomSyn = options[Math.floor(Math.random() * options.length)];

    // Step 5: Replace
    words[words.length - 1] = randomSyn;
    let newText = words.join(" ");

    // Step 6: Write back safely
    if (target.tagName === "INPUT" || target.tagName === "TEXTAREA") {
      target.value = newText;
    } else if (target.isContentEditable) {
      target.innerText = newText;
    }
  });
});
