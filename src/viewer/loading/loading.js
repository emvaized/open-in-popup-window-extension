const targetUrl = new URLSearchParams(window.location.search).get('url');

if (targetUrl) {
    requestAnimationFrame(() => {
        try {
            window.location.replace(targetUrl);
        } catch(e){
            const loadingIndicator = document.getElementById('loadingIndicator'); 
            const errorText = document.getElementById('errorText');
            loadingIndicator.hidden = true;
            errorText.hidden = false;
            errorText.innerText = e.toString().replace('TypeError: Location.replace: ', '');
        }
    });
}

/// set timeout for simple websites to load without spinner showing up
// setTimeout(function(){
//     const loadingIndicator = document.getElementById('loadingIndicator');
//     if (loadingIndicator) loadingIndicator.hidden = false;
// }, 50);