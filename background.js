chrome.runtime.onMessage.addListener(async (msg, sender, sendResponse) => {
  if (msg.type === "AI_SYNONYMS") {
    const word = msg.word;

    try {
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": "Bearer YOUR_API_KEY"
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: "Return ONLY synonyms separated by commas." },
            { role: "user", content: `Give 5 synonyms for: ${word}` }
          ]
        })
      });

      const data = await response.json();
      const text = data.choices[0].message.content;
      const list = text.split(",").map(x => x.trim());

      sendResponse({ synonyms: list });
    }
    catch (err) {
      sendResponse({ error: true });
    }

    return true; // required for async sendResponse
  }
});
