import * as vscode from 'vscode';

import { IssueTreeItem, RepositoryTreeItem } from './nodes/issues';
import { NotificationTreeItem } from './nodes/notifications';
import { Config } from './config';
import { Logger } from './logger';
import { RepositoryProvider } from './providers/issuesProvider';
import { NotificationsProvider } from './providers/notificationProvider';
import { GiteaWebViewPanel, getWebviewOptions } from './webview/webview';

//* Issues  

// TODO un panel d'affichage qui s'active
// - [x] Quand on veut afficher une issue ou la modifier (envoyer une commentaire)
// - [ ] Quand on veut créer une issue
// - [ ] Utiliser le générateur de markdown de gitea
// - [x] Quand on veut afficher une notification
// - [x] Quand on veut afficher une issue liée à une notification


export async function activate(context: vscode.ExtensionContext) {
    Logger.init();
    Logger.log('Starting Gitea ...');
    
    const issuesProvider = new RepositoryProvider();
    const notificationsProvider = new NotificationsProvider();

    // Issues
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider("giteaVscode.issues", issuesProvider),
        vscode.commands.registerCommand('giteaVscode.refreshIssues', () => {
            issuesProvider.refresh();
        }),
        // vscode.commands.registerCommand('giteaVscode.newIssue', (repo: RepositoryTreeItem) => {
        //     vscode.env.openExternal(vscode.Uri.parse(repo.base_url+'/issues/new'));
        // }),
        vscode.commands.registerCommand('giteaVscode.openIssue', (issue: IssueTreeItem) => {
            return issuesProvider.setIssueState(issue, "open").then(() => {
                Logger.log(`Updated issuesProvider (open issue  ${issue.content.number})`);
            });
        }),
        vscode.commands.registerCommand('giteaVscode.closeIssue', (issue: IssueTreeItem) => {
            return issuesProvider.setIssueState(issue, "closed").then(() => {
                Logger.log(`Updated issuesProvider (close issue ${issue.content.number})`);
                // issuesProvider.onDidChangeTreeData.fire
            });
        }),
        vscode.commands.registerCommand('giteaVscode.commentIssue', (issue: IssueTreeItem, text: string) => {
            return issuesProvider.addCommentToIssue(issue, text);
        }),
        // Unused
        // vscode.commands.registerCommand('giteaVscode.toogleIssue', (issue: IssueTreeItem) => {
        //     Logger.log("reopen or close issue " + issue.content.id);
        //     vscode.env.openExternal(vscode.Uri.parse(issue.content.url)); // TODO use API with a web view
        // }),
        vscode.commands.registerCommand('giteaVscode.openRepoInBrowser', (elt: RepositoryTreeItem | IssueTreeItem) => {
            if (elt instanceof RepositoryTreeItem) {
                vscode.env.openExternal(vscode.Uri.parse(elt.base_url));
            }
            else if (elt instanceof IssueTreeItem) {
                vscode.env.openExternal(vscode.Uri.parse(elt.content.html_url));
            }
        })
    );

    // Notifications
    context.subscriptions.push(
        vscode.window.registerTreeDataProvider("giteaVscode.notifications", notificationsProvider),        
        vscode.commands.registerCommand('giteaVscode.refreshNotifications', () => {
            notificationsProvider.refresh();
        }),
        vscode.commands.registerCommand('giteaVscode.openNotifInBrowser', (elt: NotificationTreeItem) => {
            vscode.env.openExternal(vscode.Uri.parse(elt.content.url));
        }),
        vscode.commands.registerCommand('giteaVscode.markNotifAsRead', (elt: NotificationTreeItem) => {
            notificationsProvider.markAsRead(elt);
        })
    );

    // Webview
    context.subscriptions.push(
        vscode.commands.registerCommand('giteaVscode.showIssue', (owner_name: string, repo_name: string, issue_id: number) => {
            GiteaWebViewPanel.createOrShow(context.extensionUri, issuesProvider.getIssue(owner_name, repo_name, issue_id));
        }),
        vscode.commands.registerCommand('giteaVscode.showNotification', (notification_id: number) => {
            GiteaWebViewPanel.createOrShow(context.extensionUri, notificationsProvider.getNotification(notification_id));
        }),
        vscode.commands.registerCommand('giteaVscode.newIssue', (owner_name: string, repo_name: string) => {
            GiteaWebViewPanel.createOrShow(context.extensionUri, issuesProvider.getRepo(owner_name, repo_name));
        })
        // vscode.commands.registerCommand('giteaVscode.showPullRequest', () => {
        //     GiteaWebViewPanel.createOrShow(context.extensionUri, repositoryProvider);
        // })
    );

    if (vscode.window.registerWebviewPanelSerializer) {
		// Make sure we register a serializer in activation event
		vscode.window.registerWebviewPanelSerializer(GiteaWebViewPanel.viewType, {
			async deserializeWebviewPanel(webviewPanel: vscode.WebviewPanel, state: any) {
				console.log(`Got state: ${state}`);
				// Reset the webview options so we use latest uri for `localResourceRoots`.
				webviewPanel.webview.options = getWebviewOptions(context.extensionUri);
				GiteaWebViewPanel.revive(webviewPanel, context.extensionUri);
			}
		});
    }
    
    Logger.log('Gitea is ready');

    issuesProvider.refresh();
    await notificationsProvider.refresh();

    notificationsProvider.autorefresh();
}

export function deactivate() {}
