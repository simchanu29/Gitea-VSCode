import { Uri, TreeItem, TreeItemCollapsibleState, Command} from 'vscode';
import * as path from "path";
import { Comment } from "./comment";

export class Notification extends TreeItem {
    contextValue = 'notification';
    original_notification? : Notification;

    static createNotification(element: Notification) {
        let ret = new Notification(
            element.label,
            element.collapsibleState,
            element.title,
            element.type,
            element.state,
            element.notificationId,
            element.html_url,
            element.repo_url,
            element.updated_at,
            element.latest_comment_html_url//,
            // element.attached_comment
        );
        ret.original_notification = element;
        return ret;
    }

    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public title: string,
        public type: string,
        public state: string,
        public notificationId: number,
        public html_url: string,
        public repo_url: string,
        public updated_at: string,
        public latest_comment_html_url: string,
        // public attached_comment: Comment

    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
    }

    stateDependentIcon(light_str: string): string {
        if (this.label.length === 0){
            return path.join(__filename, '..', '..', '..', 'resources', light_str, 'create.svg');
        }

        if(this.type === "Pull" && this.state === "merged"){
            return path.join(__filename, '..', '..', '..', 'resources', light_str, 'pull_merged.svg');
        }
        else if(this.type === "Issue" && this.state === "closed"){
            return path.join(__filename, '..', '..', '..', 'resources', light_str, 'issue_closed.svg');
        }
        else if(this.type === "Issue" && this.state === "open"){
            return path.join(__filename, '..', '..', '..', 'resources', light_str, 'issue_open.svg');
        }
        else if(this.type === "Pull" && this.state === "closed"){
            
        }
        return path.join(__filename, '..', '..', '..', 'resources', light_str, 'create.svg');
    }

    iconPath = {
        light: this.stateDependentIcon("light"),
        dark: this.stateDependentIcon("dark"),
    };
}