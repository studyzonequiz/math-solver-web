const { GoogleGenerativeAI } = require("@google/generative-ai");

exports.handler = async (event, context) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

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

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: "API Key missing in server environment." }),
      };
    }

    // package.json-এর সাথে কানেক্টেড সঠিক জেমিনি সেটআপ
    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });

    const contents = [];

    if (base64Image) {
      contents.push({
        inlineData: {
          mimeType: "image/jpeg",
          data: base64Image,
        },
      });
    }

    contents.push(userPrompt);

    const result = await model.generateContent(contents);
    const response = await result.response;
    const solutionText = response.text();

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ solution: solutionText }),
    };

  } catch (error) {
    console.error("Error:", error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: error.message || "Internal Server Error" }),
    };
  }
};
