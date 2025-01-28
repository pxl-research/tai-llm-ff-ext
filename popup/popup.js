function listenForClicks() {
    document.addEventListener("click", (e) => {
        console.log('click event: ' + e.target.textContent)

        // Send a message to the content script in the active tab.
        function performAction(tabs) {
            console.log('Tabs: ' + tabs);
            browser.tabs.sendMessage(tabs[0].id, {
                command: "logFormElements",
                target: e.target.textContent
            });
            //     browser.tabs.insertCSS({code: hidePage}).then(() => {
            //         const url = beastNameToURL(e.target.textContent);
            //         browser.tabs.sendMessage(tabs[0].id, {
            //             command: "beastify",
            //             beastURL: url,
            //         });
            //     });
        }

        function reportError(error) {
            console.error(`Error: ${error}`);
        }

        // Get the active tab, then call a method as appropriate.
        if (e.target.tagName !== "BUTTON" || !e.target.closest("#popup-content")) {
            // Ignore when click is not on a button within <div id="popup-content">.
            return;
        } else {
            console.log('popup action');
            browser.tabs
                .query({active: true, currentWindow: true})
                .then(performAction)
                .catch(reportError);
        }
    });
}

// Display the popup's error message and hide the normal UI.
function reportExecuteScriptError(error) {
    document.querySelector("#popup-content")
        .classList.add("hidden");
    document.querySelector("#error-content")
        .classList.remove("hidden");
    console.error(`Failed to execute beastify content script: ${error.message}`);
}

// When the popup loads, inject the content script into the active tab.
browser.tabs
    .executeScript({file: "/content_scripts/content_script.js"})
    .then(listenForClicks)
    .catch(reportExecuteScriptError);
