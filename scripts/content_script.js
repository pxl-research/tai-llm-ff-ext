(() => {

    // prevent script from running twice
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;


    // UI LOGIC
    const ST_DEFAULT = 0;
    const ST_RUNNING = 1;
    const ST_DONE = 2;
    const ST_PROBLEM = -1;

    function getShortHash() {
        const nr = Math.random();
        const str = nr.toString(36);
        return str.substring(2);
    }


    function fillOutForm(msg) {

        // convert part of the DOM to a flat JSON array
        const startTag = document.getElementsByTagName('body')[0];
        const tagFilter = ['input', 'textarea', 'select', 'option'];
        const outputList = [];
        domToJson(startTag, tagFilter, outputList);

        // const jsonString = JSON.stringify(outputList, null, 1);
        // console.log(jsonString);

        // prepare the LLM prompt
        let promptText = 'Please fill out the form using this information:\n ';
        promptText += `A. A list of relevant input and text elements: \n--START--\n ${JSON.stringify(outputList, null, 2)} \n--END--\n`;
        promptText += `B. Some information provided by the user: \n--START--\n ${msg.userData} \n--END--\n`

        const messages = [
            systemPrompt,
            {
                'role': 'user',
                'content': promptText
            }
        ];

        // call the LLM
        postMessage(`Asking LLM for input ...`, ST_RUNNING);
        callOpenRouter(messages, msg.apiKey)
            .then((llmResult) => {
                postMessage(`LLM answer received.`, ST_RUNNING);
                if (llmResult.hasOwnProperty('choices')) {
                    if (llmResult.choices.length > 0) {
                        if (llmResult.choices[0].hasOwnProperty('message')) {
                            const message = llmResult.choices[0].message;

                            if (message.hasOwnProperty('content')) {
                                console.log(message.content);

                                let rawContent = message.content;
                                // TODO error checking on response format
                                if (rawContent.startsWith('```json')) {
                                    rawContent = rawContent.substring(8, rawContent.length);
                                }
                                if (rawContent.endsWith('```')) {
                                    rawContent = rawContent.substring(0, rawContent.length - 3);
                                }

                                const suggestedValues = JSON.parse(rawContent);
                                processLlmResult(suggestedValues);
                            }
                        }
                    }
                }
            });
    }

    // process the LLM response
    function processLlmResult(resultArray) {
        for (const result of resultArray) {
            if (!result.path) {
                console.warn(`No path included in result!`);
                continue;
            }

            const element = document.querySelector(`[path="${result.path}"]`);
            if (element) { // fake user input
                console.log(`Setting ${result.path} of type ${element.tagName.toLowerCase()} to ${result.value}`);
                element.focus(); // focus on element

                if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                    // "type" in the value
                    document.execCommand('insertText', false, result.value);
                } else if (element.tagName.toLowerCase() === 'select') {
                    // set the value
                    element.value = result.value;
                } else if (element.tagName.toLowerCase() === 'span' || element.tagName.toLowerCase() === 'div') {
                    // "click" on the element
                    element.click();
                    element.value = result.value;
                } else {
                    console.warn(`Setting ${result.path} to ${result.value} failed`);
                }

                element.blur(); // unfocus the element
            } else {
                console.warn(`Could not find element with path ${result.path}`);
            }
        }
        postMessage('Finished processing', ST_DONE);
    }

    // send messages through the browser runtime
    function postMessage(msg = '', state = ST_DEFAULT) {
        browser.runtime.sendMessage({
            'from': 'content_script',
            'message': msg,
            'state': state
        });
    }

    // listen for messages from the background script.
    browser.runtime.onMessage.addListener((message) => {
        postMessage('Started processing', ST_RUNNING);
        // call the function to process form elements
        fillOutForm(message);
    });
})();
