document.addEventListener("contextmenu", function (e) {
    const el = document.elementFromPoint(e.screenX, e.screenY);
    chrome.runtime.sendMessage({ lastClientX: e.screenX, lastClientY: e.screenY, clientHeight: el.clientHeight, clientWidth: el.clientWidth});
});