const fetch = require('node-fetch');

exports.handler = async (event, context) => {
    if (event.httpMethod !== "POST") {
        return { statusCode: 405, body: "Method Not Allowed" };
    }

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
        return { statusCode: 500, body: JSON.stringify({ error: "API Keyটি সেট করা হয়নি।" }) };
    }

    try {
        const body = JSON.parse(event.body);
        const imageBuffer = body.image;

        if (!imageBuffer) {
            return { statusCode: 400, body: JSON.stringify({ error: "কোনো ছবি পাওয়া যায়নি।" }) };
        }

        // সরাসরি গুগল জেমিনি এপিআই লিঙ্কে রিকোয়েস্ট পাঠানো হচ্ছে
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { text: "Please solve this math problem step-by-step in Bengali language. If there are multiple ways to solve it, show the easiest one." },
                        {
                            inlineData: {
                                mimeType: "image/jpeg",
                                data: imageBuffer
                            }
                        }
                    ]
                }]
            })
        });

        const data = await response.json();
        
        if (data.candidates && data.candidates[0].content.parts[0].text) {
            return {
                statusCode: 200,
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ solution: data.candidates[0].content.parts[0].text })
            };
        } else {
            return {
                statusCode: 500,
                body: JSON.stringify({ error: "AI রেসপন্স তৈরি করতে পারেনি।" })
            };
        }

    } catch (error) {
        return { 
            statusCode: 500, 
            body: JSON.stringify({ error: "সার্ভার এরর: " + error.message }) 
        };
    }
};
