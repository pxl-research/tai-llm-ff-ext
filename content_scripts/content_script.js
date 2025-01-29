(() => {
    // TODO: let user enter API key
    // TODO: perform HTTP call to OpenRouter (or similar)

    // prevent script from running twice
    if (window.hasRun) {
        return;
    }
    window.hasRun = true;

    function fillOutForm() {

        // all human-readable text
        console.log(document.body.innerText);

        // all the form labels
        const labelElements = document.getElementsByTagName('label');
        const labelMap = new Map();
        for (const labelElement of labelElements) {
            const labelFor = labelElement.getAttribute('for');
            const labelText = labelElement.textContent ? labelElement.textContent.trim() : '';
            labelMap.set(labelFor, labelText);
        }
        // for (const [key, value] of labelMap.entries()) {
        //     console.log(`${key} = ${value}`);
        // }

        // collect info on all input elements in the document
        // TODO: process select options
        // TODO: process all types separately?
        const formElements = document.querySelectorAll('input, select, textarea');
        const inputs = [];
        formElements.forEach(element => {
            if (element.getAttribute('type') !== 'hidden') {
                const elementId = element.getAttribute('id');
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

        // to set a value back into the form
        // if (element.hasAttribute('value')) {
        //     element.setAttribute('value', 'test');
        // }
    }

    // listen for messages from the background script.
    browser.runtime.onMessage.addListener((message) => {
        console.log(`onMessage: ${JSON.stringify(message, null, 2)}`);
        // call the function to process form elements
        fillOutForm(message);
    });
})();
