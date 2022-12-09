import * as vscode from 'vscode';
import { Notification } from '../nodes/notifications';
import { Config } from '../config';
import { GiteaConnector } from '../gitea/giteaConnector';
import { Logger } from '../logger';

export class NotificationsProvider implements vscode.TreeDataProvider<Notification> {
    private _onDidChangeTreeData: vscode.EventEmitter<Notification | undefined | null | void> = new vscode.EventEmitter<Notification | undefined | null | void>();
    readonly onDidChangeTreeData: vscode.Event<Notification | undefined | null | void> = this._onDidChangeTreeData.event;

    private notificationsList: Notification[] = [];

    getTreeItem(element: Notification): vscode.TreeItem {
        return element;
    }

    private async getNotificationsAsync_(conn: GiteaConnector, url: string): Promise<Notification[]> {
        const notifications = [];
        const config = new Config();

        let page = 1;
        while (page < config.max_page_request+1) {
            Logger.log( `Retrieve notifications. page ${page}`);
            const notifsOfPage = (await conn.getNotifications(url, page)).data;    
            Logger.log( `${notifsOfPage.length} notifications retrieved (page: ${page})`);
            notifications.push(...notifsOfPage);
            notifsOfPage.forEach((c) => {              
                c.title = c.subject.title;
                c.type = c.subject.type;
                c.state = c.subject.state;
                c.label = `#${c.id} - ${c.title}`;
                c.notificationId = c.id;
                c.repo_url = c.repository.html_url;
                c.html_url = c.subject.html_url;
            });
            // for (let notif in notifsOfPage) {
            //     notif.comment = (await conn.getComment(config.apiUrl, notif.owner, notif.repo))
            // }
            page++;
            if (notifsOfPage.length < config.max_item_request) { // TODO move this limit to config
                break;
            }
        }

        return notifications;
    }

    private populate_command_on_click(notifications: Notification[]) {
        let notificationsList: Notification[] = [];

        notifications.forEach((element: Notification) => {
            let notification = Notification.createNotification(element);

            // Add on the fly the command
            notification.command = {
                command: 'giteaVscode.showNotification',
                title: '',
                arguments: [element],
            };
            notification.collapsibleState = vscode.TreeItemCollapsibleState.Collapsed;
            notification.contextValue = 'notification';

            // Push to issueList
            notificationsList.push(notification);

            Logger.debug('Notification processed', { 'id': notification.notificationId});
        });

        return notificationsList;
    }

    public async getNotificationsAsync() : Promise<Notification[]> {
        const config = new Config();
        const giteaConnector = new GiteaConnector(config.token, config.sslVerify);
        
        let notifications = (await this.getNotificationsAsync_(giteaConnector, config.apiUrl+"/notifications"));

        return this.populate_command_on_click(notifications); // TODO il doit y avoir moyen de simplifier le process
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

    public async markAsRead(notification: Notification) {
        const config = new Config();
        const giteaConnector = new GiteaConnector(config.token, config.sslVerify);

        await giteaConnector.setNotificationState(config.apiUrl, notification.notificationId, "read");
        
        // Remove read notification
        this.notificationsList.splice(
            this.notificationsList.findIndex(
                elt => elt.notificationId === notification.notificationId
            ), 1
        );

        this._onDidChangeTreeData.fire(undefined);
    }

    getChildren(element?: Notification): vscode.ProviderResult<any[]> {
        if(element !== undefined){
            let childItems: vscode.TreeItem[] = [
                new vscode.TreeItem('Type - ' + element.type   , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('ID - ' + element.notificationId , vscode.TreeItemCollapsibleState.None),
                new vscode.TreeItem('Repository - ' + element.repo_url , vscode.TreeItemCollapsibleState.None),
            ];
            return Promise.resolve(childItems);
        }
        return this.notificationsList;
    }
}