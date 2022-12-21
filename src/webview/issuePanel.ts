import * as vscode from 'vscode';
import { Config } from '../config';
import { BasePanel } from './basePanel';
import { IssueTreeItem, RepositoryTreeItem } from '../nodes/issues';
import { CommentTreeItem } from '../nodes/comment';
import { getUri, getNonce, markdown_render } from './utils';

export function getBadges(issue: IssueTreeItem) {
    return issue.content.labels.map(label => {
        return '![' + label.name + '](https://img.shields.io/badge/' + label.name + '-' + label.color + '.svg)'
    }).join(', ');
}

export function getAssignee(issue: IssueTreeItem) {
    if(issue.content.assignees === null || issue.content.assignees.length === 0) {
        return "None";
    }
    return issue.content.assignees.map(assignee => { 
        return assignee.login; 
    }).join(', ');
}

export class NewIssuePanel extends BasePanel {
    public static panelName: string = "newIssuePanel";
    
    public activeRepository?: RepositoryTreeItem; 

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri);
    }

    public update(repo?: RepositoryTreeItem) {
        const webview = this._panel.webview;
        this._panel.title = "Gitea New issue";

        if (repo) {
            this.activeRepository = repo;
        }
		this._panel.webview.html = this.get_html(webview);
    }

    public get_markdown() : string {
        return "NOT IMPLEMENTED";
    }

    private _get_meta_html() : string {
        return this.get_meta_html("new-issue", "New issue", 0);
    }

	public get_html(webview: vscode.Webview) {
        if(this.activeRepository === undefined) {
            return this.get_default_html(webview);
        }
        
        const config = new Config();
        if(config.render === 'md') {
            return markdown_render(this.get_markdown());
        }
        
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        // toolkit
        const toolkitUri = getUri(webview, this._extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
        // Local path to main script run in the webview and the uri we use to load this script in the webview
		const scriptUri = getUri(webview, this._extensionUri, ['resources', 'js', 'webview.js']);
		// Local path to css styles and Uri to load styles into webview
		const stylesPostUri = getUri(webview, this._extensionUri, ['resources', 'css', 'main_style.css']);

        /**
         * Note : les boutons envoient des messages à vscode 
         * https://github.com/microsoft/vscode-extension-samples/blob/main/webview-view-sample/media/main.js
         * Ces messages sont ensuite traités par onDidReceiveMessage()
         */

        this._panel.title = `Gitea : new issue`;
		const html = `<!DOCTYPE html>
        <html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
                -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${this._get_meta_html()}
                <script nonce="${nonce}" type="module" src="${toolkitUri}"></script>
                <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
				<link href="${stylesPostUri}" rel="stylesheet">
			</head>
			<body id="webview-body">
                <div class="posts-list-container">
                    <div class="title-container">
                        <h1 class="title-clickable-link"><a href="${this.activeRepository.base_url}">${this.activeRepository.owner}/${this.activeRepository.label}</a></h1>
                        <h3>Nouvelle issue</h3>
                    </div>
                    <div class="posts-list">
                        <div class="newpost-container">
                            <vscode-text-field class="newpost-content" id="newpost-textfield-title">Title</vscode-text-field>
                            <vscode-panels>
                                <vscode-panel-tab  id="tab-1">Write</vscode-panel-tab>
                                <vscode-panel-view class="vscode-panel-borderless" id="view-1">
                                    <vscode-text-area class="newpost-content" id="newpost-textarea" resize="vertical" rows="10"></vscode-text-area>
                                </vscode-panel-view>
                            </vscode-panels>
                            <div class="post-toolbar-container">
                                <vscode-button class="new-issue-button" id="new-issue-button">
                                    New issue
                                </vscode-button>
                            </div>
                        </div>
                    </div>
                </div>

            </body>
        </html>`;

        return html;
	}

    public onDidMsg(action: string, args: any) {
        switch(action) {
            case 'new-issue':
                if(this.activeRepository && args.title !== undefined && args.body !== undefined) {
                    vscode.commands.executeCommand("giteaVscode.newIssueCreate", 
                        this.activeRepository.owner, 
                        this.activeRepository.label, 
                        args.title, args.body
                    ).then(() => {
                        this.update(); 
                    });
                }
                break;
        }
    }
}

export class IssuePanel extends BasePanel {
    public static panelName: string = "issuePanel";
    public activeIssue?: IssueTreeItem;

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        super(panel, extensionUri);
    }

    public update(issue? : IssueTreeItem) {
        const webview = this._panel.webview;
        this._panel.title = "Gitea Issues";

        if (issue)
        {
            this.activeIssue = issue;
        }
		this._panel.webview.html = this.get_html(webview, this.activeIssue);
    }

    private get_header_html(issue : IssueTreeItem) {
        return `
        <div class="title-container">
            <h1>${issue.label}</h1>
            <table>
                <tr>
                    <td><b>State</b></td><td>: ${issue.content.state}</td>
                </tr>
                <tr>
                    <td><b>Author</b></td><td>: ${issue.content.user.login}</td>
                </tr>
                <tr>
                    <td><b>Assignees</b></td><td>: ${getAssignee(issue)}</td>
                </tr>
                <tr>
                    <td><b>Labels</b></td><td>${markdown_render(": " + getBadges(issue))}</td>
                </tr>
            </table>
            <a href=${issue.content.html_url}>View in browser</a>
        </div>`;
    }

    private get_first_post_html(issue : IssueTreeItem) {
        return `
        <div class="post-container">
            <div class="post-header">
                <b>${issue.content.user.login}</b> - <i>${new Date(issue.content.created_at).toLocaleString()}</i>
            </div>
            <div class="post-body">
                ${markdown_render(issue.content.body)}
            </div>
        </div>
        `;
    }

    private get_posts_html(issue : IssueTreeItem) {
        let posts = ``;
        issue.comments.forEach((comment: CommentTreeItem) => {
            let post = `     
            <div class="post-container">
                <div class="post-header">
                    <b>${comment.content.user.login}</b> - <i>${new Date(comment.content.created_at).toLocaleString()}</i>
                </div>
                <div class="post-body">
                    ${markdown_render(comment.content.body)}
                </div>
            </div>
            `;
            posts = posts + post;
        });
        return posts;
    }

    private _get_meta_html(issue: IssueTreeItem) : string {
        return this.get_meta_html("issue", issue.label, issue.content.number);
    }

    public get_markdown(issue: IssueTreeItem) : string {
        return "NOT IMPLEMENTED";
    }

	public get_html(webview: vscode.Webview, issue? : IssueTreeItem) : string {
        if(issue === undefined) {
            return this.get_default_html(webview);
        }
        
        const config = new Config();
        if(config.render === 'md') {
            return markdown_render(this.get_markdown(issue));
        }
        
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        // toolkit
        const toolkitUri = getUri(webview, this._extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
        // Local path to main script run in the webview and the uri we use to load this script in the webview
		const scriptUri = getUri(webview, this._extensionUri, ['resources', 'js', 'webview.js']);
		// Local path to css styles and Uri to load styles into webview
		const stylesPostUri = getUri(webview, this._extensionUri, ['resources', 'css', 'main_style.css']);

        /**
         * Note : les boutons envoient des messages à vscode 
         * https://github.com/microsoft/vscode-extension-samples/blob/main/webview-view-sample/media/main.js
         * Ces messages sont ensuite traités par onDidReceiveMessage()
         */

        let button_str: string;
        if (issue.content.state === "closed")
        {
            button_str = "Reopen";
        }
        else {
            button_str = "Close";
        }

        this._panel.title = `Gitea : ${issue.label}`;
		const html = `<!DOCTYPE html>
        <html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
                -->
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
                ${this._get_meta_html(issue)}
                <script nonce="${nonce}" type="module" src="${toolkitUri}"></script>
                <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
				<link href="${stylesPostUri}" rel="stylesheet">
			</head>
			<body id="webview-body">
                ${this.get_header_html(issue)}
                <div class="posts-list-container">
                    <div class="posts-list-timeline"></div>
                    <div class="posts-list">
                        ${this.get_first_post_html(issue)}
                        ${this.get_posts_html(issue)}
                        <div class="newpost-container">
                            <vscode-panels>
                                <vscode-panel-tab  id="tab-1">Write</vscode-panel-tab>
                                <!-- <vscode-panel-tab  id="tab-2">View</vscode-panel-tab> -->
                                <vscode-panel-view id="view-1">
                                    <section class="newpost-content">
                                        <vscode-text-area id="newpost-textarea" resize="vertical" rows="10"></vscode-text-area>
                                    </section>
                                </vscode-panel-view>
                                <!-- <vscode-panel-view id="view-2">
                                    <section class="newpost-content">
                                        TODO
                                    </section>
                                </vscode-panel-view> -->
                            </vscode-panels>
                            <div class="post-toolbar-container">
                                <vscode-button class="${button_str.toLowerCase()}-button" id="${button_str.toLowerCase()}-button">
                                    ${button_str} issue
                                </vscode-button>
                                <vscode-button class="comment-button" id="comment-button">
                                    New comment
                                </vscode-button>
                            </div>
                        </div>
                    </div>
                </div>
            </body>
        </html>`;

        return html;
	}

    public onDidMsg(action: string, args: any) {
        switch(action) {
            case 'close':
                if(this.activeIssue && this.activeIssue.content.state === "open") {
                    vscode.commands.executeCommand("giteaVscode.closeIssue", this.activeIssue).then(() => { 
                        if(this.activeIssue){this.activeIssue.content.state = "closed";}
                        this.update(); 
                    });
                }
                break;
            case 'reopen':
                if(this.activeIssue && this.activeIssue.content.state === "closed") {
                    vscode.commands.executeCommand("giteaVscode.openIssue", this.activeIssue).then(() => { 
                        if(this.activeIssue){this.activeIssue.content.state = "open";}
                        this.update();
                    });
                }
                break;
            case 'comment':
                if(this.activeIssue && args.body !== undefined) {
                    vscode.commands.executeCommand("giteaVscode.commentIssue", this.activeIssue, args.body).then(() => {
                        this.update(); 
                    });
                }
                break;
        }
    }
}
