// ⚠️ ضع مفتاح OpenAI API الخاص بك هنا بين العلامتين ليعمل الموقع للجميع بشكل مخفي
const OPENAI_API_KEY = "ضع_مفتاح_sk_الخاص_بالمشروع_هنا";

// إعداد مسار مكتبة الـ PDF
pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cloudflare.com';

let remainingAttempts = 3; // عدد المحاولات التجريبية المجانية للعميل

const dropZone = document.getElementById('drop-zone');
const fileInput = document.getElementById('file-input');

dropZone.addEventListener('click', () => fileInput.click());
fileInput.addEventListener('change', handleFileSelect);

function handleFileSelect(e) {
    const file = e.target.files[0];
    if (file) {
        dropZone.querySelector('p').innerText = `تم اختيار ملف: ${file.name}`;
        dropZone.classList.add('border-indigo-500', 'bg-indigo-50/20');
    }
}

async function startProcessing() {
    // التحقق من وجود مفتاح API مثبت في الكود الخلفي
    if (OPENAI_API_KEY === "ضع_مفتاح_sk_الخاص_بالمشروع_هنا" || !OPENAI_API_KEY) {
        alert("تنبيه برمي للمالك: يرجى فتح ملف app.js ووضع مفتاح OpenAI API الحقيقي الخاص بك في السطر الأول ليشتغل التطبيق للعامة.");
        return;
    }

    // التحقق من الرصيد التجريبي للمستخدم
    if (remainingAttempts <= 0) {
        alert("لقد استهلكت جميع محاولاتك المجانية المتاحة! يرجى الاشتراك في إحدى الباقات الاحترافية لمتابعة استخدام المنصة.");
        return;
    }

    const taskType = document.getElementById('task-type').value;
    const summaryStyle = document.getElementById('summary-style').value;
    const textInput = document.getElementById('text-input').value.trim();
    const file = fileInput.files[0];

    const resultContainer = document.getElementById('result-container');
    const resultText = document.getElementById('result-text');
    const loadingSpinner = document.getElementById('loading-spinner');
    const loadingText = document.getElementById('loading-text');

    resultContainer.classList.remove('hidden');
    loadingSpinner.classList.remove('hidden');
    resultText.innerText = '';

    try {
        let textToSummarize = "";

        if (taskType === 'audio') {
            if (!file) throw new Error("رجاءً ارفع ملفاً صوتياً أولاً.");
            loadingText.innerText = "⏳ جاري تحويل وتحليل الصوت عبر Whisper API الخاص بالمنصة...";
            textToSummarize = await transcribeAudio(file);
        } else {
            if (textInput) {
                textToSummarize = textInput;
            } else if (file && file.type === "application/pdf") {
                loadingText.innerText = "⏳ جاري استخراج النصوص من ملف الـ PDF الخاص بك...";
                textToSummarize = await extractTextFromPDF(file);
            } else if (file && file.type === "text/plain") {
                textToSummarize = await file.text();
            } else {
                throw new Error("رجاءً ضع نصاً أو ارفع ملف (PDF / TXT) لتلخيصه.");
            }
        }

        loadingText.innerText = "⏳ يصيغ الذكاء الاصطناعي الآن التلخيص النهائي والمحترف...";
        const finalSummary = await summarizeText(textToSummarize, summaryStyle);
        
        loadingSpinner.classList.add('hidden');
        resultText.innerText = finalSummary;

        // خصم محاولة من رصيد المستخدم بعد النجاح لتشجيعه على الدفع
        remainingAttempts--;
        document.getElementById('usage-counter').innerText = `🔄 العمليات المتاحة لك: ${remainingAttempts} محاولات تجريبية`;

    } catch (error) {
        loadingSpinner.classList.add('hidden');
        resultText.innerHTML = `<span class="text-red-500 font-bold">❌ فشلت المعالجة:</span> <br> ${error.message}`;
    }
}

async function extractTextFromPDF(file) {
    const arrayBuffer = await file.arrayBuffer();
    const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
    let fullText = "";
    for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        fullText += textContent.items.map(item => item.str).join(" ") + "\n";
    }
    if (!fullText.trim()) throw new Error("الملف فارغ أو ممسوح ضوئياً كصورة.");
    return fullText;
}

async function transcribeAudio(file) {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("model", "whisper-1");
    formData.append("language", "ar");

    const response = await fetch("https://openai.com", {
        method: "POST",
        headers: { "Authorization": `Bearer ${OPENAI_API_KEY}` },
        body: formData
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "خطأ في معالجة الصوت.");
    }
    const data = await response.json();
    return data.text;
}

async function summarizeText(text, style) {
    let promptStyle = "قم بتلخيص النص التالي بأسلوب نقاط رئيسية وموجزة ومنظمة بشكل مريح للعين.";
    if (style === 'executive') promptStyle = "قم بعمل تلخيص تنفيذي شامل ومهني للنص، مع استخراج القرارات والأفكار الرئيسية بأسلوب احترافي للشركات.";
    if (style === 'qa') promptStyle = "حول النص التالي بالكامل إلى صيغة أسئلة متوقعة وأجوبة دقيقة وشاملة بناءً على المحتوى فقط.";

    const response = await fetch("https://openai.com", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini",
            messages: [
                { role: "system", content: "أنت مساعد ذكاء اصطناعي محترف متخصص في تلخيص المستندات وتفريغ المحاضرات والاجتماعات باللغة العربية بأسلوب جذاب وبليغ." },
                { role: "user", content: `${promptStyle}\n\nالنص المراد معالجته:\n${text}` }
            ],
            temperature: 0.5
        })
    });

    if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error?.message || "فشل توليد التلخيص.");
    }
    const data = await response.json();
    return data.choices[0].message.content;
}

function copyResult() {
    const text = document.getElementById('result-text').innerText;
    navigator.clipboard.writeText(text);
    alert('📋 تم نسخ النص والملخص بنجاح!');
}

function openPaymentMock() {
    alert("💳 سيتم نقلك الآن لبوابة الدفع الآمنة (Stripe) لإتمام قيمة الاشتراك وتفعيل الاستخدام اللامحدود للحساب.");
}
