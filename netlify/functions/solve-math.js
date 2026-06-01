const https = require('https');

// বিল্ট-ইন https মডিউল দিয়ে ফেচ করার ফাংশন
const nativeFetch = (url, options) => {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const reqOptions = {
      method: options.method || 'GET',
      headers: options.headers || {},
      hostname: urlObj.hostname,
      path: urlObj.pathname + urlObj.search,
      port: 443
    };

    const req = https.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          ok: res.statusCode >= 200 && res.statusCode < 300,
          json: () => Promise.resolve(JSON.parse(data))
        });
      });
    });

    req.on('error', (e) => reject(e));
    if (options.body) req.write(options.body);
    req.end();
  });
};

// ৩.৫ সেকেন্ডের টাইমআউট রেকার
const fetchWithTimeout = (url, options, timeout = 3500) => {
  return Promise.race([
    nativeFetch(url, options),
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

    // এখানে আপনার ১২টি Gemini Key ডাইনামিকালি লোড হবে
    const apis = [];
    
    for (let i = 1; i <= 12; i++) {
      const key = process.env[`GEMINI_API_KEY_${i}`];
      if (key) {
        apis.push({
          name: `Gemini-${i}`,
          type: "Gemini",
          key: key,
          url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key="
        });
      }
    }

    // আগের বাকি API গুলো নিচে যুক্ত করে দেওয়া হলো
    apis.push(
      { name: "Mistral", type: "Mistral", key: process.env.MISTRAL_API_KEY, url: "https://api.mistral.ai/v1/chat/completions" },
      { name: "OpenRouter", type: "OpenRouter", key: process.env.OPENROUTER_API_KEY, url: "https://api.openrouter.ai/v1/chat/completions" },
      { name: "Cohere", type: "Cohere", key: process.env.COHERE_API_KEY, url: "https://api.cohere.com/v1/chat" }
    );

    for (const api of apis) {
      if (!api.key) continue;
      try {
        let res, data, solution;
        
        if (api.type === "Gemini") {
          const parts = image ? [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: userPrompt }] : [{ text: userPrompt }];
          res = await fetchWithTimeout(api.url + api.key, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }) });
          data = await res.json();
          solution = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } 
        else if (api.type === "Mistral") {
          const content = image ? [{ type: "text", text: userPrompt }, { type: "image_url", image_url: `data:image/jpeg;base64,${image}` }] : [{ type: "text", text: userPrompt }];
          res = await fetchWithTimeout(api.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${api.key}` },
            body: JSON.stringify({ model: "pixtral-12b-2409", messages: [{ role: "user", content }] })
          });
          data = await res.json();
          solution = data.choices?.[0]?.message?.content;
        } 
        else if (api.type === "OpenRouter") {
          const content = image ? [{ type: "text", text: userPrompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }] : [{ type: "text", text: userPrompt }];
          res = await fetchWithTimeout(api.url, {
            method: "POST",
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${api.key}` },
            body: JSON.stringify({ model: "meta-llama/llama-3.2-11b-vision-instruct:free", messages: [{ role: "user", content }] })
          });
          data = await res.json();
          solution = data.choices?.[0]?.message?.content;
        }
        else if (api.type === "Cohere") {
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
        console.error(`${api.name} error:`, e.message); 
      }
    }
    
    return { statusCode: 500, headers, body: JSON.stringify({ error: "সবগুলো ফ্রি এআই বর্তমানে ব্যস্ত বা টাইমআউট হয়েছে।" }) };
  } catch (error) { return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }; }
};
