document.addEventListener("contextmenu",(e=>sendBackgroundRequest(e)));
document.addEventListener("dragend",(e=>{
    if (e.dataTransfer.dropEffect == 'none') sendBackgroundRequest(e, true)
}));

function sendBackgroundRequest(e, isViewer){
    const t = e.target,
    toolbarHeight = window.outerHeight - window.innerHeight,
    toolbarWidth = window.outerWidth - window.innerWidth,
    message = {
        lastClientX: e.screenX, lastClientY: e.screenY,
        selectedText: window.getSelection().toString().trim(), 
        clientHeight: t.naturalHeight ?? t.clientHeight,
        clientWidth: t.naturalWidth ?? t.clientWidth,
        toolbarHeight: toolbarHeight, toolbarWidth: toolbarWidth
    }
    if (isViewer) {
        message['nodeName'] = t.nodeName;
        message['link'] = t.href ?? t.src;
    }
    chrome.runtime.sendMessage(message)
}