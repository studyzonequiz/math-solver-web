async function previewAndSolve(event) {
    const file = event.target.files[0];
    if (!file) return;

    const preview = document.getElementById('preview');
    const loading = document.getElementById('loading');
    const resultBox = document.getElementById('result-box');
    const solutionText = document.getElementById('solutionText');

    // ১. স্ক্রিনে ছবিটির প্রিভিউ দেখানো
    preview.src = URL.createObjectURL(file);
    preview.style.display = 'block';
    
    // লোডিং অন করা এবং পুরানো রেজাল্ট মুছে দেওয়া
    loading.style.display = 'block';
    resultBox.style.display = 'none';
    solutionText.innerText = '';

    // ২. ছবিটিকে Base64 ফরম্যাটে রূপান্তর করা
    const reader = new FileReader();
    reader.onloadend = async () => {
        const base64Image = reader.result.split(',')[1];

        try {
            // ৩. Netlify-এর ব্যাকএন্ড ফাংশনে ডাটা পাঠানো
            const response = await fetch('/.netlify/functions/solve-math', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ image: base64Image })
            });

            const data = await response.json();

            if (response.ok && data.solution) {
                // সমাধান স্ক্রিনে দেখানো
                solutionText.innerText = data.solution;
                resultBox.style.display = 'block';
            } else {
                solutionText.innerText = 'ভুল হয়েছে: ' + (data.error || 'অংকটি সমাধান করা যায়নি।');
                resultBox.style.display = 'block';
            }
        } catch (error) {
            solutionText.innerText = 'সার্ভারে কানেক্ট করতে সমস্যা হচ্ছে। আবার চেষ্টা করুন।';
            resultBox.style.display = 'block';
        } finally {
            loading.style.display = 'none';
        }
    };

    reader.readAsDataURL(file);
}
