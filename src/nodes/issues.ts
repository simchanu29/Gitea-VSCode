import { Uri, TreeItem, TreeItemCollapsibleState, Command} from 'vscode';
import * as path from "path";
import { CommentTreeItem } from "./comment";
import { IGitea } from "../gitea/IGiteaResponse";
import { GiteaConnector } from '../gitea/giteaConnector';

export class OwnerTreeItem extends TreeItem {
    contextValue = 'repository';

    constructor(
        public readonly label: string,
        public name: string,
        public collapsibleState: TreeItemCollapsibleState,
        public base_url: string,
        public type: string, ///< user or org
        public repositories: RepositoryTreeItem[]
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} (${this.base_url})`;
    }
}

export class RepositoryTreeItem extends TreeItem {
    contextValue = 'repository';

    static createFromGitea(repo: IGitea.Repository){
        // const repo_url = repo.html_url.split('/').slice(0, -2).join('/'); // On enlève /issues/#? de l'url 
        
        let new_repo = new RepositoryTreeItem(
            repo.name,
            TreeItemCollapsibleState.Collapsed,
            repo.html_url+"/issues",
            repo.html_url,
            repo.owner.login,
            new IssueTypeTreeItem("open", TreeItemCollapsibleState.Collapsed, []), 
            new IssueTypeTreeItem("closed", TreeItemCollapsibleState.Collapsed, [])
        );
        return new_repo;
    }

    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public issue_url: string,
        public base_url: string,
        public owner: string,
        public issuesOpen: IssueTypeTreeItem,
        public issuesClosed: IssueTypeTreeItem
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} (${this.base_url})`;
    }
}

export class IssueTypeTreeItem extends TreeItem {
    contextValue = 'issueType';

    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public issues: IssueTreeItem[],
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
    }

    iconPath = {
        light: this.getIcon(),
        dark: this.getIcon(),
    };

    public getIcon(): string {
        if(this.label === "closed") {
            return path.join(__filename, ...'../../../resources/light/issue_closed.svg'.split('/'));
        } else {
            return path.join(__filename, ...'../../../resources/light/issue_open.svg'.split('/'));
        }
    }
}

interface Label {
    color: string;
    id: number;
    name: string;
    url: string;
}
  
export class IssueTreeItem extends TreeItem {
    contextValue = 'issue';
    // original_issue? : IGitea.Issue;

    static createFromGitea(issue: IGitea.Issue){
        const repo_url = issue.html_url.split('/').slice(0, -2).join('/'); // On enlève /issues/#? de l'url 
        
        let new_issue = new IssueTreeItem(
        // return new IssueTreeItem(
            `#${issue.number} - ${issue.title}`,
            TreeItemCollapsibleState.Collapsed,
            issue,
            repo_url,
            []
        );
        // new_issue.original_issue = issue;
        
        // issue.comments.forEach((c: IGitea.Comment) => {            
        // });
        return new_issue;
    }

    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public content: IGitea.Issue,
        public repo_url: string, //< html url pour le repo 
        public comments: CommentTreeItem[],
        public command?: Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label + ' - ' + this.content.assignee;
    }

    labelDependentIcon(dark: boolean = false): Uri {
        if (this.content.labels.length === 0) {
            return createIconWithColor('#868686');
        } else {
            return createIconWithColor(this.content.labels[0].color);
        }
    }

    iconPath = {
        light: this.labelDependentIcon(),
        dark: this.labelDependentIcon(true),
    };

}

export function createIconWithColor(color: string): Uri {
    const icon = `<svg width="32" height="32" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M16 31.5C24.5604 31.5 31.5 24.5604 31.5 16C31.5 7.43959 24.5604 0.5 16 0.5C7.43959 0.5 0.5 7.43959 0.5 16C0.5 24.5604 7.43959 31.5 16 31.5Z" stroke="{{color}}"/>
        <path d="M19 6C19 4.34315 17.6569 3 16 3C14.3431 3 13 4.34315 13 6V20C13 21.6569 14.3431 23 16 23C17.6569 23 19 21.6569 19 20V6Z" fill="{{color}}"/>
        <path d="M16.5 24H15.5C14.1193 24 13 25.1193 13 26.5C13 27.8807 14.1193 29 15.5 29H16.5C17.8807 29 19 27.8807 19 26.5C19 25.1193 17.8807 24 16.5 24Z" fill="{{color}}"/>
        </svg>
        `.replace(new RegExp('{{color}}', 'g'), '#' + color);

    return Uri.parse('data:image/svg+xml;base64,' + Buffer.from(icon).toString('base64'));
}
  
