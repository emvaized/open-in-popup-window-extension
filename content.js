document.addEventListener("contextmenu", function (e) {
    const el = document.elementFromPoint(e.clientX, e.clientY);
    chrome.runtime.sendMessage({ lastClientX: e.clientX, lastClientY: e.clientY, clientHeight: el.clientHeight, clientWidth: el.clientWidth});
});