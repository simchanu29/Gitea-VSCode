import { IssueTreeItem } from './nodes/issues';
import { CommentTreeItem } from './nodes/comment';
import MarkdownIt = require('markdown-it');
import { NotEmittedStatement } from 'typescript';
import { NotificationTreeItem } from './nodes/notifications';

export function getBadges(issue: IssueTreeItem) {
    return issue.content.labels.map(label => {
        return '![' + label.name + '](https://img.shields.io/badge/' + label.name + '-' + label.color + '.svg)'
    }).join(', ');
}

export function getAssignee(issue: IssueTreeItem) {
    return issue.content.assignees === null ? "None" : issue.content.assignees.map(assignee => { return assignee.login; }).join(', ');
}

function getStyle(): string {
    return `
    <style>
        .title-container { 
            padding-left: 1rem; 
            padding-right: 1rem; 
            padding-top: 0.785714rem; 
            padding-bottom: 0.785714rem
        }
        .post-container { 
            border: 1px solid #474747; 
            border-radius: 2px
        }
        .post-header { 
            border: 1px solid #474747; 
            background: #252526; 
            padding-left: 1rem; 
            padding-right: 1rem; 
            padding-top: 0.785714rem; 
            padding-bottom: 0.785714rem
        }
        .post-body {
            border: 1px solid #474747;  
            padding-left: 1rem; 
            padding-right: 1rem; 
            padding-top: 0.785714rem; 
            padding-bottom: 0.785714rem
        }
    </style>
    ` 
}

export function markdown_render(md: string, elt: IssueTreeItem | NotificationTreeItem | CommentTreeItem): string {
    let markdownIt = new MarkdownIt();

    let html: string = ``;
    if(elt.hasOwnProperty("repo_url"))
    {
        // html = markdownIt.render(md
        //     .replace('![image](/attachments/', "![image]("+elt.repo_url+"/attachments/")
        // );
        html = markdownIt.render(md);
    } else {
        html = markdownIt.render(md);
    }

    html = html        
        .replaceAll('[ ]', '<input type="checkbox" disabled>')
        .replaceAll('[x]', '<input type="checkbox" disabled checked>')
        .replace(/([^"'])(https:\/\/[^ "'\)<]+)/g, '$1<a href=$2>$2</a>');

    return html;
}

export function showIssueHTML(issue: IssueTreeItem) {
    let first_post = `
        <div class="title-container">
            <h1>{{label}}</h1>
            <table>
                <tr>
                    <td><b>State</b></td><td>: {{state}}</td>
                </tr>
                <tr>
                    <td><b>Author</b></td><td>: {{author}}</td>
                </tr>
                <tr>
                    <td><b>Assignees</b></td><td>: {{assignees}}</td>
                </tr>
                <tr>
                    <td><b>Labels</b></td><td>{{labels}}</td>
                </tr>
            </table>
            <a href={{html_url}}>View in browser</a>
        </div>
        <div class="post-container">
            <div class="post-header">
                <b>{{author}}</b> - <i>{{date}}</i>
            </div>
            <div class="post-body">
                {{description}}
            </div>
        </div>
    `
        .replace('{{label}}', issue.label)
        .replaceAll('{{author}}', issue.content.user.login)
        .replace('{{state}}', issue.content.state)
        .replace('{{assignees}}', getAssignee(issue))
        .replace('{{labels}}', markdown_render(": " + getBadges(issue), issue))
        .replace('{{html_url}}', issue.content.html_url)
        .replace('{{date}}', new Date(issue.content.created_at).toLocaleString())
        .replace('{{label}}', issue.label)
        .replace('{{description}}', markdown_render(issue.content.body, issue));

    
    let posts = ``;
    issue.comments.forEach((comment: CommentTreeItem) => {
        let post = `     
        <div class="post-container">
            <div class="post-header">
                <b>{{author}}</b> - <i>{{date}}</i>
            </div>
            <div class="post-body">
                {{content}}
            </div>
        </div>
        `        
        .replace('{{author}}', comment.content.user.login)
        .replace('{{date}}', new Date(comment.content.created_at).toLocaleString())
        .replace('{{content}}', markdown_render(comment.content.body, issue));

        posts = posts + post;
    });

    return '<header>' + getStyle()       + '</header>' + 
           '<body>' + first_post + posts + '</body>';
}

export function showIssueMD(issue: IssueTreeItem) {
    let md_labels = getBadges(issue);
    let assignees = getAssignee(issue);

    let md =  
`# {{title}} (#{{id}})

{{description}}

`
    .replace('{{title}}', issue.content.title)
    .replace('{{id}}', issue.content.id.toString())
    .replace('{{description}}', issue.content.body);

    let footer = 
`---

* State: {{state}}
* Assignee: {{assignee}}
* Labels: {{labels}}
* [See in browser]({{html_url}})
`
    .replace('{{state}}', issue.content.state)
    .replace('{{assignee}}', assignees)
    .replace('{{labels}}', md_labels)
    .replace('{{html_url}}', issue.content.html_url);

    let result = md;
    issue.comments.forEach((comment: CommentTreeItem) => {
        result = result + 
`---

__{{author}}__ - *{{date}}*

{{content}}

`
        .replace('{{author}}', comment.content.user.login)
        .replace('{{date}}', new Date(comment.content.created_at).toLocaleString())
        .replace('{{content}}', comment.content.body)
        .replace('![image](/attachments/', "![image]("+issue.repo_url+"/attachments/");
    });
    result = result + footer;

    return result;
}


export function showNotificationHTML(notification: NotificationTreeItem) {
    // TODO mettre cette partie dans la création de la notif/commentaire ?
    let action_str = "";
    if (!isNaN(notification.comment_id))
    {
        action_str = "Comment";
    }
    else {
        action_str = notification.notified_action;
    }
    
    let post: string = `
        <div class="title-container">
            <h1>{{label}}</h1>
            <table>
                <tr>
                    <td><b>Type</b></td><td>: {{type}}</td>
                </tr>
                <tr>
                    <td><b>State</b></td><td>: {{state}}</td>
                </tr>
                <tr>
                    <td><b>Title</b></td><td>: {{title}}</td>
                </tr>
                <tr>
                    <td><b>Repository</b></td><td>: <a href={{repo_url}}>{{repo_url}}</a></td>
                </tr>
                <tr>
                    <td><b>Action</b></td><td>: {{action}}</td>
                </tr>
            </table>
            <a href={{html_url}}>View in browser</a>
        </div>
    `
        .replace('{{label}}', notification.label)    
        .replace('{{title}}', notification.content.subject.title)
        .replace('{{type}}', notification.content.subject.type)
        .replace('{{action}}', action_str)
        .replace('{{state}}', notification.content.subject.state)
        .replaceAll('{{repo_url}}', notification.content.repository.html_url)
        .replace('{{html_url}}', notification.content.url);

    let comment: string = ``;
    // if (!isNaN(notification.comment_id)) {
        comment = `
        <div class="post-container">
            <div class="post-header">
                <b>{{author}}</b> - <i>{{date}}</i>
            </div>
            <div class="post-body">
                {{content}}
            </div>
        </div>
        `        
        .replace('{{author}}', notification.attached_comment!.content.user.login)
        .replace('{{date}}', new Date(notification.attached_comment!.content.created_at).toLocaleString())
        .replace('{{content}}', markdown_render(notification.attached_comment!.content.body, notification));
    // }

    return '<header>' + getStyle()     + '</header>' + 
           '<body>'   + post + comment + '</body>';
}

export function showNotificationMD(notification: NotificationTreeItem) {
    let md =  
`# {{label}}

- Type : {{type}}
- State : {{state}}
- Repository : {{repo_url}}

`
    .replace('{{label}}', notification.label)
    .replace('{{id}}', notification.content.id.toString())
    .replace('{{type}}', notification.content.subject.type)
    .replace('{{state}}', notification.content.subject.type)
    .replace('{{repo_url}}', notification.content.repository.html_url);

    let footer = 
`---
* [See in browser]({{html_url}})
`
    .replace('{{html_url}}', notification.content.url);

    return md + footer;
}
