import * as vscode from 'vscode';
import { NotificationTreeItem } from '../nodes/notifications';
import { Config } from '../config';
import { GiteaConnector } from '../gitea/giteaConnector';
import { Logger } from '../logger';
import { CommentTreeItem } from '../nodes/comment';
import { IssueTreeItem } from '../nodes/issues';
import { IGitea } from '../gitea/IGiteaResponse';
import { isBigIntLiteral } from 'typescript';

export class NotificationsProvider implements vscode.TreeDataProvider<NotificationTreeItem> {
    private _onDidChangeTreeData: vscode.EventEmitter<NotificationTreeItem | undefined | null | void> = new vscode.EventEmitter<NotificationTreeItem | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<NotificationTreeItem | undefined | null | void> = this._onDidChangeTreeData.event;

    private notificationsList: NotificationTreeItem[] = [];

    getTreeItem(element: NotificationTreeItem): vscode.TreeItem {
        return element;
    }

    private async getNotificationsAsync_(conn: GiteaConnector): Promise<NotificationTreeItem[]> {
        const notifications: NotificationTreeItem[] = [];
        const config = new Config();
                let page = 1;
        while (page < config.max_page_request+1) {
            Logger.log( `Retrieve notifications. page ${page}`);
            const notifsOfPage = await conn.getNotifications(page);    
            Logger.log( `${notifsOfPage.length} notifications retrieved (page: ${page})`);
            
            // setup notifs
            let notifsOfPageTreeItem: NotificationTreeItem[] = [];
            notifsOfPage.forEach((notif : IGitea.NotificationThread) => {
                notifsOfPageTreeItem.push(NotificationTreeItem.createFromGitea(notif));
            });

            // Import last comment
            await Promise.all(notifsOfPageTreeItem.map(async (notif : NotificationTreeItem) => {
                if (!isNaN(notif.comment_id)){
                    notif.attached_comment = CommentTreeItem.createFromGitea(await conn.getComment(
                        notif.content.repository.owner.login, 
                        notif.content.repository.name, 
                        notif.comment_id
                    ));
                }
                else
                {
                    // get issue
                    const issue: IGitea.Issue = await conn.getIssue(
                        notif.content.repository.owner.login, 
                        notif.content.repository.name, 
                        parseInt(notif.content.subject.html_url.split('/').at(-1)!)
                    );
                    const new_comment: IGitea.Comment = {
                        body: issue.body,
                        created_at: issue.created_at,
                        html_url: issue.html_url,
                        issue_url: issue.html_url,
                        original_author: issue.user.login,
                        original_author_id: issue.user.id,
                        updated_at: issue.updated_at,
                        user: issue.user
                    };

                    notif.attached_comment = new CommentTreeItem(
                        "Issue state change", vscode.TreeItemCollapsibleState.Collapsed, 
                        new_comment,
                        issue.id,
                        issue.html_url.split('/').slice(0, -1).join('/')
                    );
                }
            }));
            
            // save notifs
            notifications.push(...notifsOfPageTreeItem);

            page++;
            if (notifsOfPage.length < config.max_item_request) { // TODO move this limit to config
                break;
            }
        }

        return notifications;
    }

    private populate_command_on_click(notifications: NotificationTreeItem[]) {
        
        notifications.forEach((notification: NotificationTreeItem) => {
            // Add on the fly the command
            notification.command = {
                command: 'giteaVscode.showNotification',
                title: '',
                arguments: [notification.content.id],
            };
            Logger.debug('Notification processed', { 'id': notification.content.id});
        });

        return notifications;
    }

    public async getNotificationsAsync() : Promise<NotificationTreeItem[]> {
        const config = new Config();
        const giteaConnector = new GiteaConnector(config.apiUrl, config.token, config.sslVerify);
        
        let notifications = (await this.getNotificationsAsync_(giteaConnector));

        return this.populate_command_on_click(notifications);
    }

    public async refresh() {
        Logger.debug("Refresh notification");
        this.notificationsList = (await this.getNotificationsAsync());
        this._onDidChangeTreeData.fire();
    }

    public async autorefresh(){
        const config = new Config();
        Logger.debug("Autofetch activated");
        while(1)
        {
            const timeout = new Promise(c => setTimeout(c, config.autofetch_notifications_period));
            if(config.autofetch_notifications)
            {
                await this.refresh();
                await timeout;
            } 
            else 
            {
                await timeout;
            }
        }
    }

    public async markAsRead(notification: NotificationTreeItem) {
        const config = new Config();
        const giteaConnector = new GiteaConnector(config.apiUrl, config.token, config.sslVerify);

        await giteaConnector.setNotificationState(notification.content.id, "read");
        
        // Remove read notification
        this.notificationsList.splice(
            this.notificationsList.findIndex(
                elt => elt.content.id === notification.content.id
            ), 1
        );

        this._onDidChangeTreeData.fire(undefined);
    }

    getChildren(element?: NotificationTreeItem): vscode.ProviderResult<any[]> {
        if(element !== undefined){
            let childItems: vscode.TreeItem[] = [
                new vscode.TreeItem('Type - ' + element.content.subject.type   , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('ID - ' + element.content.id , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('Repository - ' + element.content.repository.html_url , vscode.TreeItemCollapsibleState.None),
            ];
            return Promise.resolve(childItems);
        }
        return this.notificationsList;
    }

    public getNotification(notification_id: number) : NotificationTreeItem | undefined {
        let result = this.notificationsList.find( elt => elt.content.id === notification_id);
        if (result) {
            return result;
        }
        return undefined;
    }
}