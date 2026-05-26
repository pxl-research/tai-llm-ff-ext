// PARSING OF THE LLM RESPONSE

// strip a ```json ... ``` fence from a markdown-wrapped LLM response
function stripJsonFence(text) {
    return text
        .replace(/^```json\s*/, '')
        .replace(/```\s*$/, '');
}

// extract the suggestions array from the OpenRouter response shape
function parseLlmSuggestions(llmResult) {
    const rawContent = llmResult?.choices?.[0]?.message?.content;
    if (!rawContent) {
        return [];
    }
    console.log(rawContent);
    try {
        return JSON.parse(stripJsonFence(rawContent));
    } catch (error) {
        console.warn(`Could not parse LLM result: ${error}`);
        return [];
    }
}

// build a readable message from a failed OpenRouter response (4xx/5xx)
async function describeError(response) {
    let detail = '';
    try {
        const body = await response.json();
        detail = body?.error?.message || '';
    } catch (error) {
        // response body was not JSON
    }
    return detail
        ? `LLM request failed (${response.status}): ${detail}`
        : `LLM request failed (${response.status} ${response.statusText})`;
}

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {stripJsonFence, parseLlmSuggestions, describeError};
}
