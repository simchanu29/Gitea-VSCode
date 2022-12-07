import * as vscode from 'vscode';
import { Repository, Issue, IssueType, Comment } from './treenodes';
import { Config } from './config';
import { GiteaConnector } from './giteaConnector';
import { Logger } from './logger';

const MAX_PAGES=500 // TODO move to config

export class RepositoryProvider implements vscode.TreeDataProvider<Repository | IssueType | Issue> {
    private _onDidChangeTreeData: vscode.EventEmitter<Issue | undefined | null | void> = new vscode.EventEmitter<Issue | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Issue | undefined | null | void> = this._onDidChangeTreeData.event;


    private repoList: Repository[] = []; 

    constructor() {
        this.createRepositoryList();
    }

    getTreeItem(element: Repository | IssueType | Issue): vscode.TreeItem {
        return element;
    }

    public createRepositoryList() : Repository[] {
        this.repoList = [];

        const config = new Config();
        config.repoList.forEach((repoName: string, index) => {
            const name = config.repoList[index];
            const issue_url = config.instanceURL.replace(/\/$/, "")+'/api/v1/repos/'+config.owner+'/'+name+'/issues';
            const base_url = config.instanceURL.replace(/\/$/, "")+'/'+config.owner+'/'+name;

            this.repoList.push(new Repository(name, vscode.TreeItemCollapsibleState.Collapsed, issue_url, base_url,
                new IssueType("open", vscode.TreeItemCollapsibleState.Collapsed, []), 
                new IssueType("closed", vscode.TreeItemCollapsibleState.Collapsed, [])
            ))
        });

        // TODO discover submodules

        return this.repoList;
    }

    private async getCommentsAsync_(conn: GiteaConnector, url: string): Promise<Comment[]> {
        const comments = [];

        let page = 1;
        while (page < MAX_PAGES+1) {
            Logger.log( `Retrieve comments. page ${page}`);
            const commentsOfPage = (await conn.getIssueComments(url, page)).data;    
            Logger.log( `${commentsOfPage.length} comments retrieved (page: ${page})`);
            comments.push(...commentsOfPage);
            commentsOfPage.forEach((c) => {
                c.author = c.user.login;
                c.label = `${c.author} - ${c.body.slice(0, 255)}`;
                c.issueId = parseInt(c.issue_url.split('/').at(-1)) 
            });
            page++;
            if (commentsOfPage.length < 50) { // TODO move this limit to config
                break;
            }
        }

        return comments;
    }


    private async getIssuesAsync_(conn: GiteaConnector, state: string, url: string): Promise<Issue[]> {
        const issues = [];

        let page = 1;
        while (page < MAX_PAGES+1) {
            Logger.log( `Retrieve issues. State: ${state} - page ${page}`);
            const issuesOfPage = (await conn.getIssues(url, state, page)).data;    
            Logger.log( `${issuesOfPage.length} issues retrieved (state: ${state} - page: ${page})`);
            issues.push(...issuesOfPage);
            issuesOfPage.forEach((c) => {
                c.label = `#${c.number} - ${c.title}`;
                c.issueId = c.number;
                c.assignee = c.assignee === null ? 'Nobody' : c.assignee.login;
                c.assignees = c.assignees;
                c.creator = c.user.login;
                c.repo_url = c.html_url.split('/').slice(0, -2).join('/')
                c.id = c.id.toString();
            });
            page++;
            if (issuesOfPage.length < 50) { // TODO move this limit to config
                break;
            }
        }

        return issues;
    }

    private populate_issues(node: IssueType, issues: Issue[], comments: Comment[]) {
       
        issues.forEach((element: Issue) => {
            element.comments = []
            comments.forEach((comment: Comment) => {
                if (comment.issueId == element.issueId) {
                    element.comments.push(comment)
                }
            })

            let issue = Issue.createIssue(element)

            issue.command = {
                command: 'giteaIssues.showIssue',
                title: '',
                arguments: [element],
            };
            issue.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            issue.contextValue = 'issue';

            // Push to issueList
            node.issues.push(issue);

            Logger.debug('Issue processed', { 'id': issue.issueId, 'state': issue.state })
        });
    }

    public async getIssuesAsync(repo: Repository) : Promise<Repository> {
        const config = new Config();
        const giteaConnector = new GiteaConnector(config.token, config.sslVerify);

        let issuesOpen = (await this.getIssuesAsync_(giteaConnector, "open", repo.issue_url));
        let issuesClosed = (await this.getIssuesAsync_(giteaConnector, "closed", repo.issue_url));
        let comments = (await this.getCommentsAsync_(giteaConnector, repo.issue_url));

        this.populate_issues(repo.issuesOpen, issuesOpen, comments);
        this.populate_issues(repo.issuesClosed, issuesClosed, comments);

        return repo;
    }


    public async refresh() {
        this.createRepositoryList();
        for (let i = 0; i < this.repoList.length; i++) {
            this.repoList[i] = (await this.getIssuesAsync(this.repoList[i]));
        }
        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: Repository | IssueType | Issue): vscode.ProviderResult<any[]> {
        
        if (element instanceof Repository){
            let childItems: vscode.TreeItem[] = [
                element.issuesOpen,
                element.issuesClosed
            ]
            return Promise.resolve(childItems);
        }
        else if (element instanceof IssueType){
            return Promise.resolve(element.issues);
        }
        else if (element instanceof Issue){
            let childItems: vscode.TreeItem[] = [
                new vscode.TreeItem('Assignee - ' + element.assignee, vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('State - ' + element.state   , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('ID - ' + element.issueId , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('From - ' + element.creator , vscode.TreeItemCollapsibleState.None),
            ];
            return Promise.resolve(childItems);
        }

        return this.repoList;
    }
}