import * as vscode from 'vscode';
import { NotificationTreeItem } from '../nodes/notifications';
import { IssueTreeItem, RepositoryTreeItem } from '../nodes/issues';
import { IssuePanel, NewIssuePanel } from './issuePanel';
import { NotificationPanel } from './notificationPanel';

export function getWebviewOptions(extensionUri: vscode.Uri): vscode.WebviewOptions {
	return {
		// Enable javascript in the webview
		enableScripts: true,
        enableForms: true,

		// And restrict the webview to only loading content from our extension's `media` directory.
		// localResourceRoots: [
        //     vscode.Uri.joinPath(extensionUri, 'media'), 
        //     vscode.Uri.joinPath(extensionUri, 'resources'),
        //     vscode.Uri.joinPath(extensionUri, "node_modules", "@vscode", "webview-ui-toolkit")
        // ]
	};
}

export class PullRequestPanel {
    private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;

    public static panelName: string = "pullRequestPanel";

    constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;
		this._extensionUri = extensionUri;
    }

    public update(){
        const webview = this._panel.webview;
        this._panel.title = "Gitea Pull Requests";
		this._panel.webview.html = this.get_html(webview);
    }

	private get_html(webview: vscode.Webview) : string {   
        return `<!DOCTYPE html>
        <html lang="en">
            <head>
            </head>
            <body>
                DEFAULT VIEW
            </body>
        </html>`;
    }
}

export class GiteaWebViewPanel {

	public static currentPanel: GiteaWebViewPanel | undefined;
	public static readonly viewType = 'giteaWebViewPanel';
    public static readonly panel_name: string = 'Gitea Vscode';

	private readonly _panel: vscode.WebviewPanel;
	private readonly _extensionUri: vscode.Uri;
    private _disposables: vscode.Disposable[] = [];

    public issuePanel: IssuePanel;
    public newIssuePanel: NewIssuePanel;
    public notificationPanel: NotificationPanel;
    public pullRequestPanel: PullRequestPanel;

    private activePanelName: string;

    public static createOrShow(extensionUri: vscode.Uri, elt? : NotificationTreeItem | IssueTreeItem | RepositoryTreeItem) : GiteaWebViewPanel {
        const column = vscode.window.activeTextEditor
			? vscode.window.activeTextEditor.viewColumn
			: undefined;
        
        // let panelName = GiteaWebViewPanel.getPanelNameFromData(elt);

		// If we already have a panel, show it.
		if (GiteaWebViewPanel.currentPanel) {
            GiteaWebViewPanel.currentPanel._update(elt);
			GiteaWebViewPanel.currentPanel._panel.reveal(column);
			return GiteaWebViewPanel.currentPanel;
		}

		// Otherwise, create a new panel.
		const panel = vscode.window.createWebviewPanel(
			GiteaWebViewPanel.viewType,
			GiteaWebViewPanel.panel_name,
			column || vscode.ViewColumn.One,
			getWebviewOptions(extensionUri),
		);

		GiteaWebViewPanel.currentPanel = new GiteaWebViewPanel(panel, extensionUri, elt);
        return GiteaWebViewPanel.currentPanel;
	}

	public static revive(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		GiteaWebViewPanel.currentPanel = new GiteaWebViewPanel(panel, extensionUri);
	}

    private getPanel(panelName: string): IssuePanel | NotificationPanel | PullRequestPanel | NewIssuePanel
    {
        if(panelName === IssuePanel.panelName)
        {
            return this.issuePanel;
        }
        if(panelName === NotificationPanel.panelName)
        {
            return this.notificationPanel;
        }
        if(panelName === NewIssuePanel.panelName)
        {
            return this.newIssuePanel;
        }
        return this.issuePanel;
    }

    private static getPanelNameFromData(data?: NotificationTreeItem | IssueTreeItem | RepositoryTreeItem): string
    {
        if(data instanceof IssueTreeItem)
        {
            return IssuePanel.panelName;
        }
        if(data instanceof NotificationTreeItem)
        {
            return NotificationPanel.panelName;
        }
        if(data instanceof RepositoryTreeItem)
        {
            return NewIssuePanel.panelName;
        }
        return "undefined";
    }

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri, data?: NotificationTreeItem | IssueTreeItem | RepositoryTreeItem) {
		this._panel = panel;
		this._extensionUri = extensionUri;
        
        // Create panels
        if (data) {
            this.activePanelName = GiteaWebViewPanel.getPanelNameFromData(data);
        } else {
            this.activePanelName = NewIssuePanel.panelName;
        }

        this.notificationPanel = new NotificationPanel(this._panel, this._extensionUri);
        this.issuePanel = new IssuePanel(this._panel, this._extensionUri);
        this.pullRequestPanel = new PullRequestPanel(this._panel, this._extensionUri);
        this.newIssuePanel = new NewIssuePanel(this._panel, this._extensionUri);

        //? Note : retainContextWhenHidden est possiblement utilisable

		// Set the webview's initial html content
		this._update(data);

		// Listen for when the panel is disposed
		// This happens when the user closes the panel or when the panel is closed programmatically
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);

		// Update the content based on view changes
		this._panel.onDidChangeViewState(
			e => {
				if (this._panel.visible) {
					this._update();
				}
			},
			null,
			this._disposables
		);

		// Handle messages from the webview
		this._panel.webview.onDidReceiveMessage(
			message => {
				switch (message.type) {
					case 'alert':
						vscode.window.showErrorMessage(message.text);
						return;
                    case 'gitea-action':
                        // if(message.action === "openurl") {
                        //     vscode.env.openExternal(vscode.Uri.parse(message.args));
                        //     break;
                        // }
                        switch(message.panel) {
                            case 'issue':
                                this.issuePanel.onDidMsg(message.action, message.args);
                                break;
                            case 'new-issue':
                                this.newIssuePanel.onDidMsg();
                                break;
                            case 'notification':
                                this.notificationPanel.onDidMsg(message.action, message.args);
                                break;
                        }
                        return;
                    default:
                        console.log(message);
				}

                // this._update(this.activePanel);
                // Com retour vers la view pour qu'elle change son état de css / hidden ?
			},
			null,
			this._disposables
		);
	}

	public dispose() {
		GiteaWebViewPanel.currentPanel = undefined;

		// Clean up our resources
		this._panel.dispose();

		while (this._disposables.length) {
			const x = this._disposables.pop();
			if (x) {
				x.dispose();
			}
		}
	}

	private _update(data? : NotificationTreeItem | IssueTreeItem | RepositoryTreeItem) {
        if (data === undefined)
        {
            this.getPanel(this.activePanelName).update();
        }

        if (data instanceof IssueTreeItem)
        {
            this.issuePanel.update(data);
            return;
        }
        else if (data instanceof NotificationTreeItem)
        {
            this.notificationPanel.update(data);
            return;
        }
        else if (data instanceof RepositoryTreeItem)
        {
            this.newIssuePanel.update(data);
            return;
        }
	}
}