let dragAndDropSuccess;

document.addEventListener("contextmenu",(e=> sendBackgroundRequest(e)));
document.addEventListener("dragend",(e=>{
    if (!dragAndDropSuccess) sendBackgroundRequest(e, true)
}));
document.addEventListener("drop",(e=>{
    dragAndDropSuccess=true, setTimeout((()=>{dragAndDropSuccess=false}),200)
}));

function sendBackgroundRequest(e, isViewer = false){
    const t = e.target
    const toolbarHeight = window.outerHeight - window.innerHeight
    const toolbarWidth = window.outerWidth - window.innerWidth
    const message = {
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