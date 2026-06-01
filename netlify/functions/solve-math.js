exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body);
    const base64Image = body.image;
    const userPrompt = body.prompt || "Solve this academic doubt step by step.";

    // ==========================================
    // ১ নম্বর অপশন: Google Gemini 2.5 Flash (Primary AI)
    // ==========================================
    try {
      const geminiApiKey = process.env.GEMINI_API_KEY;
      if (geminiApiKey) {
        console.log("Trying Gemini AI...");
        const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${geminiApiKey}`;
        const parts = [];
        if (base64Image) {
          parts.push({ inlineData: { mimeType: "image/jpeg", data: base64Image } });
        }
        parts.push({ text: userPrompt });

        const res = await fetch(geminiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ contents: [{ parts: parts }] })
        });

        if (res.ok) {
          const data = await res.json();
          const solution = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (solution) {
            return { statusCode: 200, headers, body: JSON.stringify({ solution: "[Gemini Active]\n\n" + solution }) };
          }
        }
      }
      console.log("Gemini failed or quota exceeded. Switching to Backup 1 (OpenAI)...");
    } catch (e) {
      console.error("Gemini Error:", e.message);
    }

    // ==========================================
    // ২ নম্বর অপশন: OpenAI GPT-4o-mini (Backup AI 1)
    // বিশেষ করে কম্পিউটার সায়েন্স এবং কোডিংয়ের জন্য দুর্দান্ত
    // ==========================================
    try {
      const openaiApiKey = process.env.OPENAI_API_KEY;
      if (openaiApiKey) {
        console.log("Trying OpenAI GPT-4o-mini...");
        const openaiUrl = "https://api.openai.com/v1/chat/completions";
        const contentParts = [{ type: "text", text: userPrompt }];
        
        if (base64Image) {
          contentParts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
        }

        const res = await fetch(openaiUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${openaiApiKey}`
          },
          body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [{ role: "user", content: contentParts }],
            max_tokens: 1500
          })
        });

        if (res.ok) {
          const data = await res.json();
          const solution = data.choices?.[0]?.message?.content;
          if (solution) {
            return { statusCode: 200, headers, body: JSON.stringify({ solution: "[OpenAI Active]\n\n" + solution }) };
          }
        }
      }
      console.log("OpenAI failed. Switching to Backup 2 (Anthropic Claude)...");
    } catch (e) {
      console.error("OpenAI Error:", e.message);
    }

    // ==========================================
    // ৩ নম্বর অপশন: Anthropic Claude 3.5 Sonnet (Backup AI 2)
    // ফিজিক্স এবং জটিল কেমিস্ট্রি সমীকরণের জন্য বিশ্বের সেরা এআই
    // ==========================================
    try {
      const claudeApiKey = process.env.CLAUDE_API_KEY;
      if (claudeApiKey) {
        console.log("Trying Anthropic Claude...");
        const claudeUrl = "https://api.anthropic.com/v1/messages";
        
        const contentParts = [];
        if (base64Image) {
          contentParts.push({
            type: "image",
            source: { type: "base64", media_type: "image/jpeg", data: base64Image }
          });
        }
        contentParts.push({ type: "text", text: userPrompt });

        const res = await fetch(claudeUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "x-api-key": claudeApiKey,
            "anthropic-version": "2023-06-01"
          },
          body: JSON.stringify({
            model: "claude-3-5-sonnet-20241022",
            max_tokens: 1500,
            messages: [{ role: "user", content: contentParts }]
          })
        });

        if (res.ok) {
          const data = await res.json();
          const solution = data.content?.[0]?.text;
          if (solution) {
            return { statusCode: 200, headers, body: JSON.stringify({ solution: "[Claude Active]\n\n" + solution }) };
          }
        }
      }
    } catch (e) {
      console.error("Claude Error:", e.message);
    }

    // যদি কোনো এআই কাজ না করে বা সবার লিমিট শেষ হয়ে যায়
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "সবগুলো এআই সিস্টেম বর্তমানে লিমিট পার করেছে বা ব্যস্ত আছে। ২ মিনিট পর আবার চেষ্টা করুন।" })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
