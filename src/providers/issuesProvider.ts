import * as vscode from 'vscode';
import * as path from "path";
import { RepositoryTreeItem, IssueTreeItem, IssueTypeTreeItem, OwnerTreeItem } from '../nodes/issues';
import { CommentTreeItem } from '../nodes/comment';
import { Config } from '../config';
import { GiteaConnector } from '../gitea/giteaConnector';
import { Logger } from '../logger';
import { config } from 'process';
import { IGitea } from '../gitea/IGiteaResponse';
import { ignore } from '@microsoft/fast-foundation';
import { getUri } from '../webview/utils';

export class RepositoryProvider implements vscode.TreeDataProvider<OwnerTreeItem | RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<
        OwnerTreeItem | RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem | undefined | null | void
    > = new vscode.EventEmitter<OwnerTreeItem | RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<
        OwnerTreeItem | RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem | undefined | null | void
    > = this._onDidChangeTreeData.event;


    public ownerList: OwnerTreeItem[] = []; 

    constructor() {
        this.createEmptyOwnerList();
        // this.createEmptyRepositoryList();
    }

    getTreeItem(element: OwnerTreeItem | RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem): vscode.TreeItem {
        return element;
    }

    public createEmptyOwnerList() : OwnerTreeItem[] {
        let ownerList = [];

        const config = new Config();

        // Pas de parallelisme pour éviter les doublons
        for (let index = 0; index < config.orgList.length; ++index) {
            const name = config.orgList[index];
            const type = "org";
            let base_url = `${config.instanceURL.replace(/\/$/, "")}/${name}`;

            if(ownerList.findIndex((elt) => {return elt.label === name;}) > 0) {
                // Si il existe déjà
                // console.warn("Repository already exists")
                Logger.debug(`Owner ${name} already exists, skipping`);
                continue;
            }

            ownerList.push(new OwnerTreeItem(name, name,
                vscode.TreeItemCollapsibleState.Collapsed, 
                base_url, "org", []
            ));
        }
        
        // ownerList.push(new OwnerTreeItem(name, name
        //     vscode.TreeItemCollapsibleState.Collapsed, 
        //     base_url, "user"
        // ));

        // for (let index = 0; index < config.userList.length; ++index) {
        //     const name = config.userList[index];
        //     const type = "org";
        //     let base_url = config.instanceURL.replace(/\/$/, "")+'/'+name;

        //     if(ownerList.findIndex((elt) => {return elt.label === name;}) > 0) {
        //         // Si il existe déjà
        //         // console.warn("Repository already exists")
        //         Logger.debug(`Owner ${name} already exists, skipping`);
        //         continue;
        //     }

        //     ownerList.push(new OwnerTreeItem(name, name
        //         vscode.TreeItemCollapsibleState.Collapsed, 
        //         base_url, "user"
        //     ));
        // }


        // TODO discover submodules

        return ownerList;
    }


    // public createEmptyRepositoryList() : RepositoryTreeItem[] {
    //     let repoList = [];

    //     const config = new Config();

    //     // Pas de parallelisme pour éviter les doublons
    //     for (let index = 0; index < config.repoList.length; ++index) {
    //         const name = config.repoList[index];
    //         const owner = config.owner;
    //         const issue_api_url = config.apiUrl+'/repos/'+owner+'/'+name+'/issues';
    //         const base_url = config.instanceURL.replace(/\/$/, "")+'/'+owner+'/'+name;

    //         if(repoList.findIndex((elt) => {return elt.label === name;}) > 0) {
    //             // Si il existe déjà
    //             // console.warn("Repository already exists")
    //             Logger.debug(`Repository ${name} already exists, skipping`);
    //             continue;
    //         }

    //         repoList.push(new RepositoryTreeItem(name, 
    //             vscode.TreeItemCollapsibleState.Collapsed, 
    //             issue_api_url, base_url,
    //             owner,
    //             new IssueTypeTreeItem("open", vscode.TreeItemCollapsibleState.Collapsed, []), 
    //             new IssueTypeTreeItem("closed", vscode.TreeItemCollapsibleState.Collapsed, [])
    //         ));
    //     }

    //     // TODO discover submodules

    //     return repoList;
    // }

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

    private async getPages<T>(func: Function, max_page: number) : Promise<T[]> {
        let data_arr: T[] = [];

        let page = 1;
        while (page < max_page+1) {
            // Get data_arr in page
            const dataOfPage: T[] = await func(page);
            data_arr.push(...dataOfPage);

            // Post process
            page++;
            if (dataOfPage.length < 50) { // TODO move this limit to config
                break;
            }
        }

        return data_arr;
    }


    private async getIssuesAsync_(conn: GiteaConnector, repo_owner: string, repo_name: string, state: string): Promise<IssueTreeItem[]> {
        const config = new Config();

        const issues: IssueTreeItem[] = await this.getPages<IssueTreeItem>(async (page: number) => {
            let issuesOfPageTreeItem: IssueTreeItem[] = [];

            // Get issues in page
            Logger.log( `Retrieve issues. State: ${state}`);
            const issuesOfPage: IGitea.Issue[] = await conn.getIssues(repo_owner, repo_name, state, page);    
            Logger.log( `${issuesOfPage.length} issues retrieved (state: ${state} - page: ${page})`);

            // Save
            issuesOfPage.forEach((c: IGitea.Issue) => {
                issuesOfPageTreeItem.push(IssueTreeItem.createFromGitea(c));
            });

            return issuesOfPageTreeItem;
        }, config.max_page_request);

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
                arguments: [issue.content.repository.owner, issue.content.repository.name, issue.content.number],
            };

            // Push to issueList
            node.issues.push(issue);

            Logger.debug('Issue processed', { 'id': issue.content.number, 'state': issue.content.state });
        });
    }

    public async getRepositoriesAsync(owner: OwnerTreeItem) : Promise<RepositoryTreeItem[]> {
        const config = new Config();
        const giteaConnector = new GiteaConnector(config.apiUrl, config.token, config.sslVerify);

        let repoList = [];

        if (owner.type === "org") {
            // Org
            repoList = await this.getPages<RepositoryTreeItem>(async (page: number) => {
                let repoOfPageTreeItem: RepositoryTreeItem[] = [];
                let repoOfPage = await giteaConnector.getOrgRepositories(owner.name, page);

                // Save
                repoOfPage.forEach((c: IGitea.Repository) => {
                    repoOfPageTreeItem.push(RepositoryTreeItem.createFromGitea(c));
                });

                return repoOfPageTreeItem;
            }, config.max_page_request);
        } else {
            // User
            repoList = await this.getPages<RepositoryTreeItem>(async (page: number) => {
                return await giteaConnector.getUserRepositories(page);
            }, config.max_page_request);
        }

        return repoList;
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

    public async addCommentToIssue(issue: IssueTreeItem, body: string) {
        const config = new Config(); // TODO c'est pas super de créer des objets en permanence
        const giteaConnector = new GiteaConnector(config.apiUrl, config.token, config.sslVerify);

        let comment = await giteaConnector.addCommentToIssue(issue.content.repository.owner, issue.content.repository.name, issue.content.number, body);
        issue.comments.push(CommentTreeItem.createFromGitea(comment));

        this._onDidChangeTreeData.fire();
    }

    public async setIssueState(issue: IssueTreeItem, new_state: string) {
        let owner_id = this.getOwnerId(issue.content.repository.owner);
        if (owner_id < 0) {
            console.error("Owner not found :", issue.content.repository.owner);
            return;
        }

        let repo_id = this.getRepoId(this.ownerList[owner_id], issue.content.repository.name);
        if(repo_id < 0){
            console.error("Repository not found :", issue.content.repository.name);
            // TODO le rajouter ?
            return;
        }

        const config = new Config();
        const giteaConnector = new GiteaConnector(config.apiUrl, config.token, config.sslVerify);

        let gitea_issue = await giteaConnector.setIssueState(issue.content.repository.owner, issue.content.repository.name, issue.content.number, new_state);
        
        if(new_state === "closed") {
            let index = this.ownerList[owner_id].repositories[repo_id].issuesOpen.issues.findIndex((elt) => elt.content.number === issue.content.number);
            if(index > -1)
            {
                this.ownerList[owner_id].repositories[repo_id].issuesClosed.issues.push(this.ownerList[owner_id].repositories[repo_id].issuesOpen.issues[index]);
                this.ownerList[owner_id].repositories[repo_id].issuesOpen.issues.splice(index, 1);
            }
        }
        else if (new_state === "open") {
            let index = this.ownerList[owner_id].repositories[repo_id].issuesClosed.issues.findIndex((elt) => elt.content.number === issue.content.number);
            if(index > -1)
            {
                this.ownerList[owner_id].repositories[repo_id].issuesOpen.issues.push(this.ownerList[owner_id].repositories[repo_id].issuesClosed.issues[index]);                
                this.ownerList[owner_id].repositories[repo_id].issuesClosed.issues.splice(index, 1);
            }
        }

        // this._onDidChangeTreeData.fire(this.repoList[repo_id].issuesOpen);
        // this._onDidChangeTreeData.fire(this.repoList[repo_id].issuesClosed);
        this._onDidChangeTreeData.fire();
    }

    public async refresh() {
        Logger.debug("Refreshing issues");
        // TODO en cas de getChildren alors on recupere les infos du repo
        this.ownerList = this.createEmptyOwnerList();
        Logger.debug(`Refreshing found owners : ${this.ownerList}`);
        for (let i = 0; i < this.ownerList.length; i++) {
            this.ownerList[i].repositories = (await this.getRepositoriesAsync(this.ownerList[i]));
            for (let j = 0; j < this.ownerList[i].repositories.length; j++) {
                this.ownerList[i].repositories[j] = (await this.getIssuesAsync(this.ownerList[i].repositories[j]));
            }
        }
        // this.createEmptyRepositoryList();
        // this.getRepositoriesAsync();
        // for (let i = 0; i < this.repoList.length; i++) {
        //     this.repoList[i] = (await this.getIssuesAsync(this.repoList[i]));
        // }

        this._onDidChangeTreeData.fire();
    }

    getChildren(element?: OwnerTreeItem | RepositoryTreeItem | IssueTypeTreeItem | IssueTreeItem): vscode.ProviderResult<any[]> {

        if (element instanceof OwnerTreeItem) {
            return Promise.resolve(element.repositories);
        }
        if (element instanceof RepositoryTreeItem) {
            let newIssueItem = new vscode.TreeItem('New issue', vscode.TreeItemCollapsibleState.None);
            newIssueItem.command = {
                command: 'giteaVscode.newIssue',
                title: '',
                arguments: [element.owner, element.label],
            };
            newIssueItem.iconPath = {
                light: path.join(__filename, ...'../../../resources/light/create.svg'.split('/')),
                dark: path.join(__filename, ...'../../../resources/dark/create.svg'.split('/'))
            }


            let childItems: vscode.TreeItem[] = [
                newIssueItem,
                element.issuesOpen,
                element.issuesClosed,
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

        return this.ownerList;
    }

    public getOwnerId(owner_name: string) : number {
        return this.ownerList.findIndex( elt => elt.name === owner_name);
    }

    public getRepoId(owner: OwnerTreeItem, repo_name: string) : number {
        return owner.repositories.findIndex( elt => elt.label === repo_name);
    }

    public getIssue(owner_name: string, repo_name: string, issue_id: number) : IssueTreeItem | undefined {
        let owner_id = this.getOwnerId(owner_name);
        if (owner_id < 0) {
            return undefined;
        }

        let repo_id = this.getRepoId(this.ownerList[owner_id], repo_name);
        if (repo_id < 0) {
            return undefined;
        }
        
        let res_open = this.ownerList[owner_id].repositories[repo_id].issuesOpen.issues.find( elt => elt.content.number === issue_id);
        if (res_open) {
            return res_open;
        }
        let res_closed = this.ownerList[owner_id].repositories[repo_id].issuesClosed.issues.find( elt => elt.content.number === issue_id);
        if (res_closed) {
            return res_closed;
        }
        return undefined;
    }

    public getRepo(owner_name: string, repo_name: string) : RepositoryTreeItem | undefined {
        let owner_id = this.getOwnerId(owner_name);
        if (owner_id < 0) {
            return undefined;
        }

        let repo_id = this.getRepoId(this.ownerList[owner_id], repo_name);
        if (repo_id < 0) {
            return undefined;
        }

        return this.ownerList[owner_id].repositories[repo_id];
    }
}