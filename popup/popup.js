const LS_OR_KEY = 'or_key';
const LS_USER_DATA = 'user_data';
const LS_OUTPUT = 'output_list';

function listenForClicks() {
    const CLICK = 'click';

    const txOrKey = document.getElementById(LS_OR_KEY);
    const txUserData = document.getElementById(LS_USER_DATA);
    const divOutput = document.getElementById(LS_OUTPUT);

    txOrKey.value = localStorage.getItem(LS_OR_KEY);
    txUserData.value = localStorage.getItem(LS_USER_DATA);
    divOutput.innerHTML = localStorage.getItem(LS_OUTPUT);

    document.addEventListener(CLICK, (e) => {

        // send a message to the content script in the active tab.
        function performAction(tabs) {
            if (e.target.id === 'fill_out_form') {
                // get user entered data and pass to content script
                browser.tabs.sendMessage(tabs[0].id,
                    {
                        command: CLICK,
                        target: e.target.id,
                        label: e.target.textContent.trim(),
                        userData: txUserData.value.trim(),
                        apiKey: txOrKey.value.trim()
                    });

                // store user data in local storage, for convenience
                localStorage.setItem(LS_USER_DATA, txUserData.value.trim());

                const outputList = document.getElementById(LS_OUTPUT);
                outputList.innerHTML = ''; // clear response

            } else if (e.target.id === 'save_or_key') {
                // store the key in local storage TODO: encrypt
                localStorage.setItem(LS_OR_KEY, txOrKey.value.trim());
            } else if (e.target.id === 'reset_form') {
                txUserData.value = '';
                localStorage.setItem(LS_USER_DATA, '');
            } else if (e.target.id === 'reset_output') {
                divOutput.innerHTML = '';
                localStorage.setItem(LS_OUTPUT, '');
            }
        }

        function reportError(error) {
            console.error(`Error: ${error}`);
        }

        // get the active tab, then call a method as appropriate.
        if (e.target.tagName !== 'BUTTON' || !e.target.closest('#popup-content')) {
            return; // ignore when click is not on a button within <div id='popup-content'>.
        } else {
            browser.tabs
                .query({active: true, currentWindow: true})
                .then(performAction)
                .catch(reportError);
        }
    });
}

// display the popup's error message and hide the normal UI
function reportExecuteScriptError(error) {
    document.querySelector('#popup-content')
        .classList.add('hidden');
    document.querySelector('#error-content')
        .classList.remove('hidden');
    console.error(`Failed to execute content script: ${error.message}`);
}


function processMessage(message, state) {
    try {
        const msgObj = JSON.parse(message);

        if (msgObj.hasOwnProperty('label')) {
            // display the message as an input suggestion
            const outputList = document.getElementById('output_list');
            outputList.innerHTML += `<dt>${msgObj.label}</dt>\n`;
            outputList.innerHTML += `<dd>${msgObj.value}</dd>\n`;

            // store this to preserve state
            localStorage.setItem(LS_OUTPUT, outputList.innerHTML.trim());
        }
    } catch (error) {
        console.warn(`Could not process content of message: ${error}`);
    }
}

// copy to clipboard
function c2cb(text) {
    navigator.clipboard.writeText(text);
}


// register a listener for communication with the script in the tab
browser.runtime.onMessage.addListener((message, sender) => {
    // console.log(`browser.runtime.onMessage from ${message.from}`);

    const progressBar = document.getElementById('progress_bar');
    switch (message.state) {
        case 1: // running
            progressBar.style.display = 'inline-block';
            const debugMsg = document.getElementById('debug_msg');
            debugMsg.innerText = message.message;
            break;
        case 2: // done
            progressBar.style.display = 'none';
            break;
        default: // other state
            processMessage(message.message, message.state);
            break;
    }
});

// when the popup loads, inject the content script into the active tab
browser.tabs
    .executeScript({file: '/scripts/content_script.js'})
    .then(listenForClicks)
    .catch(reportExecuteScriptError);
