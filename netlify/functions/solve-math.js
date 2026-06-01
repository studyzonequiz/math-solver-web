const { GoogleGenAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // CORS পলিসি হ্যান্ডেল করার জন্য headers সেটআপ
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // ব্রাউজার থেকে আসা প্রি-ফ্লাইট OPTIONS রিকোয়েস্ট হ্যান্ডেল করা
  if (event.httpMethod === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  if (event.httpMethod !== "POST") {
    return { statusCode: 405, headers, body: JSON.stringify({ error: "Method Not Allowed" }) };
  }

  try {
    const body = JSON.parse(event.body);
    const base64Image = body.image;
    const userPrompt = body.prompt || "Solve this doubt step by step.";

    // Netlify এনভায়রনমেন্ট ভেরিয়েবল থেকে API Key নেওয়া হচ্ছে
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "Server Configuration Error: API Key missing." }),
      };
    }

    // জেমিনি এআই ইনিশিয়ালাইজেশন
    const ai = new GoogleGenAI({ apiKey: apiKey });
    
    // ছবি এবং টেক্সট দুটোই একসাথে প্রসেস করার জন্য সবচেয়ে উপযোগী এবং ফাস্ট মডেল
    const model = ai.models.get("gemini-2.5-flash");

    const contents = [];

    // ফ্রন্টএন্ড থেকে ছবি পাঠানো হলে তা জেমিনির ফরম্যাট অনুযায়ী যুক্ত করা হবে
    if (base64Image) {
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      });
    }

    // ফ্রন্টএন্ডের সেই সেন্ট্রাল সিস্টেম প্রম্পট ও ইউজারের ইনপুট টেক্সট পুশ করা হচ্ছে
    contents.push(userPrompt);

    // জেমিনি রেসপন্স জেনারেট করা
    const response = await model.generateContent({ contents });
    const solutionText = response.text;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ solution: solutionText }),
    };

  } catch (error) {
    console.error("Error in serverless function:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
