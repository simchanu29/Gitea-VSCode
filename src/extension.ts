import * as vscode from 'vscode';

import { markdown_render, showIssueHTML, showIssueMD, showNotificationHTML, showNotificationMD } from './template.issues';
import { IssueTreeItem, RepositoryTreeItem } from './nodes/issues';
import { NotificationTreeItem } from './nodes/notifications';
import { Config } from './config';
import { Logger } from './logger';
import { RepositoryProvider } from './providers/issuesProvider';
import MarkdownIt = require('markdown-it');
import { utimesSync } from 'fs';
import { NotificationsProvider } from './providers/notificationProvider';
import { GiteaWebView } from './webview';

//* Issues  

export function showIssueInWebPanel(issue: IssueTreeItem) {
    const panel = vscode.window.createWebviewPanel(
        'issue',
        issue.label,
        vscode.ViewColumn.Active,
        {
            enableScripts: true
        }
    );

    const config = new Config();

    if(config.render === 'html') {
        panel.webview.html = showIssueHTML(issue);
    } else {
        let markdownIt = new MarkdownIt();
        panel.webview.html = markdown_render(showIssueMD(issue), issue);
    }

    return panel;
}

// TODO un panel d'affichage qui s'active
// - Quand on veut afficher une issue ou la modifier (envoyer une commentaire)
// - Quand on veut créer une issue
// - Quand on veut afficher une notification
// - Quand on veut afficher une issue liée à une notification

export function activate_issues(context: vscode.ExtensionContext) : RepositoryProvider {
    // Array of issues; This is used to determine whether a issue is already open
    // in a tab or not.
    let openIssues: Array<IssueTreeItem> = [];
    let openIssuesWebpanels: Array<vscode.WebviewPanel> = [];
    const repositoryProvider = new RepositoryProvider();
    vscode.window.registerTreeDataProvider("giteaVscode.issues", repositoryProvider);        

    vscode.commands.registerCommand('giteaVscode.showIssue', (issue: IssueTreeItem) => {
        const issueOpenable = openIssues.find((c) => c.content.id === issue.content.id) === undefined;
        if (issueOpenable) {
            const panel = showIssueInWebPanel(issue);
            openIssues.push(issue);
            openIssuesWebpanels.push(panel);
            panel.onDidDispose((event) => {
                openIssues.splice(openIssues.indexOf(issue), 1);
                openIssuesWebpanels.splice(openIssuesWebpanels.indexOf(panel), 1);
            });
        } 
        else {
            const openPanel = openIssuesWebpanels.find((c) => c.title === issue.label);
            openPanel?.reveal();
        }
    });

    vscode.commands.registerCommand('giteaVscode.refreshIssues', () => {
        repositoryProvider.refresh();
    });

    vscode.commands.registerCommand('giteaVscode.openIssue', (repo: RepositoryTreeItem) => {
        vscode.env.openExternal(vscode.Uri.parse(repo.base_url+'/issues/new'));
    });

    // Unused
    vscode.commands.registerCommand('giteaVscode.toogleIssue', (issue: IssueTreeItem) => {
        Logger.log("reopen or close issue " + issue.content.id);
        vscode.env.openExternal(vscode.Uri.parse(issue.content.url)); // TODO use API with a web view
    });

    vscode.commands.registerCommand('giteaVscode.openRepoInBrowser', (elt: RepositoryTreeItem | IssueTreeItem) => {
        if (elt instanceof RepositoryTreeItem) {
            vscode.env.openExternal(vscode.Uri.parse(elt.issue_url+'/issues'));
        }
        else if (elt instanceof IssueTreeItem) {
            vscode.env.openExternal(vscode.Uri.parse(elt.content.html_url));
        }
    });

    return repositoryProvider;
}

//* Notifications

export function showNotificationInWebPanel(notification: NotificationTreeItem) {
    const panel = vscode.window.createWebviewPanel(
        'notification',
        notification.label,
        vscode.ViewColumn.Active,
        {
            enableScripts: true
        }
    );

    const config = new Config();

    if(config.render === 'html') {
        panel.webview.html = showNotificationHTML(notification);
    } else {
        panel.webview.html = markdown_render(showNotificationMD(notification), notification);
    }

    return panel;
}

export function activate_notifications(context: vscode.ExtensionContext) : NotificationsProvider {
    let openNotifications: Array<NotificationTreeItem> = [];
    let openNotificationsWebpanels: Array<vscode.WebviewPanel> = [];
    const notificationsProvider = new NotificationsProvider();
    vscode.window.registerTreeDataProvider("giteaVscode.notifications", notificationsProvider);        

    vscode.commands.registerCommand('giteaVscode.showNotification', (notification: NotificationTreeItem) => {
        const notificationOpenable = openNotifications.find((c) => c.content.id === notification.content.id) === undefined;
        if (notificationOpenable) {
            const panel = showNotificationInWebPanel(notification);
            openNotifications.push(notification);
            openNotificationsWebpanels.push(panel);
            panel.onDidDispose((event) => {
                openNotifications.splice(openNotifications.indexOf(notification), 1);
                openNotificationsWebpanels.splice(openNotificationsWebpanels.indexOf(panel), 1);
            });
        } 
        else {
            const openPanel = openNotificationsWebpanels.find((c) => c.title === notification.label);
            openPanel?.reveal();
        }

    });

    vscode.commands.registerCommand('giteaVscode.refreshNotifications', () => {
        notificationsProvider.refresh();
    });

    vscode.commands.registerCommand('giteaVscode.openNotifInBrowser', (elt: NotificationTreeItem) => {
        vscode.env.openExternal(vscode.Uri.parse(elt.content.url));
    });

    vscode.commands.registerCommand('giteaVscode.markNotifAsRead', (elt: NotificationTreeItem) => {
        notificationsProvider.markAsRead(elt);
    });

    return notificationsProvider;
}

export async function activate(context: vscode.ExtensionContext) {
    Logger.init();
    Logger.log('Starting Gitea ...');

    const repositoryProvider = activate_issues(context);
    const notificationsProvider = activate_notifications(context);
    
    repositoryProvider.refresh();
    await notificationsProvider.refresh();

    // const testview = new GiteaWebView();
    
    Logger.log('Gitea is ready');

    notificationsProvider.autorefresh();
}

export function deactivate() {}
