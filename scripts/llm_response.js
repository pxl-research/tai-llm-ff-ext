// PARSING OF THE LLM RESPONSE

// strip a ```json ... ``` fence (or any fenced block) from a markdown-wrapped
// LLM response; if no fence is present, return the text trimmed
function stripJsonFence(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return (fenced ? fenced[1] : text).trim();
}

// extract the suggestions array from the OpenRouter response shape
function parseLlmSuggestions(llmResult) {
    const rawContent = llmResult?.choices?.[0]?.message?.content;
    if (!rawContent) {
        console.warn('LLM result had no content', llmResult);
        return [];
    }
    try {
        const parsed = JSON.parse(stripJsonFence(rawContent));
        if (!Array.isArray(parsed)) {
            console.warn('LLM result was not a JSON array', rawContent);
            return [];
        }
        return parsed;
    } catch (error) {
        console.warn(`Could not parse LLM result: ${error}\nraw content was: ${rawContent}`);
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
