import { workspace, window } from 'vscode';

interface ConfigStorage {
    token: string;
    instanceURL: string;
    apiUrl: string;
    owner: string;
    repoList: Array<string>;
    sslVerify: boolean;
    baseURL: string;
    render: string;
    debug: boolean;
    autofetch_notifications: boolean;
    autofetch_notifications_period: number;
    max_page_request: number;
    max_item_request: number;
}

export interface ConfigTypes extends ConfigStorage {
    readonly repoApiUrlList: Array<string>;
}

export class Config implements ConfigTypes {
    private get storage() {
        return workspace.getConfiguration('gitea', null);
    }

    private loadConfigValue<T extends keyof ConfigStorage>(configKey: T, type: 'string' | 'string[]' | 'boolean' | 'number', acceptDetault = false): ConfigStorage[T] {
        if (!acceptDetault && !this.storage.has(configKey)) {
            window.showErrorMessage("Gitea-VSCode didn't find a required configuration value: " + configKey);
            throw new Error(`Failed to load configuration: "${configKey}"`);
        }

        const value = this.storage.has(configKey)
            ? (this.storage.get(configKey) as ConfigStorage[T])
            : (this.storage.inspect(configKey) as { defaultValue: ConfigStorage[T]; key: string }).defaultValue;

        if(type == 'string[]') {
            if (Array.isArray(value)) {
                var somethingIsNotString = false;
                value.forEach(function(item){
                    if(typeof item !== 'string'){
                        somethingIsNotString = true;
                    }
                })
                if(!somethingIsNotString && value.length > 0){
                    return value as ConfigStorage[T];
                }
            }
        }
        else if (typeof value === type && (type !== 'string' || (value as string).length > 0)) {
            return value as ConfigStorage[T];
        }

        window.showErrorMessage('Gitea-VSCode failed to load a configuration value that is needed: ' + configKey);
        throw new Error(`Failed to load configuration: "gitea.${configKey}"`);
    }

    public get apiUrl() {
        return this.instanceURL.replace(/\/$/, "") + '/api/v1';
    }

    public get token() {
        return this.loadConfigValue('token', 'string');
    }

    public set token(value) {
        this.storage.update('token', value);
    }

    public set instanceUrl(value: string) {
        this.storage.update('instanceURL', value);
    }

    public get instanceURL(): any {
        return this.loadConfigValue('instanceURL', 'string');
    }

    public get baseURL(): string {
        return this.loadConfigValue('baseURL', 'string');
    }

    public set baseURL(value) {
        this.storage.update('baseURL', 'string');
    }

    public get owner() {
        return this.loadConfigValue('owner', 'string');
    }

    public set owner(value) {
        this.storage.update('owner', value);
    }

    public get repoList() {
        return this.loadConfigValue('repoList', 'string[]');
    }

    public set repoList(value) {
        this.storage.update('repoList', value);
    }

    public get repoApiUrlList(): Array<string> {
        let urlList: Array<string> = [];
        this.repoList.forEach((repo: string) => {
            const url: string = 
                this.instanceURL.replace(/\/$/, "") +
                '/api/v1/repos/' +
                this.owner +
                '/' + repo + '/issues';
            urlList.push(url);
        });
        return urlList;
    }

    public set sslVerify(value) {
        this.storage.update('sslVerify', value);
    }

    public get sslVerify() {
        return this.loadConfigValue('sslVerify', 'boolean');
    }

    public get autofetch_notifications() {
        return this.loadConfigValue('autofetch_notifications', 'boolean');
    }

    public get autofetch_notifications_period() {
        return this.loadConfigValue('autofetch_notifications_period', 'number');
    }

    public get max_page_request() {
        return this.loadConfigValue('max_page_request', 'number');
    }

    public get max_item_request() {
        return this.loadConfigValue('max_item_request', 'number');
    }

    public get render() {
        return this.loadConfigValue('render', 'string');
    }

    public set render(value) {
        this.storage.update('render', value);
    }

    public set debug(value) {
        this.storage.update('debug', value);
    }

    public get debug(): boolean {
        return this.loadConfigValue('debug', 'boolean');
    }
}
