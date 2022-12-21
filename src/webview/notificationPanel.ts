import * as vscode from 'vscode';
import { Config } from '../config';
import { BasePanel } from './basePanel';
import { NotificationTreeItem } from '../nodes/notifications';
import { getUri, getNonce, markdown_render } from './utils';
import { Logger } from '../logger';

export class NotificationPanel extends BasePanel {
    public static panelName: string = "notificationPanel";

    public activeNotification?: NotificationTreeItem;

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri);
    }

    public update(notification? : NotificationTreeItem){
        // Affichage d'une notification
        const webview = this._panel.webview;
        this._panel.title = "Gitea Notifications";

        if (notification)
        {
            this.activeNotification = notification;
        }
        this._panel.webview.html = this.get_html(webview, this.activeNotification);
    }

    private get_post_html(notification : NotificationTreeItem) : string {

        // TODO mettre cette partie dans la création de la notif/commentaire ?
        let action_str = "";
        if (!isNaN(notification.comment_id))
        {
            action_str = "Comment";
        }
        else {
            action_str = notification.notified_action;
        }

        return `
        <h1>${notification.label}</h1>
        <table>
            <tr>
                <td><b>Type</b></td><td>: ${notification.content.subject.type}</td>
            </tr>
            <tr>
                <td><b>State</b></td><td>: ${notification.content.subject.state}</td>
            </tr>
            <tr>
                <td><b>Title</b></td><td>: ${notification.content.subject.title}</td>
            </tr>
            <tr>
                <td><b>Repository</b></td><td>: <a href=${notification.content.repository.html_url}>${notification.content.repository.html_url}</a></td>
            </tr>
            <tr>
                <td><b>Action</b></td><td>: ${action_str}</td>
            </tr>
        </table>
        `;
    }

    private get_comment_html(notification : NotificationTreeItem) : string {
        return `
        <div class="post-header">
            <b>${notification.attached_comment!.content.user.login}</b> - <i>${new Date(notification.attached_comment!.content.created_at).toLocaleString()}</i>
        </div>
        <div class="post-body">
            ${markdown_render(notification.attached_comment!.content.body)}
        </div>
        `;
    }

    private _get_meta_html(notification: NotificationTreeItem) : string {
        return this.get_meta_html("notification", notification.label, notification.content.id);
    }

    public get_markdown(notification : NotificationTreeItem)
    {
        return `# ${notification.label}
        
        - Type : ${notification.content.subject.type}
        - State : ${notification.content.subject.type}
        - Repository : ${notification.content.repository.html_url}
        
        ---
        * [See in browser](${notification.content.url})
        `;
    }

	public get_html(webview: vscode.Webview, notification? : NotificationTreeItem) : string 
    {
        if(notification === undefined) {
            return this.get_default_html(webview);
        }

        const config = new Config();
        if(config.render === 'md') {
            return markdown_render(this.get_markdown(notification));
        }

        // Use a nonce to only allow specific scripts to be run
		const nonce = getNonce();
        // toolkit
        const toolkitUri = getUri(webview, this._extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
        // Local path to main script run in the webview and the uri we use to load this script in the webview
        const scriptUri = getUri(webview, this._extensionUri, ['src', 'webview', 'webview.js']);
        // Local path to css styles and Uri to load styles into webview
		const stylesPostUri = getUri(webview, this._extensionUri, ['resources', 'css', 'main_style.css']);
		
        this._panel.title = `Gitea : ${notification.label}`;
        return `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <!--
                    Use a content security policy to only allow loading images from https or from our extension directory,
                    and only allow scripts that have a specific nonce.
                    -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">	
                ${this._get_meta_html(notification)}
                <script nonce="${nonce}" type="module" src="${toolkitUri}"></script>
                <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
                <link href="${stylesPostUri}" rel="stylesheet">
            </head>
            <body id="webview-body">
                <div class="title-container">
                    ${this.get_post_html(notification)}
                </div>
                <div class="toolbar-container">
                    <vscode-button id="mark-notif-read-button"> Mark as read </vscode-button>   
                    <vscode-button id="show-issue-button"> Show issue </vscode-button>   
                    <a href=${notification.content.subject.html_url} class="hidden-link">
                        <vscode-button> View in browser </vscode-button>
                    </a>
                </div>     
                <div class="post-container">
                    ${this.get_comment_html(notification)}
                </div>
            </body>
        </html>`;

        return "";
    }

    public onDidMsg(action: string, args: any) {
        switch(action) {
            case 'show-issue':
                if(this.activeNotification) {
                    Logger.log(`show issue : ${this.activeNotification.content.subject.html_url}`);
                    
                    const repo_name = this.activeNotification.content.repository.name;
                    const owner_name = this.activeNotification.content.repository.owner.login;
                    
                    let issue_id = -1;                        
                    if(this.activeNotification.content.subject.type === "Issue") {
                        let issue_id_str = this.activeNotification.content.subject.html_url.split('/').at(-1);
                        if (issue_id_str === undefined) {
                            return;
                        }
                        issue_id = parseInt(issue_id_str);
                    } else {
                        return;
                    }
                    vscode.commands.executeCommand("giteaVscode.showIssue", owner_name, repo_name, issue_id);
                }
                break;
            case 'mark-notif-read':
                if(this.activeNotification) {
                    vscode.commands.executeCommand("giteaVscode.markNotifAsRead", this.activeNotification.content.id);
                }
                break;
        }
    }
}