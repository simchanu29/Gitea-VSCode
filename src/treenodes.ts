import { Uri, TreeItem, TreeItemCollapsibleState, Command} from 'vscode';
import * as path from "path";

export class Repository extends TreeItem {
    contextValue = 'repository';

    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public issue_url: string,
        public base_url: string,
        public issuesOpen: IssueType,
        public issuesClosed: IssueType
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label} (${this.base_url})`;
    }
}

export class IssueType extends TreeItem {
    contextValue = 'issueType';

    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public issues: Issue[],
    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
    }

    iconPath = {
        light: this.getIcon(),
        dark: this.getIcon(),
    };

    public getIcon(){
        if(this.label == "closed") {
            return path.join(__filename, '..', '..', 'resources', 'light', 'issue_closed.svg')
        } else {
            return path.join(__filename, '..', '..', 'resources', 'light', 'issue_open.svg')
        }
    }
}

export class Comment extends TreeItem {
    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public author: string,
        public body: string,
        public created_at: string,
        public updated_at: string,
        public issue_url: string,
        public issueId: number
    ) {
        super(label, collapsibleState);
        this.tooltip = this.body;
    }
}

interface Label {
    color: string;
    id: number;
    name: string;
    url: string;
}
  
export class Issue extends TreeItem {
    contextValue = 'issue';
    original_issue? : Issue;

    static createIssue(element: Issue) {
        let ret = new Issue(
            element.label,
            element.issueId,
            element.body,
            element.state,
            element.assignee,
            element.assignees,
            element.creator,
            element.labels,
            element.collapsibleState,
            element.title,
            element.html_url,
            element.repo_url,
            element.comments)
        ret.original_issue = element;
        return ret
    }

    constructor(
        public readonly label: string,
        public issueId: number,
        public body: string,
        public state: string,
        public assignee: string,
        public assignees: any[],
        public creator: string,
        public labels: Label[],
        public collapsibleState: TreeItemCollapsibleState,
        public title: string,
        public html_url: string,
        public repo_url: string,
        public comments: Comment[],
        public command?: Command
    ) {
        super(label, collapsibleState);
        this.tooltip = this.label + ' - ' + this.assignee;
    }

    labelDependentIcon(dark: boolean = false): Uri {
        if (this.labels.length === 0) {
        return createIconWithColor('#868686');
        } else {
        return createIconWithColor(this.labels[0].color);
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
  