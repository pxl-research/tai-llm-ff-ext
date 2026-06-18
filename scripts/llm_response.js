// PARSING OF THE LLM RESPONSE

// strip a ```json ... ``` fence (or any fenced block) from a markdown-wrapped
// LLM response; if no fence is present, return the text trimmed
function stripJsonFence(text) {
    const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/i);
    return (fenced ? fenced[1] : text).trim();
}

// bound a string for logging: returns it untouched when short, otherwise a
// truncated head + length marker (avoids leaking full LLM responses to the
// console and keeps devtools responsive for very large payloads)
function preview(text, max = 200) {
    if (text.length <= max) {
        return text;
    }
    return `${text.slice(0, max)}… (truncated, ${text.length} chars total)`;
}

// extract the suggestions array from the OpenRouter response shape
function parseLlmSuggestions(llmResult) {
    const rawContent = llmResult?.choices?.[0]?.message?.content;
    if (!rawContent) {
        console.warn('LLM result had no content');
        return [];
    }
    try {
        const parsed = JSON.parse(stripJsonFence(rawContent));
        if (!Array.isArray(parsed)) {
            console.warn(`LLM result was not a JSON array; preview: ${preview(rawContent)}`);
            return [];
        }
        return parsed;
    } catch (error) {
        console.warn(`Could not parse LLM result: ${error}\nraw content preview: ${preview(rawContent)}`);
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
    module.exports = {stripJsonFence, parseLlmSuggestions, describeError, preview};
}
