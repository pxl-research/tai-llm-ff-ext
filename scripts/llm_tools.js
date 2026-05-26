// OPENROUTER CALLS
const baseUrl = 'https://openrouter.ai/api/v1/chat/completions';
const defaultHeaders = {
    'HTTP-Referer': 'https://pxl-firefox-plugin.be/',
    'X-Title': 'Firefox LLM Plug-In @ PXL Smart ICT',
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*'
};
const defaultModel = 'deepseek/deepseek-v4-flash';

const systemPrompt = {
    'role': 'system',
    'content': 'You are an assistant who has to help people fill out web forms.\n ' +
        'You will receive some JSON text with the following information:\n ' +
        ' - a list of relevant webpage elements (such as form input fields, divs, or text data)  ' +
        ' with their tag name, text value, and path in the DOM.\n ' +
        ' - a (potentially large) block of text that may contain information to fill out the form\n ' +
        'Please return a valid JSON array with the following information:\n ' +
        ' - the "path" of the element\n ' +
        ' - the suggested "value" for the element\n ' +
        ' - a "label" for the element\n ' +
        'Fill out as many as you can, superfluous entries will be filtered out later.\n ' +
        'If you want to add additional information you may add a "remark" field to pass it on, ' +
        'but always ensure the result is a valid JSON array.\n ' +
        'Make sure the result is valid JSON, and make sure to escape any quotes in the text.\n ' +
        'Please try to break down long values in paragraphs separated with a newline character.\n'
};

async function callOpenRouter(messages, apiKey, modelStr = defaultModel) {
    const headers = {
        ...defaultHeaders,
        'Authorization': `Bearer ${apiKey}`
    };

    const body = {
        'model': modelStr,
        'messages': messages
    };

    const response = await fetch(baseUrl, {
        method: 'POST',
        headers: headers,
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        throw new Error(await describeError(response));
    }

    return await response.json();
}