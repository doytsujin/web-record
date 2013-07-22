var cssPath = function(el) {
    if(el.id) {
        return '#'+el.id;
    }
    var path = [];
    while (el) {
        var selector = el.nodeName.toLowerCase();
        if (el.id) {
            selector += '#' + el.id;
            break;
        }
        if (el.className) {
            c = el.className.replace(/ +/, '.');
            c = '.'+c;
            selector += c.replace(/^\.+/, '.');
        }
        if (el.getAttribute('name')) {
            selector += '[name="'+el.getAttribute('name')+'"]'
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

    var e = document.getElementsByTagName('*');
    for(var k in e) {
        e[k].onclick = function(event) {
            if(!this.ignore_click) {
                if(event.ctrlKey) {
                    event.preventDefault();
                }
                event.stopPropagation();
                port.postMessage(cssPath(this));
            }
        }
    }
}
function __terminate_tab() {
    var e = document.getElementsByTagName('*');
    for(var k in e) {
        e[k].ignore_click = true;
    }

}

__init_tab();
