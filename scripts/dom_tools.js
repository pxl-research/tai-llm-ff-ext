// convert partial DOM to flat JSON list
function domToJson(node, tagFilter, outputList) {
    const tagName = node.tagName.toLowerCase();
    const jsonObj = {
        tag: tagName
    };


    if (node.childNodes.length > 0 && tagName !== 'script') {
        // jsonObj.count = node.childNodes.length;
        const children = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            const child = node.childNodes[i];
            if (child.nodeType === 1) { // process tag nodes
                domToJson(child, tagFilter, outputList);
            } else if (child.nodeType === 3) { // process text nodes
                const text = child.textContent.trim();
                if (text.length > 0) {
                    jsonObj.text = text;
                }
            }
        }
        if (children.length > 0) {
            jsonObj.children = children;
        }
    }

    // we want text nodes and nodes from the filter
    if (jsonObj.text || tagFilter.includes(tagName)) {
        if (node.hasAttribute('type')
            && node.getAttribute('type') === 'hidden') {
            return; // skip this one
        }

        const nodePath = getDomPath(node);

        // store the node path in the DOM for later
        node.setAttribute('path', nodePath);

        jsonObj.path = nodePath;
        outputList.push(jsonObj);
    }
}

// generate a unique path to a DOM element
function getDomPath(node) {
    const path = [];
    let current = node;

    while (current) {
        if (current.tagName) {
            let comp = current.tagName.toLowerCase();

            const parent = current.parentNode;
            if (parent) {
                // add a path index if there are multiple children
                if (parent.children.length > 1) {
                    const idx = getChildIndex(current);
                    if (idx >= 0) {
                        comp = `${comp}:${idx}`;
                    }
                }
            }

            // prepend to the beginning of the array
            path.unshift(comp);
        }
        current = current.parentNode;
    }
    return `/${path.join('/')}`;
}

// return the position of a child in the parent's child list
function getChildIndex(child) {
    const parent = child.parentNode;

    if (parent) {
        const children = parent.children;
        for (let c = 0; c < children.length; c++) {
            if (children[c] === child) {
                return c;
            }
        }
    }

    // there is no parent, or the child could not be found
    return -1;
}