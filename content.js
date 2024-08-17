let dragAndDropSuccess=false;
document.addEventListener("contextmenu",(e=>
    chrome.runtime.sendMessage({lastClientX:e.screenX,lastClientY:e.screenY})
)),
document.addEventListener("dragend",(e=>{
    dragAndDropSuccess || chrome.runtime.sendMessage({
        type:"openUrl", link: e.target.href ?? e.target.src, 
        dx:e.clientX, dy:e.clientY,
        selectedText:window.getSelection().toString().trim()
    })})),
document.addEventListener("drop",(e=>{
    dragAndDropSuccess=true, setTimeout((function(){dragAndDropSuccess=false}),200)
}));