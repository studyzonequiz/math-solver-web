const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  // CORS পলিসি হ্যান্ডেল করার জন্য headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // OPTIONS রিকোয়েস্ট হ্যান্ডেল করা
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

    // API Key চেক করা
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API Key missing in server environment." }),
      };
    }

    // সঠিক এবং আপডেটেড জেমিনি ইনিশিয়ালাইজেশন
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // ছবি এবং টেক্সট একসাথে হ্যান্ডেল করার জন্য শক্তিশালী মডেল
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contents = [];

    // ফ্রন্টএন্ড থেকে ছবি পাঠানো হলে তা জেমিনির ফরম্যাটে যুক্ত করা
    if (base64Image) {
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      });
    }

    // চ্যাটবক্সের টেক্সট ও এআই প্রম্পট যুক্ত করা
    contents.push(userPrompt);

    // জেমিনি থেকে উত্তর জেনারেট করা
    const result = await model.generateContent(contents);
    const response = await result.response;
    const solutionText = response.text();

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
