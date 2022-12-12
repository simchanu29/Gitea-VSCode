import * as vscode from 'vscode';
import { RepositoryTreeItem, IssueTreeItem, IssueTypeTreeItem } from '../nodes/issues';
import { CommentTreeItem } from '../nodes/comment';
import { Config } from '../config';
import { GiteaConnector } from '../gitea/giteaConnector';
import { Logger } from '../logger';
import { config } from 'process';
import { IGitea } from '../gitea/IGiteaResponse';

export class RepositoryProvider implements vscode.TreeDataProvider<RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<IssueTreeItem | undefined | null | void> = new vscode.EventEmitter<IssueTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<IssueTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;


    private repoList: RepositoryTreeItem[] = []; 

    constructor() {
        this.createEmptyRepositoryList();
    }

    getTreeItem(element: RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem): vscode.TreeItem {
        return element;
    }

    public createEmptyRepositoryList() : RepositoryTreeItem[] {
        this.repoList = [];

        const config = new Config();
        config.repoList.forEach((repoName: string, index) => {
            const name = config.repoList[index];
            const owner = config.owner;
            const issue_api_url = config.apiUrl+'/repos/'+owner+'/'+name+'/issues';
            const base_url = config.instanceURL.replace(/\/$/, "")+'/'+owner+'/'+name;

            this.repoList.push(new RepositoryTreeItem(name, 
                vscode.TreeItemCollapsibleState.Collapsed, 
                issue_api_url, base_url,
                owner,
                new IssueTypeTreeItem("open", vscode.TreeItemCollapsibleState.Collapsed, []), 
                new IssueTypeTreeItem("closed", vscode.TreeItemCollapsibleState.Collapsed, [])
            ));
        });

        // TODO discover submodules

        return this.repoList;
    }

    private async getCommentsAsync_(conn: GiteaConnector, repo_owner: string, repo_name: string): Promise<CommentTreeItem[]> {
        const config = new Config();
        const comments: CommentTreeItem[] = [];

        let page = 1;
        while (page < config.max_page_request+1) {

            // Get comments in page
            Logger.log( `Retrieve comments. page ${page}`);
            const commentsOfPage: IGitea.Comment[] = await conn.getIssueComments(repo_owner, repo_name, page);                
            Logger.log( `${commentsOfPage.length} comments retrieved (page: ${page})`);

            // Save
            commentsOfPage.forEach((comment: any) => {
                comments.push(CommentTreeItem.createFromGitea(comment));
            });

            // Post process
            page++;
            if (commentsOfPage.length < config.max_item_request) { // TODO move this limit to config
                break;
            }
        }

        return comments;
    }

    private async getIssuesAsync_(conn: GiteaConnector, repo_owner: string, repo_name: string, state: string): Promise<IssueTreeItem[]> {
        const config = new Config();
        const issues: IssueTreeItem[] = [];

        let page = 1;
        while (page < config.max_page_request+1) {

            // Get issues in page
            Logger.log( `Retrieve issues. State: ${state} - page ${page}`);
            const issuesOfPage: IGitea.Issue[] = await conn.getIssues(repo_owner, repo_name, state, page);    
            Logger.log( `${issuesOfPage.length} issues retrieved (state: ${state} - page: ${page})`);

            // Save
            issuesOfPage.forEach((c: IGitea.Issue) => {
                issues.push(IssueTreeItem.createFromGitea(c));
            });

            // Post process
            page++;
            if (issuesOfPage.length < 50) { // TODO move this limit to config
                break;
            }
        }

        return issues;
    }

    private populate_issues(node: IssueTypeTreeItem, issues: IssueTreeItem[], comments: CommentTreeItem[]) {
       
        issues.forEach((issue: IssueTreeItem) => {
            issue.comments = []; // reset

            comments.forEach((comment: CommentTreeItem) => {
                if (comment.issue_id === issue.content.number) {
                    issue.comments.push(comment);
                }
            });

            issue.command = {
                command: 'giteaVscode.showIssue',
                title: '',
                arguments: [issue],
            };

            // Push to issueList
            node.issues.push(issue);

            Logger.debug('Issue processed', { 'id': issue.content.number, 'state': issue.content.state });
        });
    }

    public async getIssuesAsync(repo: RepositoryTreeItem) : Promise<RepositoryTreeItem> {
        const config = new Config();
        const giteaConnector = new GiteaConnector(config.apiUrl, config.token, config.sslVerify);

        let issuesOpen: IssueTreeItem[] = (await this.getIssuesAsync_(giteaConnector, repo.owner, repo.label, "open"));
        let issuesClosed: IssueTreeItem[] = (await this.getIssuesAsync_(giteaConnector, repo.owner, repo.label, "closed"));
        let comments: CommentTreeItem[] = (await this.getCommentsAsync_(giteaConnector, repo.owner, repo.label));

        this.populate_issues(repo.issuesOpen, issuesOpen, comments);
        this.populate_issues(repo.issuesClosed, issuesClosed, comments);

        return repo;
    }


    public async refresh() {
        this.createEmptyRepositoryList();
        for (let i = 0; i < this.repoList.length; i++) {
            this.repoList[i] = (await this.getIssuesAsync(this.repoList[i]));
        }

        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem): vscode.ProviderResult<any[]> {
        
        if (element instanceof RepositoryTreeItem){
            let childItems: vscode.TreeItem[] = [
                element.issuesOpen,
                element.issuesClosed
            ];
            return Promise.resolve(childItems);
        }
        else if (element instanceof IssueTypeTreeItem){
            return Promise.resolve(element.issues);
        }
        else if (element instanceof IssueTreeItem){
            let childItems: vscode.TreeItem[] = [
                new vscode.TreeItem('Assignee - ' + element.content.assignee   , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('State - '    + element.content.state      , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('ID - '       + element.content.number     , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('From - '     + element.content.user.login , vscode.TreeItemCollapsibleState.None),
            ];
            return Promise.resolve(childItems);
        }

        return this.repoList;
    }
}