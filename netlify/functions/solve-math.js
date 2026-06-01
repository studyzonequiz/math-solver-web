const fetch = require('node-fetch');

// নির্দিষ্ট সময়ের মধ্যে রেসপন্স না এলে রিকোয়েস্ট ক্যানসেল বা অন্য এআই-তে যাওয়ার ট্র্যাকার
const fetchWithTimeout = (url, options, timeout = 3500) => {
  return Promise.race([
    fetch(url, options),
    new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), timeout))
  ]);
};

exports.handler = async (event, context) => {
  const headers = { 
    "Access-Control-Allow-Origin": "*", 
    "Access-Control-Allow-Headers": "Content-Type", 
    "Access-Control-Allow-Methods": "POST, OPTIONS" 
  };
  
  if (event.httpMethod === "OPTIONS") return { statusCode: 200, headers, body: "" };

  try {
    const { image, prompt } = JSON.parse(event.body);
    const userPrompt = prompt || "Solve this academic doubt step by step.";

    // OpenAI বাদ দিয়ে বাকি ৪টি এআই চেইন (১০০% কাজ করবে)
    const apis = [
      { name: "Gemini", key: process.env.GEMINI_API_KEY, url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" },
      { name: "Mistral", key: process.env.MISTRAL_API_KEY, url: "https://api.mistral.ai/v1/chat/completions" },
      { name: "OpenRouter", key: process.env.OPENROUTER_API_KEY, url: "https://api.openrouter.ai/v1/chat/completions" },
      { name: "Cohere", key: process.env.COHERE_API_KEY, url: "https://api.cohere.com/v1/chat" }
    ];

    for (const api of apis) {
      if (!api.key) continue;
      try {
        console.log(`Executing ${api.name} fallback router...`);
        let res, data, solution;
        
        // ১. Gemini প্রসেস লজিক
        if (api.name === "Gemini") {
          const parts = image ? [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: userPrompt }] : [{ text: userPrompt }];
          res = await fetchWithTimeout(api.url + api.key, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }) });
          data = await res.json();
          solution = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } 
        // ২. Mistral প্রসেস লজিক
        else if (api.name === "Mistral") {
          const content = image ? [{ type: "text", text: userPrompt }, { type: "image_url", image_url: `data:image/jpeg;base64,${image}` }] : [{ type: "text", text: userPrompt }];
          res = await fetchWithTimeout(api.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${api.key}` },
            body: JSON.stringify({ model: "pixtral-12b-2409", messages: [{ role: "user", content }] })
          });
          data = await res.json();
          solution = data.choices?.[0]?.message?.content;
        } 
        // ৩. OpenRouter প্রসেস লজিক
        else if (api.name === "OpenRouter") {
          const content = image ? [{ type: "text", text: userPrompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }] : [{ type: "text", text: userPrompt }];
          res = await fetchWithTimeout(api.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${api.key}` },
            body: JSON.stringify({ model: "meta-llama/llama-3.2-11b-vision-instruct:free", messages: [{ role: "user", content }] })
          });
          data = await res.json();
          solution = data.choices?.[0]?.message?.content;
        }
        // ৪. Cohere প্রসেস লজিক
        else if (api.name === "Cohere") {
          res = await fetchWithTimeout(api.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${api.key}` },
            body: JSON.stringify({ model: "command-r-plus", message: userPrompt })
          });
          data = await res.json();
          solution = data.text;
        }

        if (res && res.ok && solution) {
          return { statusCode: 200, headers, body: JSON.stringify({ solution: `[${api.name} Active]\n\n${solution}` }) };
        }
      } catch (e) { 
        console.error(`${api.name} error or timeout:`, e.message);
        // টাইমআউট বা ইনভ্যালিড কি হলে লুপ থামবে না, পরের এআই ট্রাই করবে।
      }
    }
    
    return { statusCode: 500, headers, body: JSON.stringify({ error: "সবগুলো ফ্রি এআই বর্তমানে ব্যস্ত বা টাইমআউট হয়েছে। অনুগ্রহ করে আরেকবার চেষ্টা করুন।" }) };
  } catch (error) { return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }; }
};
