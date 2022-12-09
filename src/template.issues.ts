import { Issue } from './nodes/issues';
import { Comment } from './nodes/comment';
import MarkdownIt = require('markdown-it');
import { NotEmittedStatement } from 'typescript';
import { Notification } from './nodes/notifications';

export function getBadges(issue: Issue) {
    return issue.labels.map(label => {
        return '![' + label.name + '](https://img.shields.io/badge/' + label.name + '-' + label.color + '.svg)'
    }).join(', ');
}

export function getAssignee(issue: Issue) {
    return issue.assignees === null ? "None" : issue.assignees.map(assignee => { return assignee.login }).join(', ');
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

export function markdown_render(md: string, elt: Issue | Notification): string {
    let markdownIt = new MarkdownIt();

    let html: string = ``;
    if(elt.hasOwnProperty("issueId")){
        html = markdownIt.render(md
            .replace('![image](/attachments/', "![image]("+elt.repo_url+"/attachments/")
        );
    } else if (elt.hasOwnProperty("notificationId")) {
        html = markdownIt.render(md);
    }

    html = html        
        .replaceAll('[ ]', '<input type="checkbox" disabled>')
        .replaceAll('[x]', '<input type="checkbox" disabled checked>')
        .replace(/([^"'])(https:\/\/[^ "'\)<]+)/g, '$1<a href=$2>$2</a>');

    return html;
}

export function showIssueHTML(issue: Issue) {
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
        .replaceAll('{{author}}', issue.creator)
        .replace('{{state}}', issue.state)
        .replace('{{assignees}}', getAssignee(issue))
        .replace('{{labels}}', markdown_render(": " + getBadges(issue), issue))
        .replace('{{html_url}}', issue.html_url)
        .replace('{{date}}', new Date(issue.created_at).toLocaleString())
        .replace('{{label}}', issue.label)
        .replace('{{description}}', markdown_render(issue.body, issue));

    
    let posts = ``;
    issue.comments.forEach((comment: Comment) => {
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
        .replace('{{author}}', comment.author)
        .replace('{{date}}', new Date(comment.created_at).toLocaleString())
        .replace('{{content}}', markdown_render(comment.body, issue));

        posts = posts + post;
    });

    return '<header>' + getStyle()       + '</header>' + 
           '<body>' + first_post + posts + '</body>';
}

export function showIssueMD(issue: Issue) {
    let md_labels = getBadges(issue);
    let assignees = getAssignee(issue);

    let md =  
`# {{title}} (#{{id}})

{{description}}

`
    .replace('{{title}}', issue.title)
    .replace('{{id}}', issue.issueId.toString())
    .replace('{{description}}', issue.body)

    let footer = 
`---

* State: {{state}}
* Assignee: {{assignee}}
* Labels: {{labels}}
* [See in browser]({{html_url}})
`
    .replace('{{state}}', issue.state)
    .replace('{{assignee}}', assignees)
    .replace('{{labels}}', md_labels)
    .replace('{{html_url}}', issue.html_url)

    let result = md;
    issue.comments.forEach((comment: Comment) => {
        result = result + 
`---

__{{author}}__ - *{{date}}*

{{content}}

`
        .replace('{{author}}', comment.author)
        .replace('{{date}}', new Date(comment.created_at).toLocaleString())
        .replace('{{content}}', comment.body)
        .replace('![image](/attachments/', "![image]("+issue.repo_url+"/attachments/")
    });
    result = result + footer

    return result
}


export function showNotificationHTML(notification: Notification) {
    let post = `
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
            </table>
            <a href={{html_url}}>View in browser</a>
        </div>
    `
        .replace('{{label}}', notification.label)    
        .replace('{{title}}', notification.title)
        .replace('{{type}}', notification.type)
        .replace('{{state}}', notification.state)
        .replaceAll('{{repo_url}}', notification.repo_url)
        .replace('{{html_url}}', notification.html_url);

    return '<header>' + getStyle() + '</header>' + 
           '<body>'   + post       + '</body>';
}

export function showNotificationMD(notification: Notification) {
    let md =  
`# {{label}}

- Type : {{type}}
- State : {{state}}
- Repository : {{repo_url}}

`
    .replace('{{label}}', notification.label)
    .replace('{{id}}', notification.notificationId.toString())
    .replace('{{type}}', notification.type)
    .replace('{{state}}', notification.state)
    .replace('{{repo_url}}', notification.repo_url);

    let footer = 
`---
* [See in browser]({{html_url}})
`
    .replace('{{html_url}}', notification.html_url);

    return md + footer;
}
