import { Uri, TreeItem, TreeItemCollapsibleState, Command} from 'vscode';
import { IGitea } from "../gitea/IGiteaResponse" 

export class CommentTreeItem extends TreeItem {
    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public content: IGitea.Comment,
        public issue_id: number,
        public repo_url: string
    ) {
        super(label, collapsibleState);
        this.tooltip = this.content.body;
    }

    static createFromGitea(comment: IGitea.Comment)
    {
        const issue_id = parseInt(comment.issue_url.split('/').at(-1)!);
        const repo_url = comment.issue_url.split('/').slice(0, -2).join('/'); // On enlève /issues/#? de l'url 

        return new CommentTreeItem(
            `${comment.user.login} - ${comment.body.slice(0, 255)}`,
            TreeItemCollapsibleState.None,
            comment,
            issue_id,
            repo_url
        );
    }
}