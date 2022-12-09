import { Uri, TreeItem, TreeItemCollapsibleState, Command} from 'vscode';

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