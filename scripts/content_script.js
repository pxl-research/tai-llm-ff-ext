(() => {

    // prevent script from running twice
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

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
            'Make absolutely sure you DO NOT include any markup such as ```, ```json or any other markup. '
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
        // Start the conversion
        const startTag = document.getElementsByTagName('body')[0];
        const tagFilter = ['input', 'textarea', 'select', 'option'];
        const outputList = [];
        domToJson(startTag, tagFilter, outputList);
        const jsonString = JSON.stringify(outputList, null, 1);

        console.log(jsonString);

        let promptText = 'Please fill out the form using this information:\n ';
        // promptText += `A. The text of the webpage: \n--START--\n ${document.body.innerText} \n--END--\n`;
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
                                processResult(suggestedValues);
                            }
                        }
                    }
                }
            });
    }

    function processResult(resultArray) {
        for (const result of resultArray) {
            if (!result.path) {
                console.warn(`No path included in result!`);
                continue;
            }
            const element = document.querySelector(`[path="${result.path}"]`);
            // const element = document.getElementById(result.id);
            if (element) {
                console.log(`Setting ${result.path} of type ${element.tagName.toLowerCase()} to ${result.value}`);
                if (element.tagName.toLowerCase() === 'input'
                    || element.tagName.toLowerCase() === 'textarea') {
                    // fake user input
                    element.focus();
                    document.execCommand('insertText', false, result.value);
                    element.blur();
                } else if (element.tagName.toLowerCase() === 'select') {
                    element.value = result.value;
                } else if (element.tagName.toLowerCase() === 'span' || element.tagName.toLowerCase() === 'div') {
                    element.focus();
                    element.click();
                    element.value = result.value;
                    element.blur();
                } else {
                    console.warn(`Setting ${result.path} to ${result.value} failed`);
                }
            } else {
                console.warn(`Could not find element with path ${result.path}`);
            }
        }
        postMessage('Finished processing', ST_DONE);
    }

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
