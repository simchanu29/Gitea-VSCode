import * as vscode from 'vscode';
import { WebviewPanel } from 'vscode';

export class GiteaWebView {

    public panel: vscode.WebviewPanel;

    constructor() {
        this.panel = vscode.window.createWebviewPanel(
            'panel',
            "test",
            vscode.ViewColumn.Active,
            {
                enableScripts: true
            }
        );

        this.panel.webview.html = `
            <body>
            <h1>Issue</h1>
            <form>
                <input type="text"></input>
                <input type="submit" value="Submit">
            </form>
            </body>`;

        // this.panel.reveal()
        // this.panel.webview.

        // vscode.window.registerWebviewViewProvider()
    }
}