window.onerror =  function(message, source, lineno, colno, error) {
  alert(message + "\r\n" + source + "\r\n" + lineno + "\r\n" + colno);
}
window.addEventListener("DOMNodeInserted", function (e) {
  var a = e.srcElement;
  if (a.tagName == 'SCRIPT') {
    a.setAttribute("crossorigin", "anonymous");
  }
}, false);
