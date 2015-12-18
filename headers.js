/*! jQuery visible 1.0.0 teamdf.com/jquery-plugins | teamdf.com/jquery-plugins/license */
(function(d) {
  d.fn.visible = function(e, i) {
    var a = d(this).eq(0),
      f = a.get(0),
      c = d(window),
      g = c.scrollTop();
    c = g + c.height();
    var b = a.offset().top,
      h = b + a.height();
    a = e === true ? h : b;
    b = e === true ? b : h;
    return !!(i === true ? f.offsetWidth * f.offsetHeight : true) && b <= c && a >= g
  }
})(jQuery);


function injectScript(tabId) {
  chrome.tabs.executeScript(tabId, {
    file: "onclick.js",
    allFrames: true
  });
  $("#saveButton").click(function() {
    save();
  })
  $("#playButton").click(function() {
    replay();
  })
}

var tabId = parseInt(window.location.search.substring(1));

window.addEventListener("load", function() {
  chrome.debugger.sendCommand({
    tabId: tabId
  }, "Network.enable");
  chrome.debugger.onEvent.addListener(onEvent);
  injectScript(tabId);
});

window.addEventListener("unload", function() {
  chrome.debugger.detach({
    tabId: tabId
  });
});

chrome.tabs.onUpdated.addListener(function(tid, changeInfo, tab) {
  if (tid == tabId) {
    injectScript(tabId);
  }
});

$.fn.isOnScreen = function() {
  var win = $(window);

  var viewport = {
    top: win.scrollTop(),
    left: win.scrollLeft()
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
  if (scroll) {
    $(window).scrollTop($('#end').offset().top);
  }
}


chrome.runtime.onConnect.addListener(function(port) {
  if (port.name == 'cssevent') {
    port.onMessage.addListener(function(msg) {
      var el = $('<div class="css" />');
      el.text('CLICK    ' + msg);
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


  window.requestHistory = window.requestHistory || [];
  if (params.request) {


    console.log(params)

    window.requestHistory.push({
      request: _.clone(params.request),
      timestamp: Date.now()
    });

  }
  if (message == "Network.requestWillBeSent") {
    var id = 'header' + String(params.requestId).replace(/\./, '_');
    var el = $('#' + id);
    if (!el.length) {
      el = $(
        '<div id="' + id + '" class="header">' +
        '<div class="url" />' +
        '<div class="content">' +
        '<div class="request" />' +
        '<div class="response" />' +
        '</div>' +
        '</div>');
      if (params.request.method.length == 3) {
        method = params.request.method + ' ';
      } else {
        method = params.request.method;
      }
      var url = el.find('.url');
      url.click(function() {
        el.toggleClass('visible');
      });
      el.find('.url').text('... ' + method + ' ' + params.request.url);
      el.appendTo($('#container'));
    }

    var scroll = checkScroll()
    var req = el.find('.request');
    req.text(params.request.method + " " + parseURL(params.request.url).path + " HTTP/1.1");
    doScroll(scroll);


    if (params.redirectResponse) {
      appendResponse(el, params.redirectResponse, params.request.postData);
    } else {
      postData[id] = params.request.postData;
    }
  } else
  if (message == "Network.responseReceived") {
    var id = 'header' + String(params.requestId).replace(/\./, '_');
    var el = $('#' + id);
    appendResponse(el, params.response, postData[id]);
    delete postData[id]
  }
}

ignore = {};

function appendResponse(el, response, data) {
  if (ignore[el.id]) {
    return;
  }

  var scroll = checkScroll()

  var s = String(response.status).replace(/\s/g, '');
  if (s == '0') {
    ignore[el.id] = true;
  }
  while (s.length < 3) {
    s = ' ' + s;
  }
  var url = el.find('.url');
  url.text(s + url.text().replace(/^\.+/, ''));

  var req = el.find('.request');
  req.text(req.text() + '\n' + formatHeaders(response.requestHeaders));
  if (data) {
    if ((response.requestHeaders['Content-Type'] || response.requestHeaders['content-type']) == 'application/x-www-form-urlencoded') {
      var d = data.split('&');
      data = [];
      for (var i in d) {
        var e = d[i].split('=', 2);
        data.push('"' + e[0] + '": "' + e[1] + '",');
      }
      req.text(req.text() + '\n\n' + data.join("\n").replace(/,$/, ''));
    } else {
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
    switch (name.toLowerCase()) {
      case 'accept':
      case 'accept-encoding':
      case 'accept-language':
      case 'cache-control':
      case 'connection':
      case 'user-agent':
      case 'if-modified-since':
      case 'date':
      case 'expires':
      case 'last-modified':
      case 'age':
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

function save() {
  var data = window.requestHistory;
  var json = JSON.stringify(data);
  var blob = new Blob([json], {
    type: "application/json"
  });
  var url = URL.createObjectURL(blob);

  var a = document.createElement('a');
  a.download = "backup.json";
  a.href = url;
  a.textContent = "Download backup.json";
  $("#end").html(a);
}

function replay() {
  var numOfReplays = $("#numOfReplays").val();

  var tasks = _.clone(window.requestHistory);
  if (!tasks || tasks.length == 0) {
    alert("No history found!");
    return;
  }
  var initTime = tasks[0].timestamp;
  var diffTime = initTime - tasks[0].timestamp;
  var duration = tasks[tasks.length - 1].timestamp - tasks[0].timestamp;

  var replayRun = function() {
    for (var i = 0; i < tasks.length; i++) {
      var task = tasks[i];
      console.log(task.reuqest)
      if (task.request.method == "POST")
        task.request.data = task.request.data || task.request.postData;

      window.setTimeout(function(task) {
        task.request.headers["Origin"] = undefined;
        task.request.headers["Referer"] = undefined;
        task.request.headers["User-Agent"] = undefined;
        console.log("ajaxing " + task.request.method + " to " + task.request.url);
        $.ajax(task.request);
      }, task.timestamp - initTime, task);



    }
  }

  for (var t = 0; t < numOfReplays; t++) {
    alert("delay" + t * duration)

    window.setTimeout(replayRun, t * duration);
  }


}
