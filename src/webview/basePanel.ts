import * as vscode from 'vscode';
import { getUri, getNonce } from './utils';
// import { Config } from '../config';

export abstract class BasePanel {
    protected readonly _panel: vscode.WebviewPanel;
	protected readonly _extensionUri: vscode.Uri;

    public notify_update: boolean;

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
        this._panel = panel;
		this._extensionUri = extensionUri;
        this.notify_update = false;
    }
    
    protected async get_default_html(webview: vscode.Webview) : Promise<string> {
		// Local path to css styles and Uri to load styles into webview
		const stylesPostUri = getUri(webview, this._extensionUri, ['resources', 'css', 'main_style.css']);
        const nonce = getNonce();

        this._panel.title = "Gitea";
        return `<!DOCTYPE html>
        <html lang="en">
            <head>
                <meta charset="UTF-8">
                <meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src ${webview.cspSource}; img-src ${webview.cspSource} https:; script-src 'nonce-${nonce}';">
                <meta name="viewport" content="width=device-width, initial-scale=1.0">	
                <link href="${stylesPostUri}" rel="stylesheet">
                <title>Gitea</title>
            </head>
            <body id="webview-body">
                <h3>Select a notification or an issue.</h3>
            </body>
        </html>`;
    }

    /*
    // TEST LOCAL
    protected get_default_html(webview: vscode.Webview) : string {        
        // const config = new Config();
        
        // Use a nonce to only allow specific scripts to be run
        const nonce = getNonce();
        // toolkit
        const toolkitUri = getUri(webview, this._extensionUri, ["node_modules", "@vscode", "webview-ui-toolkit", "dist", "toolkit.js"]);
        // Local path to main script run in the webview and the uri we use to load this script in the webview
		const scriptUri = getUri(webview, this._extensionUri, ['src', 'webview', 'webview.js']);
		// Local path to css styles and Uri to load styles into webview
		const stylesPostUri = getUri(webview, this._extensionUri, ['resources', 'css', 'main_style.css']);

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
                ${this.get_meta_html("new-issue", "New issue", 0)}
                <script nonce="${nonce}" type="module" src="${toolkitUri}"></script>
                <script nonce="${nonce}" type="module" src="${scriptUri}"></script>
				<link href="${stylesPostUri}" rel="stylesheet">
			</head>
			<body id="webview-body">
                <div class="posts-list-container">
                    <div class="title-container">
                        <h1 class="title-clickable-link"><a href="https://git.ct2mc.cmdl.pro/KARTOSAMPLER/soft-kartosampler-ihm-prep">MonTitreDeRepository</a></h1>
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
    */

    protected get_meta_html(paneltype: string, label: string, index: number) : string {
        return `
            <title>Gitea : ${label}</title>
            <meta name="panel-type" content="${paneltype}"/>
            <meta name="element-id" content="${index}"/>`;
    }

    abstract get_html(webview: vscode.Webview, elt?: vscode.TreeItem) : Promise<string>;
    abstract get_markdown(elt: vscode.TreeItem) : string;
    abstract onDidMsg(action: string, args: any) : void;
    abstract update() : Promise<void>;
}