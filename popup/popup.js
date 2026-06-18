const LS_OR_KEY = 'or_key';
const LS_USER_DATA = 'user_data';
const LS_OUTPUT = 'output_list'; // also the DOM id of the output <dl>

const CONTENT_SCRIPT_FILES = [
    '/scripts/dom_tools.js',
    '/scripts/llm_tools.js',
    '/scripts/llm_response.js',
    '/scripts/content_script.js'
];

// message states (mirror scripts/content_script.js)
const ST_RUNNING = 1;
const ST_DONE = 2;
const ST_PROBLEM = -1;

// in-memory mirror of the persisted output suggestions
let suggestions = [];

function listenForClicks() {
    const txOrKey = document.getElementById(LS_OR_KEY);
    const txUserData = document.getElementById(LS_USER_DATA);
    const divOutput = document.getElementById(LS_OUTPUT);

    txOrKey.value = localStorage.getItem(LS_OR_KEY) ?? '';
    txUserData.value = localStorage.getItem(LS_USER_DATA) ?? '';

    suggestions = loadSuggestions();
    renderSuggestions(divOutput);

    const buttonHandlers = {
        fill_out_form: () => {
            fillOutForm(txUserData.value.trim(), txOrKey.value.trim());
            localStorage.setItem(LS_USER_DATA, txUserData.value.trim());
            clearSuggestions(divOutput);
            setError('');
        },
        save_or_key: () => {
            // TODO: encrypt
            localStorage.setItem(LS_OR_KEY, txOrKey.value.trim());
        },
        reset_form: () => {
            txUserData.value = '';
            localStorage.setItem(LS_USER_DATA, '');
        },
        reset_output: () => {
            clearSuggestions(divOutput);
        }
    };

    document.addEventListener('click', (e) => {
        const target = e.target;
        if (target.tagName !== 'BUTTON' || !target.closest('#popup-content')) {
            return;
        }
        const handler = buttonHandlers[target.id];
        if (handler) {
            handler(target);
        }
    });
}

// inject the content script into the active tab and drive it directly via
// scripting.executeScript({func,args}); avoids the timing race where
// tabs.sendMessage can fire before the content script's onMessage listener
// is registered
async function fillOutForm(userData, apiKey) {
    try {
        const [tab] = await browser.tabs.query({active: true, currentWindow: true});
        await browser.scripting.executeScript({
            target: {tabId: tab.id},
            files: CONTENT_SCRIPT_FILES
        });
        await browser.scripting.executeScript({
            target: {tabId: tab.id},
            func: (msg) => window.fillOutForm(msg),
            args: [{userData, apiKey}]
        });
    } catch (error) {
        setError(`Could not run on this page: ${error.message}`);
    }
}

// show a transient error notice, or clear it when text is empty
function setError(text) {
    const el = document.getElementById('error_msg');
    el.textContent = text;
    el.classList.toggle('hidden', !text);
}

// append an LLM-suggested {label, value} pair to the output list as plain text
function appendSuggestion(outputList, label, value) {
    const dt = document.createElement('dt');
    dt.textContent = label;
    const dd = document.createElement('dd');
    dd.textContent = value;
    outputList.appendChild(dt);
    outputList.appendChild(dd);
}

// read persisted suggestions; ignore any legacy or non-array value
function loadSuggestions() {
    try {
        const stored = JSON.parse(localStorage.getItem(LS_OUTPUT));
        return Array.isArray(stored) ? stored : [];
    } catch (error) {
        return [];
    }
}

function renderSuggestions(outputList) {
    outputList.innerHTML = '';
    suggestions.forEach((s) => appendSuggestion(outputList, s.label, s.value));
}

function clearSuggestions(outputList) {
    suggestions = [];
    localStorage.setItem(LS_OUTPUT, '');
    outputList.innerHTML = '';
}

function processMessage(message) {
    try {
        const msgObj = JSON.parse(message);
        if (msgObj.hasOwnProperty('label')) {
            const suggestion = {label: msgObj.label, value: msgObj.value};
            suggestions.push(suggestion);
            localStorage.setItem(LS_OUTPUT, JSON.stringify(suggestions));
            appendSuggestion(document.getElementById(LS_OUTPUT), suggestion.label, suggestion.value);
        }
    } catch (error) {
        console.warn(`Could not process content of message: ${error}`);
    }
}

// register a listener for communication with the script in the tab
browser.runtime.onMessage.addListener((message) => {
    const progressBar = document.getElementById('progress_bar');
    switch (message.state) {
        case ST_RUNNING:
            progressBar.style.display = 'inline-block';
            document.getElementById('debug_msg').innerText = message.message;
            break;
        case ST_DONE:
            progressBar.style.display = 'none';
            break;
        case ST_PROBLEM:
            progressBar.style.display = 'none';
            setError(message.message);
            break;
        default:
            processMessage(message.message);
            break;
    }
});

document.addEventListener('DOMContentLoaded', listenForClicks);
