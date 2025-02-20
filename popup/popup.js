function listenForClicks() {
    const CLICK = 'click';

    const txOrKey = document.getElementById('or_key');
    const txUserData = document.getElementById('user_data');
    txOrKey.value = localStorage.getItem('or_key');

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
            } else if (e.target.id === 'save_or_key') {
                // store the key in local storage TODO: encrypt
                localStorage.setItem('or_key', txOrKey.value.trim());
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

browser.runtime.onMessage.addListener((message, sender) => {
    console.log(`browser.runtime.onMessage: ${JSON.stringify(message)}`);


    const progressBar = document.getElementById('progress_bar');
    switch (message.state) {
        case 1: // running
            progressBar.style.display = 'inline-block';
            break;
        default: // not running
            progressBar.style.display = 'none';
            break;
    }

    const debugMsg = document.getElementById('debug_msg');
    debugMsg.innerText = message.message;
});

// when the popup loads, inject the content script into the active tab
browser.tabs
    .executeScript({file: '/scripts/content_script.js'})
    .then(listenForClicks)
    .catch(reportExecuteScriptError);
