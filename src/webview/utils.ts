import * as vscode from 'vscode';

/**
 * A helper function which will get the webview URI of a given file or resource.
 *
 * @remarks This URI can be used within a webview's HTML as a link to the
 * given file/resource.
 *
 * @param webview A reference to the extension webview
 * @param extensionUri The URI of the directory containing the extension
 * @param pathList An array of strings representing the path to a file/resource
 * @returns A URI pointing to the file/resource
 */
export function getUri(webview: vscode.Webview, extensionUri: vscode.Uri, pathList: string[]) {
    return webview.asWebviewUri(vscode.Uri.joinPath(extensionUri, ...pathList));
}

export function getNonce() {
	let text = '';
	const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
	for (let i = 0; i < 32; i++) {
		text += possible.charAt(Math.floor(Math.random() * possible.length));
	}
	return text;
}

import MarkdownIt = require('markdown-it');
export function markdown_render(md: string): string {
    let markdownIt = new MarkdownIt();

    // TODO plutôt utiliser le moteur de rendu de gitea avec une requête POST
    let html: string = markdownIt.render(md);
    html = html        
        .replaceAll('[ ]', '<input type="checkbox" disabled>')
        .replaceAll('[x]', '<input type="checkbox" disabled checked>')
        .replace(/([^"'])(https:\/\/[^ "'\)<]+)/g, '$1<a href=$2>$2</a>');

    return html;
}