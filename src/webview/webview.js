//// @ts-check

// This script will be run within the webview itself
// It cannot access the main VS Code APIs directly.
(function () {
    const vscode = acquireVsCodeApi();
    const panel = document.querySelector('meta[name="panel-type"]')?.content
    const elementId = document.querySelector('meta[name="element-id"]')?.content    

    document.getElementById('close-button')?.addEventListener('click', () => {
        onButtonClicked("close");
    });
    
    document.getElementById('reopen-button')?.addEventListener('click', () => {
        onButtonClicked("reopen");
    });
    
    document.getElementById('show-issue-button')?.addEventListener('click', () => {
        onButtonClicked("show-issue");
    });

    document.getElementById('mark-notif-read-button')?.addEventListener('click', () => {
        onButtonClicked("mark-notif-read");
    });

    document.getElementById('new-issue-button')?.addEventListener('click', () => {
        let elt_title = document.getElementById("newpost-textfield-title");
        let elt_body = document.getElementById("newpost-textarea");
        let title = elt_title?.value;
        let body = elt_body?.value;
        onButtonClicked("new-issue", {
            title: title, 
            body: body
        });

        elt_title.value = '';
        elt_body.value = '';

        vscode.postMessage({
            type: "alert", 
            text: "Issue created"
        });
    });

    document.getElementById('comment-button')?.addEventListener('click', () => {
        let text = document.getElementById("newpost-textarea")?.value;
        if(text && text !== "")
        {
            onButtonClicked("comment", {
                    id: elementId,
                    body: text
                }
            );
        }
        else
        {
            console.warn("Empty content in textarea");
        }
    });

    function onButtonClicked(action, args) {
        let message = { type: 'gitea-action', panel: panel, action: action, args: args}
        console.log("Posting message : ", message)
        vscode.postMessage(message);
    }
    
}());