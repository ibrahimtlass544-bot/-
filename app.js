// State Management
let currentTab = 'audio';
let activeFile = null;

// DOM Elements
const tabAudio = document.getElementById('tab-audio');
const tabText = document.getElementById('tab-text');
const panelAudio = document.getElementById('panel-audio');
const panelText = document.getElementById('panel-text');
const audioFileInput = document.getElementById('audio-file');
const dropZone = document.getElementById('drop-zone');
const fileInfo = document.getElementById('file-info');
const fileNameDisplay = document.getElementById('file-name');
const removeFileBtn = document.getElementById('remove-file');
const btnTranscribe = document.getElementById('btn-transcribe');
const btnSummarize = document.getElementById('btn-summarize');
const textInput = document.getElementById('text-input');
const summaryStyle = document.getElementById('summary-style');
const apiKeyInput = document.getElementById('api-key');

// Output DOM Elements
const outputPlaceholder = document.getElementById('output-placeholder');
const outputResultContainer = document.getElementById('output-result-container');
const blockTranscription = document.getElementById('block-transcription');
const textTranscriptionOutput = document.getElementById('text-transcription-output');
const textSummaryOutput = document.getElementById('text-summary-output');
const loadingOverlay = document.getElementById('loading-overlay');
const loadingStatus = document.getElementById('loading-status');
const btnCopy = document.getElementById('btn-copy');

// Load API Key from local storage if existing
if (localStorage.getItem('openai_api_key')) {
    apiKeyInput.value = localStorage.getItem('openai_api_key');
}

// Tab Toggling Action
tabAudio.addEventListener('click', () => {
    currentTab = 'audio';
    tabAudio.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-blue-600 text-white shadow-sm shadow-blue-100";
    tabText.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50";
    panelAudio.classList.remove('hidden');
    panelText.classList.add('hidden');
});

tabText.addEventListener('click', () => {
    currentTab = 'text';
    tabText.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 bg-indigo-600 text-white shadow-sm shadow-indigo-100";
    tabAudio.className = "flex-1 py-2.5 rounded-xl font-semibold text-sm transition-all flex items-center justify-center gap-2 text-gray-600 hover:bg-gray-50";
    panelText.classList.remove('hidden');
    panelAudio.classList.add('hidden');
});

// File Management Handlers
audioFileInput.addEventListener('change', (e) => {
    if (e.target.files.length > 0) {
        handleFileSelect(e.target.files[0]);
    }
});

function handleFileSelect(file) {
    activeFile = file;
    fileNameDisplay.textContent = `${file.name} (${(file.size / (1024 * 1024)).toFixed(2)} MB)`;
    fileInfo.classList.remove('hidden');
    dropZone.classList.add('bg-blue-50/40', 'border-blue-300');
}

removeFileBtn.addEventListener('click', (e) => {
    e.preventDefault();
    activeFile = null;
    audioFileInput.value = '';
    fileInfo.classList.add('hidden');
    dropZone.className = "border-2 border-dashed border-gray-200 hover:border-blue-400 rounded-xl p-6 text-center cursor-pointer transition-colors bg-gray-50/50 relative";
});

// Utility Alert Component
function showNotification(message, type = 'error') {
    alert(message); // Standard backup fallback notification
}

// Copy Action
btnCopy.addEventListener('click', () => {
    const summaryText = textSummaryOutput.innerText;
    const transcriptText = blockTranscription.classList.contains('hidden') ? '' : textTranscriptionOutput.innerText;
    const combinedText = `${transcriptText ? '--- التفريغ الفوري ---\\n' + transcriptText + '\\n\\n' : ''}--- ملخص الذكاء الاصطناعي ---\\n${summaryText}`;
    
    navigator.clipboard.writeText(combinedText).then(() => {
        alert('تم نسخ النصوص بنجاح إلى الحافظة!');
    });
});

// Core API Processing Logic
btnTranscribe.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    if (!apiKey) {
        alert('من فضلك قم بإدخال مفتاح الـ API Key أولاً للتشغيل.');
        return;
    }
    if (!activeFile) {
        alert('الرجاء رفع واختيار ملف صوري أو مقطع صوتي أولاً.');
        return;
    }

    // Save key locally
    localStorage.setItem('openai_api_key', apiKey);

    // Show Loading
    loadingOverlay.classList.remove('hidden');
    loadingStatus.textContent = "يجري الآن تفريغ الصوت وتحويله إلى نصوص عبر Whisper API...";

    try {
        // Step 1: Request Transcription from OpenAI Whisper
        const formData = new FormData();
        formData.append('file', activeFile);
        formData.append('model', 'whisper-1');
        formData.append('language', 'ar'); // Forces high fidelity Arabic detection

        const whisperResponse = await fetch('https://api.openai.com/v1/audio/transcriptions', {
            method: 'POST',
            headers: { 'Authorization': `Bearer ${apiKey}` },
            body: formData
        });

        if (!whisperResponse.ok) {
            const errData = await whisperResponse.json();
            throw new Error(errData.error?.message || 'فشل في عملية تفريغ الصوت.');
        }

        const whisperResult = await whisperResponse.json();
        const transcriptionText = whisperResult.text;

        // Update UI with transcript
        textTranscriptionOutput.textContent = transcriptionText;
        blockTranscription.classList.remove('hidden');

        // Step 2: Request Summarization via ChatGPT API
        loadingStatus.textContent = "تم استخراج النص بنجاح! يجري الآن تلخيص المحتوى وتنسيقه ذكياً...";
        const summaryText = await generateAiSummary(apiKey, transcriptionText, 'bullet');

        // Render Results
        textSummaryOutput.textContent = summaryText;
        outputPlaceholder.classList.add('hidden');
        outputResultContainer.classList.remove('hidden');

    } catch (error) {
        console.error(error);
        alert(`خطأ في المعالجة: ${error.message}`);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

btnSummarize.addEventListener('click', async () => {
    const apiKey = apiKeyInput.value.trim();
    const rawText = textInput.value.trim();
    const selectedStyle = summaryStyle.value;

    if (!apiKey) {
        alert('من فضلك قم بإدخال مفتاح الـ API Key أولاً للتشغيل.');
        return;
    }
    if (!rawText) {
        alert('الرجاء كتابة أو لصق نص داخل المربع ليتم تلخيصه.');
        return;
    }

    localStorage.setItem('openai_api_key', apiKey);
    loadingOverlay.classList.remove('hidden');
    loadingStatus.textContent = "يجري الآن إرسال وتلخيص النص عبر خوارزميات GPT...";

    try {
        blockTranscription.classList.add('hidden'); // Hide transcript block for text-only inputs
        const summaryResult = await generateAiSummary(apiKey, rawText, selectedStyle);

        textSummaryOutput.textContent = summaryResult;
        outputPlaceholder.classList.add('hidden');
        outputResultContainer.classList.remove('hidden');
    } catch (error) {
        console.error(error);
        alert(`خطأ في عملية التلخيص: ${error.message}`);
    } finally {
        loadingOverlay.classList.add('hidden');
    }
});

// Helper function to hit GPT Completion Endpoint
async function generateAiSummary(apiKey, textToSummarize, style) {
    let stylePrompt = "قم بتلخيص النص التالي في نقاط رئيسية واضحة ومحددة ومكتوبة بلغة عربية احترافية ومفهومة.";
    if (style === 'executive') {
        stylePrompt = "قم بصياغة ملخص تنفيذي احترافي على شكل فقرات مترابطة وسلسة تشمل الأفكار الرئيسية بدقة.";
    } else if (style === 'qa') {
        stylePrompt = "قم بتلخيص المحتوى بالكامل في هيئة أسئلة وإجابات (س وج) تشرح جوهر الموضوع بشكل تفاعلي.";
    }

    const gptResponse = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`
        },
        body: JSON.stringify({
            model: "gpt-4o-mini", // Cost effective & super fast for transactional production
            messages: [
                { role: "system", content: "أنت خبير ذكاء اصطناعي محترف في تلخيص وتحليل المحتوى المكتوب والمسموع بدقة متناهية وباللغة العربية." },
                { role: "user", content: `${stylePrompt}\\n\\nالنص المراد معالجته:\\n${textToSummarize}` }
            ],
            temperature: 0.5
        })
    });

    if (!gptResponse.ok) {
        const errData = await gptResponse.json();
        throw new Error(errData.error?.message || 'فشل الاتصال بمحرك التلخيص.');
    }

    const gptResult = await gptResponse.json();
    return gptResult.choices[0].message.content;
}
