const { GoogleGenAI } = require("@google/genai");

exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API Keyটি সেট করা হয়নি।" }) };
    }

    const ai = new GoogleGenAI({ apiKey: apiKey });

    try {
        const body = JSON.parse(event.body);
        const imageBuffer = body.image;

        if (!imageBuffer) {
            return { statusCode: 400, body: JSON.stringify({ error: "কোনো ছবি পাওয়া যায়নি।" }) };
        }

        // Gemini AI মডেলকে কল করা হচ্ছে অংক সমাধান করার জন্য
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: [
                {
                    inlineData: {
                        mimeType: "image/jpeg",
                        data: imageBuffer
                    }
                },
                "Please solve this math problem step-by-step in Bengali language. If there are multiple ways to solve it, show the easiest one."
            ],
        });

        return {
            statusCode: 200,
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ solution: response.text })
        };
    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "AI প্রসেস করতে ব্যর্থ হয়েছে: " + error.message }) 
        };
    }
};
