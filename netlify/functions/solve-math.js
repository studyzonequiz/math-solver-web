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

    // ৪টি কনফার্ম কাজ করা এআই সার্ভিস
    const apis = [
      { name: "Gemini", key: process.env.GEMINI_API_KEY, url: "https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=" },
      { name: "OpenRouter", key: process.env.OPENROUTER_API_KEY, url: "https://openrouter.ai/api/v1/chat/completions" },
      { name: "Together", key: process.env.TOGETHER_API_KEY, url: "https://api.together.xyz/v1/chat/completions" },
      { name: "DeepInfra", key: process.env.DEEPINFRA_API_KEY, url: "https://api.deepinfra.com/v1/openai/chat/completions" }
    ];

    for (const api of apis) {
      if (!api.key) continue;
      try {
        let res, data, solution;
        
        if (api.name === "Gemini") {
          const parts = image ? [{ inlineData: { mimeType: "image/jpeg", data: image } }, { text: userPrompt }] : [{ text: userPrompt }];
          res = await fetch(api.url + api.key, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ contents: [{ parts }] }) });
          data = await res.json();
          solution = data.candidates?.[0]?.content?.parts?.[0]?.text;
        } else {
          const content = image ? [{ type: "text", text: userPrompt }, { type: "image_url", image_url: { url: `data:image/jpeg;base64,${image}` } }] : [{ type: "text", text: userPrompt }];
          res = await fetch(api.url, { 
            method: "POST", 
            headers: { "Content-Type": "application/json", "Authorization": `Bearer ${api.key}` }, 
            body: JSON.stringify({ 
              model: api.name === "OpenRouter" ? "meta-llama/llama-3.2-11b-vision-instruct:free" : "meta-llama/Llama-3.2-11B-Vision-Instruct", 
              messages: [{ role: "user", content }] 
            }) 
          });
          data = await res.json();
          solution = data.choices?.[0]?.message?.content;
        }

        if (res.ok && solution) {
          return { statusCode: 200, headers, body: JSON.stringify({ solution: `[${api.name} Active]\n\n${solution}` }) };
        }
      } catch (e) { console.error(`${api.name} error:`, e.message); }
    }
    
    return { statusCode: 500, headers, body: JSON.stringify({ error: "সবগুলো এআই বর্তমানে রেসপন্স দিচ্ছে না। দয়া করে আবার চেষ্টা করুন।" }) };
  } catch (error) { return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) }; }
};
