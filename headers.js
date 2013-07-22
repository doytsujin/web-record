/*! jQuery visible 1.0.0 teamdf.com/jquery-plugins | teamdf.com/jquery-plugins/license */
(function(d){d.fn.visible=function(e,i){var a=d(this).eq(0),f=a.get(0),c=d(window),g=c.scrollTop();c=g+c.height();var b=a.offset().top,h=b+a.height();a=e===true?h:b;b=e===true?b:h;return!!(i===true?f.offsetWidth*f.offsetHeight:true)&&b<=c&&a>=g}})(jQuery);


function injectScript(tabId) {
    chrome.tabs.executeScript(tabId, {
        file: "onclick.js",
        allFrames: true
    });
}


var tabId = parseInt(window.location.search.substring(1));

window.addEventListener("load", function() {
    chrome.debugger.sendCommand({tabId:tabId}, "Network.enable");
    chrome.debugger.onEvent.addListener(onEvent);
    injectScript(tabId);
});

window.addEventListener("unload", function() {
    chrome.debugger.detach({tabId:tabId});
    chrome.tabs.executeScript(tabId, {
        code: "__terminate_tab()",
        allFrames: true
    });
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    injectScript(tabId);
});

$.fn.isOnScreen = function(){
    var win = $(window);
    
    var viewport = {
        top : win.scrollTop(),
        left : win.scrollLeft()
    };
    viewport.right = viewport.left + win.width();
    viewport.bottom = viewport.top + win.height();
    
    var bounds = this.offset();
    bounds.right = bounds.left + this.outerWidth();
    bounds.bottom = bounds.top + this.outerHeight();
    
    return (!(viewport.right < bounds.left || viewport.left > bounds.right || viewport.bottom < bounds.top || viewport.top > bounds.bottom));
    
};

function checkScroll() {
    return $('#end').isOnScreen();
}

function doScroll(scroll) {
    if(scroll) {
        $(window).scrollTop($('#end').offset().top);
    }
}


chrome.runtime.onConnect.addListener(function(port) {
    if(port.name == 'cssevent') {
        port.onMessage.addListener(function(msg) {
            var el = $('<div class="css" />');
            el.text('CLICK    '+msg);
            var scroll = checkScroll()
            el.appendTo($('#container'));
            doScroll(scroll);
        });
    }
});


var postData = {};

function onEvent(debuggeeId, message, params) {
    if (tabId != debuggeeId.tabId)
        return;

    if (message == "Network.requestWillBeSent") {
        var id = 'header'+String(params.requestId).replace(/\./, '_');
        var el = $('#'+id);
        if(!el.length) {
            el = $(
                '<div id="'+id+'" class="header">'+
                '<div class="url" />'+
                '<div class="content">'+
                '<div class="request" />'+
                '<div class="response" />'+
                '</div>'+
                '</div>');
            if(params.request.method.length == 3) {
                method = params.request.method+' ';
            }
            else {
                method = params.request.method;
            }
            var url = el.find('.url');
            url.click(function() {
                el.toggleClass('visible');
            });
            el.find('.url').text('... ' + method+' '+params.request.url);
            el.appendTo($('#container'));
        }

        var scroll = checkScroll()
        var req = el.find('.request');
        req.text(params.request.method + " " + parseURL(params.request.url).path + " HTTP/1.1");
        doScroll(scroll);


        if (params.redirectResponse) {
            appendResponse(el, params.redirectResponse, params.request.postData);
        }
        else {
            postData[id] = params.request.postData;
        }
    }
    else if (message == "Network.responseReceived") {
        var id = 'header'+String(params.requestId).replace(/\./, '_');
        var el = $('#'+id);
        appendResponse(el, params.response, postData[id]);
        delete postData[id]
    }
}

function appendResponse(el, response, data) {
    var scroll = checkScroll()

    var s = ''+response.status;
    while(s.length < 3) {
        s = ' '+s;
    }
    var url = el.find('.url');
    url.text(s+url.text().replace(/^\.+/, ''));

    var req = el.find('.request');
    req.text(req.text() + '\n' + formatHeaders(response.requestHeaders));
    if(data) {
        if(response.requestHeaders['Content-Type'] == 'application/x-www-form-urlencoded') {
            var d = data.split('&');
            data = [];
            for(var i in d) {
                var e = d[i].split('=', 2);
                data.push('"'+e[0]+'": "'+e[1]+'",');
            }
            req.text(req.text() + '\n\n' + data.join("\n").replace(/,$/, ''));
        }
        else {
            req.text(req.text() + '\n\n' + data.replace(/[\r\n]+$/, ''));
        }
    }

    var resp = el.find('.response');
    resp.text("\nHTTP/1.1 " + response.status + " " + response.statusText + '\n' + formatHeaders(response.headers));

    doScroll(scroll);
}

function formatHeaders(headers) {
    var text = "";
    for (name in headers) {
        switch(name) {
        case 'Accept':
        case 'Accept-Encoding':
        case 'Accept-Language':
        case 'Cache-Control':
        case 'Connection':
        case 'User-Agent':
        case 'If-Modified-Since':
        case 'Date':
        case 'Expires':
        case 'Last-Modified':
        case 'Age':
            break;
        default:
            text += name + ": " + headers[name] + "\n";
            break;
        }
    }
    return text.replace(/\n$/, '');
}

function parseURL(url) {
    var result = {};
    var match = url.match(
        /^([^:]+):\/\/([^\/:]*)(?::([\d]+))?(?:(\/[^#]*)(?:#(.*))?)?$/i);
    if (!match)
        return result;
    result.scheme = match[1].toLowerCase();
    result.host = match[2];
    result.port = match[3];
    result.path = match[4] || "/";
    result.fragment = match[5];
    return result;
}