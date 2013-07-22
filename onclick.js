var cssPath = function(el) {
    var path = [];
    while (el && el != document) {
        console.log(el);
        nodeName = el.nodeName.toLowerCase();
        var selector = nodeName;
        if(nodeName == 'body') {
            break;
        }
        if (el.id) {
            selector += '#' + el.id;
            //break;
        }
        if (el.className) {
            c = el.className.replace(/\s+/g, '.');
            c = '.'+c;
            selector += c.replace(/^\.+/, '.');
        }
        try {
            if (el.getAttribute('name')) {
                selector += '[name="'+el.getAttribute('name')+'"]'
            }
        }
        catch(e) {
        }

        if(!el.id && !el.className) {
            var sib = el, nth = 1;
            while (sib.nodeType === Node.ELEMENT_NODE && (sib = sib.previousSibling) && nth++);
            selector += ":nth-child("+nth+")";
        }
        
        path.unshift(selector);
        el = el.parentNode;
    }
    return path.join(" ");
}

function __init_tab() {
    var port = chrome.runtime.connect({name: "cssevent"});
    function onclick(event) {
        if(event.ctrlKey) {
            event.preventDefault();
        }
        port.postMessage(cssPath(event.target));
    }
    document.addEventListener('click', onclick, false);
}

__init_tab();
