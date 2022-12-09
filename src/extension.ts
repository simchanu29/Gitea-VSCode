import * as vscode from 'vscode';

import { markdown_render, showIssueHTML, showIssueMD, showNotificationHTML, showNotificationMD } from './template.issues';
import { Issue, Repository } from './nodes/issues';
import { Notification } from './nodes/notifications';
import { Config } from './config';
import { Logger } from './logger';
import { RepositoryProvider } from './providers/issuesProvider';
import MarkdownIt = require('markdown-it');
import { utimesSync } from 'fs';
import { NotificationsProvider } from './providers/notificationProvider';

//* Issues

export function showIssueInWebPanel(issue: Issue) {
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

export function activate_issues(context: vscode.ExtensionContext) : RepositoryProvider {
    // Array of issues; This is used to determine whether a issue is already open
    // in a tab or not.
    let openIssues: Array<Issue> = [];
    const repositoryProvider = new RepositoryProvider();
    vscode.window.registerTreeDataProvider("giteaVscode.issues", repositoryProvider);        

    vscode.commands.registerCommand('giteaVscode.showIssue', (issue: Issue) => {
        const issueOpenable = openIssues.find((c) => c.issueId === issue.issueId) === undefined;
        if (issueOpenable) {
            const panel = showIssueInWebPanel(issue);
            openIssues.push(issue);
            panel.onDidDispose((event) => {
                openIssues.splice(openIssues.indexOf(issue), 1);
            });
        } else {
            vscode.commands.executeCommand('revealInExplorer', vscode.Uri.parse(issue.label));
        }
    });

    vscode.commands.registerCommand('giteaVscode.refreshIssues', () => {
        repositoryProvider.refresh();
    });

    vscode.commands.registerCommand('giteaVscode.openIssue', (repo: Repository) => {
        vscode.env.openExternal(vscode.Uri.parse(repo.base_url+'/issues/new'));
    });

    // Unused
    vscode.commands.registerCommand('giteaVscode.toogleIssue', (issue: Issue) => {
        Logger.log("reopen or close issue " + issue.issueId);
        vscode.env.openExternal(vscode.Uri.parse(issue.html_url)); // TODO use API with a web view
    });

    vscode.commands.registerCommand('giteaVscode.openRepoInBrowser', (elt: Repository | Issue) => {
        if (elt instanceof Repository) {
            vscode.env.openExternal(vscode.Uri.parse(elt.base_url+'/issues'));
        }
        else if (elt instanceof Issue) {
            vscode.env.openExternal(vscode.Uri.parse(elt.html_url));
        }
    });

    return repositoryProvider;
}

//* Notifications

export function showNotificationInWebPanel(notification: Notification) {
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
    let openNotifications: Array<Notification> = [];
    const notificationsProvider = new NotificationsProvider();
    vscode.window.registerTreeDataProvider("giteaVscode.notifications", notificationsProvider);        

    vscode.commands.registerCommand('giteaVscode.showNotification', (notification: Notification) => {
        const notificationOpenable = openNotifications.find((c) => c.notificationId === notification.notificationId) === undefined;
        if (notificationOpenable) {
            const panel = showNotificationInWebPanel(notification);
            openNotifications.push(notification);
            panel.onDidDispose((event) => {
                openNotifications.splice(openNotifications.indexOf(notification), 1);
            });
        } else {
            vscode.commands.executeCommand('revealInExplorer', vscode.Uri.parse(notification.label));
        }
    });

    vscode.commands.registerCommand('giteaVscode.refreshNotifications', () => {
        notificationsProvider.refresh();
    });

    vscode.commands.registerCommand('giteaVscode.openNotifInBrowser', (elt: Notification) => {
        vscode.env.openExternal(vscode.Uri.parse(elt.html_url));
    });

    vscode.commands.registerCommand('giteaVscode.markNotifAsRead', (elt: Notification) => {
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
    
    Logger.log('Gitea is ready');

    notificationsProvider.autorefresh();
}

export function deactivate() {}
