function listenForClicks() {
    const CLICK = 'click';

    document.addEventListener(CLICK, (e) => {

        // get user entered data
        const txUserData = document.getElementById('user_data');

        // send a message to the content script in the active tab.
        function performAction(tabs) {
            browser.tabs.sendMessage(tabs[0].id,
                {
                    command: CLICK,
                    target: e.target.id,
                    label: e.target.textContent.trim(),
                    userData: txUserData.value.trim()
                });
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

// when the popup loads, inject the content script into the active tab
browser.tabs
    .executeScript({file: '/content_scripts/content_script.js'})
    .then(listenForClicks)
    .catch(reportExecuteScriptError);
