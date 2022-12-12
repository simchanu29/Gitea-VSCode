import { Uri, TreeItem, TreeItemCollapsibleState, Command} from 'vscode';
import * as path from "path";
import { CommentTreeItem } from "./comment";
import { IGitea } from "../gitea/IGiteaResponse";

export class NotificationTreeItem extends TreeItem {
    contextValue = 'notification';
    static openIssueAction: string = 'Issue opened';
    static closeIssueAction: string = 'Issue closed';
    static openPRAction: string = 'Pull request opened';
    static closePRAction: string = 'Pull request closed';
    static mergePRAction: string = 'Pull request merged';

    static getNotifiedAction(subject: IGitea.NotificationSubject) : string
    {
        let notified_action = '';
        // Si c'est vide on cherche à récupérer le body de l'issue ou de la PR associée
        if(subject.type === "Issue")
        {
            if(subject.state === "open")
            {
                notified_action = NotificationTreeItem.openIssueAction;
            }
            else
            {
                notified_action = NotificationTreeItem.closeIssueAction;
            }
        } 
        else if (subject.type === "Pull") 
        {
            if(subject.state === "merged")
            {
                notified_action = NotificationTreeItem.mergePRAction;
            }
            else if (subject.state === "open") 
            {
                notified_action = NotificationTreeItem.openPRAction;
            }
            else
            {
                notified_action = NotificationTreeItem.closePRAction;
            }

        }
        return notified_action;
    }

    static createFromGitea(elt: IGitea.NotificationThread) : NotificationTreeItem {
        let notified_action = NotificationTreeItem.getNotifiedAction(elt.subject);
        let comment_id: number = NaN;
                
        if(elt.subject.latest_comment_html_url !== '')
        {
            comment_id = parseInt(elt.subject.latest_comment_html_url.split('/').at(-1)!.split('-').at(-1)!);
        }
        
        return new NotificationTreeItem(
            `#${elt.id} - ${elt.subject.title}`,
            TreeItemCollapsibleState.Collapsed,
            elt,
            notified_action,
            comment_id
        );
    }


    constructor(
        public readonly label: string,
        public collapsibleState: TreeItemCollapsibleState,
        public content: IGitea.NotificationThread,

        public notified_action: string,
        public comment_id: number,
        public attached_comment?: CommentTreeItem

    ) {
        super(label, collapsibleState);
        this.tooltip = `${this.label}`;
    }

    getRessource(...ressource_path: string[]) : string {
        return path.join(__filename, '..', '..', '..', 'resources', ...ressource_path);
    }

    stateDependentIcon(light_str: string): string {
        if (this.label.length === 0){
            return this.getRessource(light_str, 'create.svg');
        }

        if(this.notified_action === NotificationTreeItem.mergePRAction){
            return this.getRessource(light_str, 'pull_merged.svg');
        }
        else if(this.notified_action === NotificationTreeItem.closeIssueAction){
            return this.getRessource(light_str, 'issue_closed.svg');
        }
        else if(this.notified_action === NotificationTreeItem.openIssueAction){
            return this.getRessource(light_str, 'issue_open.svg');
        }
        else if(this.notified_action === NotificationTreeItem.closePRAction){
            
        }
        else if(this.notified_action === NotificationTreeItem.openPRAction){
            
        }
        return this.getRessource(light_str, 'create.svg');
    }

    iconPath = {
        light: this.stateDependentIcon("light"),
        dark: this.stateDependentIcon("dark"),
    };
}