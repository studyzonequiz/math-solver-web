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
    // ১ নম্বর অপশন: Google Gemini 2.5 Flash (সম্পূর্ণ ফ্রি)
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
      console.log("Gemini failed or quota hit. Switching to Backup 1 (Groq Cloud)...");
    } catch (e) {
      console.error("Gemini Error:", e.message);
    }

    // ==========================================
    // ২ নম্বর অপশন (FREE BACKUP 1): Groq Cloud (Llama 3)
    // এটি ফিজিক্স, কেমিস্ট্রি ও কম্পিউটার সায়েন্সের জটিল থিওরি ও কোডিংয়ের জন্য ওস্তাদ এবং সম্পূর্ণ ফ্রি!
    // ==========================================
    try {
      const groqApiKey = process.env.GROQ_API_KEY; // একদম ফ্রি কী
      if (groqApiKey) {
        console.log("Trying Groq Llama-3...");
        const groqUrl = "https://api.groq.com/openai/v1/chat/completions";
        
        const contentParts = [{ type: "text", text: userPrompt }];
        if (base64Image) {
          // দ্রষ্টব্য: Groq-এর কিছু ফ্রি মডেল ডিরেক্ট ইমেজ সাপোর্ট না করলে টেক্সট প্রম্পট প্রসেস করবে
          contentParts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
        }

        const res = await fetch(groqUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${groqApiKey}`
          },
          body: JSON.stringify({
            model: "llama-3.2-11b-vision-preview", // ইমেজ ও টেক্সট হ্যান্ডেল করার ফ্রি ভিশন মডেল
            messages: [{ role: "user", content: contentParts }],
            max_tokens: 1500
          })
        });

        if (res.ok) {
          const data = await res.json();
          const solution = data.choices?.[0]?.message?.content;
          if (solution) {
            return { statusCode: 200, headers, body: JSON.stringify({ solution: "[Groq Llama-3 Active]\n\n" + solution }) };
          }
        }
      }
      console.log("Groq failed. Switching to Backup 2 (Together AI)...");
    } catch (e) {
      console.error("Groq Error:", e.message);
    }

    // ==========================================
    // ৩ নম্বর অপশন (FREE BACKUP 2): Together AI (Mixtral)
    // এটি ম্যাথ এবং সায়েন্সের জন্য অত্যন্ত শক্তিশালী এবং ডেভলপারদের ফ্রি ক্রেডিট দেয়
    // ==========================================
    try {
      const togetherApiKey = process.env.TOGETHER_API_KEY; // একদম ফ্রি কী
      if (togetherApiKey) {
        console.log("Trying Together AI...");
        const togetherUrl = "https://api.together.xyz/v1/chat/completions";
        
        const contentParts = [{ type: "text", text: userPrompt }];
        if (base64Image) {
          contentParts.push({ type: "image_url", image_url: { url: `data:image/jpeg;base64,${base64Image}` } });
        }

        const res = await fetch(togetherUrl, {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${togetherApiKey}`
          },
          body: JSON.stringify({
            model: "meta/Llama-3-2-11B-Vision-Instruct",
            messages: [{ role: "user", content: contentParts }],
            max_tokens: 1500
          })
        });

        if (res.ok) {
          const data = await res.json();
          const solution = data.choices?.[0]?.message?.content;
          if (solution) {
            return { statusCode: 200, headers, body: JSON.stringify({ solution: "[Together AI Active]\n\n" + solution }) };
          }
        }
      }
    } catch (e) {
      console.error("Together AI Error:", e.message);
    }

    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: "সবগুলো ফ্রি এআই সিস্টেম বর্তমানে ব্যস্ত। ১ মিনিট পর আবার চেষ্টা করুন।" })
    };

  } catch (error) {
    return { statusCode: 500, headers, body: JSON.stringify({ error: error.message }) };
  }
};
