import * as vscode from 'vscode';

import { showIssueHTML, showIssueMD } from './template.issues';
import { Issue, Repository } from './treenodes';
import { Config } from './config';
import { Logger } from './logger';
import { RepositoryProvider } from './repositoriesProvider';
import MarkdownIt = require('markdown-it');
import { utimesSync } from 'fs';

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

    if(config.render == 'html') {
        panel.webview.html = showIssueHTML(issue);
    } else {
        let markdownIt = new MarkdownIt()
        panel.webview.html = markdownIt.render(showIssueMD(issue));
    }

    return panel;
}

export function activate(context: vscode.ExtensionContext) {
    Logger.init()
    Logger.log('Starting Gitea ...');
    
    // Array of issues; This is used to determine whether a issue is already open
    // in a tab or not.
    let openIssues: Array<Issue> = [];
    const repositoryProvider = new RepositoryProvider();
    vscode.window.registerTreeDataProvider("giteaIssues.repositories", repositoryProvider);        

    vscode.commands.registerCommand('giteaIssues.showIssue', (issue: Issue) => {
        const issueOpenable = openIssues.find((c) => c.issueId === issue.issueId) === undefined;
        if (issueOpenable) {
            const panel = showIssueInWebPanel(issue);
            openIssues.push(issue);
            panel.onDidDispose((event) => {
                openIssues.splice(openIssues.indexOf(issue), 1);
            });
        }
    });

    vscode.commands.registerCommand('giteaIssues.refreshIssues', () => {
        repositoryProvider.refresh();
    });

    vscode.commands.registerCommand('giteaIssues.openIssue', (repo: Repository) => {
        vscode.env.openExternal(vscode.Uri.parse(repo.base_url+'/issues/new'));
    });

    // Unused
    vscode.commands.registerCommand('giteaIssues.toogleIssue', (issue: Issue) => {
        Logger.log("reopen or close issue " + issue.issueId);
        vscode.env.openExternal(vscode.Uri.parse(issue.html_url)); // TODO use API with a web view
    });

    vscode.commands.registerCommand('giteaIssues.openRepoInBrowser', (elt: Repository | Issue) => {
        if (elt instanceof Repository) {
            vscode.env.openExternal(vscode.Uri.parse(elt.base_url+'/issues'));
        }
        else if (elt instanceof Issue) {
            vscode.env.openExternal(vscode.Uri.parse(elt.html_url));
        }
    });

    // await repositoryProvider.refresh();
    Logger.log('Gitea is ready')
}

export function deactivate() {}
