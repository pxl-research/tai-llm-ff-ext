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
            ' - the readable text of the webpage ' +
            ' - a list of all form input elements, with their "id", "label" and more ' +
            ' - a (potentially large) block of text that may contain information to fill out the form ' +
            'Please return a valid JSON array with the following information: ' +
            ' - the "id" of the element ' +
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

        // collect all the form labels
        const labelElements = document.getElementsByTagName('label');
        const labelMap = new Map();
        for (const labelElement of labelElements) {
            const labelFor = labelElement.getAttribute('for');
            const labelText = labelElement.textContent ? labelElement.textContent.trim() : '';
            labelMap.set(labelFor, labelText);
        }

        // collect info on all input elements in the document
        // TODO: process select options
        // TODO: process all types separately?
        const formElements = document.querySelectorAll('input, select, textarea');
        const inputs = [];
        formElements.forEach(element => {
            if (element.getAttribute('type') !== 'hidden') {
                let elementId = element.getAttribute('id');
                if (!elementId) {
                    elementId = getShortHash();
                    element.setAttribute('id', elementId);
                }
                const input = {
                    'tag': element.tagName.toLowerCase(),
                    'id': elementId
                };
                if (element.hasAttribute('name')) {
                    input['name'] = element.getAttribute('name');
                }
                if (element.hasAttribute('type')) {
                    input['type'] = element.getAttribute('type');
                }
                if (element.hasAttribute('value')) {
                    input['value'] = element.getAttribute('value');
                }
                if (labelMap.has(elementId)) {
                    input['label'] = labelMap.get(elementId);
                }
                inputs.push(input);
            }
        });
        console.log(JSON.stringify(inputs, null, 2));

        let promptText = 'Please fill out the form using this information:\n ';
        promptText += `A. The text of the webpage: \n--START--\n ${document.body.innerText} \n--END--\n`;
        promptText += `B. The list of all input elements: \n--START--\n ${JSON.stringify(inputs, null, 2)} \n--END--\n`;
        promptText += `C. Some information provided by the user: \n--START--\n ${msg.userData} \n--END--\n`

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
            const element = document.getElementById(result.id);
            if (element) {
                console.log(`Setting ${result.id} to ${result.value}`);
                if (element.tagName.toLowerCase() === 'input' || element.tagName.toLowerCase() === 'textarea') {
                    // fake user input
                    element.focus();
                    document.execCommand('insertText', false, result.value);
                    // element.setAttribute('value', result.value);
                } else if (element.tagName.toLowerCase() === 'select') {
                    element.value = result.value;
                } else {
                    console.warn(`Setting ${result.id} to ${result.value} failed`);
                }
            } else {
                console.warn(`Could not find element with id ${result.id}`);
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
