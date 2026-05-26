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

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {stripJsonFence, parseLlmSuggestions};
}
