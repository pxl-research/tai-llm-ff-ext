(() => {

    // UI LOGIC
    const ST_DEFAULT = 0;
    const ST_RUNNING = 1;
    const ST_DONE = 2;
    const ST_PROBLEM = -1;

    // TODO: detect if there is a form present and give a pop-up

    function fillOutForm(msg) {
        postMessage('Started processing', ST_RUNNING);

        // convert part of the DOM to a flat JSON array
        const startTag = document.getElementsByTagName('body')[0];
        const tagFilter = ['input', 'textarea', 'select', 'option'];
        const classFilter = ['ql-editor'];
        const outputList = [];
        domToJson(startTag, tagFilter, classFilter, outputList);

        // prepare the LLM prompt
        let promptText = 'Please fill out the form using this information:\n ';
        promptText += `A. A list of relevant input and text elements: \n--START--\n ${JSON.stringify(outputList, null, 2)} \n--END--\n`;
        promptText += `B. Some information provided by the user: \n--START--\n ${msg.userData} \n--END--\n`;

        const messages = [
            systemPrompt,
            {
                'role': 'user',
                'content': promptText
            }
        ];

        postMessage(`Asking LLM for input ...`, ST_RUNNING);
        callOpenRouter(messages, msg.apiKey)
            .then((llmResult) => {
                postMessage(`LLM answer received.`, ST_RUNNING);
                processLlmResult(parseLlmSuggestions(llmResult));
                postMessage('Finished processing', ST_DONE);
            })
            .catch((error) => {
                console.error(error);
                postMessage(error.message, ST_PROBLEM);
            });
    }

    // apply a single {path, value, label} suggestion to its target element
    function applySuggestion(element, result) {
        const tagName = element.tagName.toLowerCase();
        console.log(`Putting suggestion for '${result.label}' in ${result.path}`);
        element.focus();

        if (tagName === 'input' || tagName === 'textarea') {
            // "type" in the value so framework listeners fire
            // TODO: execCommand is deprecated; switch to an InputEvent-based
            // fallback if browsers eventually drop it
            document.execCommand('insertText', false, result.value);

        } else if (tagName === 'span' || tagName === 'div') {
            element.click();

            // custom handling for Quill editors (ql-editor)
            const classes = element.getAttribute('class');
            if (classes && classes.includes('ql-editor')) {
                element.firstElementChild.innerHTML = result.value;
            }

        } else if (element.hasAttribute('value')) {
            element.value = result.value;
            console.info(`Setting the value in ${tagName}`);

        } else {
            console.warn(`I don't know what to do with ${result.path} of type ${tagName}`);
        }

        element.blur();
    }

    function processLlmResult(resultArray) {
        document.activeElement.blur();
        for (const result of resultArray) {
            postMessage(JSON.stringify(result), ST_DEFAULT);
            if (!result.path) {
                console.warn(`No path included in result!`);
                continue;
            }

            const element = document.querySelector(`[path="${result.path}"]`);
            if (element) {
                applySuggestion(element, result);
            } else {
                console.warn(`Could not find element with path ${result.path}`);
            }
        }
    }

    // send a message to the popup; the popup may be closed (Firefox closes it
    // on blur), leaving no receiver — that rejection is expected, so ignore it
    function postMessage(msg = '', state = ST_DEFAULT) {
        browser.runtime.sendMessage({
            'from': 'content_script',
            'message': msg,
            'state': state
        }).catch(() => {});
    }

    // expose to the popup so it can drive us via scripting.executeScript({func,args})
    // — more reliable than runtime messaging right after injection
    window.fillOutForm = fillOutForm;
})();
