// OPENROUTER CALLS
const baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
const defaultHeaders = {
    'HTTP-Referer': 'https://pxl-firefox-plugin.be/',
    'X-Title': 'Firefox LLM Plug-In @ PXL Smart ICT',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
};
const defaultModel = 'google/gemini-2.0-flash-001';

const systemPrompt = {
    'role': 'system',
    'content': 'You are an assistant who has to help people fill out web forms. ' +
        'You will receive some JSON text with the following information: ' +
        ' - a list of webpage elements (such as form input fields or text data)  ' +
        ' with their tag name, text value, and path in the DOM. ' +
        ' - a (potentially large) block of text that may contain information to fill out the form ' +
        'Please return a valid JSON array with the following information: ' +
        ' - the "path" of the element ' +
        ' - the suggested "value" for the element ' +
        'If you want to add additional information you may add a "remark" field to pass it on, ' +
        'but always ensure the result is a valid JSON array. ' +
        'Make sure the result is valid JSON, and make sure to escaping any quotes in the text.'
};

async function callOpenRouter(messages, apiKey, modelStr = defaultModel) {
    const headers = defaultHeaders;
    headers['Authorization'] = `Bearer ${apiKey}`;

    const body = {
        'model': modelStr,
        'messages': messages
    };

    try {
        const response = await fetch(baseUrl, {
            method: 'POST',
            headers: headers,
            body: JSON.stringify(body)
        });
        if (!response.ok) {
            throw new Error(`Response status: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error(error.message);
    }
}