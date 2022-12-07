import { Comment, Issue } from './treenodes';
import MarkdownIt = require('markdown-it');

export function showIssueHTML(issue: Issue) {
    let markdownIt = new MarkdownIt()

    let style = `
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

    let first_post = `
        <div class="title-container">
            <h1>{{label}}</h1>
            <table>
                <tr>
                    <td><b>State</b></td><td>: {{state}}</td>
                </tr>
                <tr>
                    <td><b>Assignee</b></td><td>: {{assignee}}</td>
                </tr>
            </table>
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
        .replace('{{state}}', issue.state)
        .replace('{{assignee}}', issue.assignee)
        .replace('{{author}}', issue.creator)
        .replace('{{date}}', issue.created_at)
        .replace('{{description}}', markdownIt.render(issue.body))
        .replace('{{label}}', issue.label);

    
    let posts = ``
    issue.comments.forEach((comment: Comment) => {
        // <div style="border: 1px solid; padding-left: 1rem; padding-right: 1rem; padding-top: 0.785714rem; padding-bottom: 0.785714rem>
        // <div style="border: 1px solid; background: #f7f7f7; padding-left: 1rem; padding-right: 1rem; padding-top: 0.785714rem; padding-bottom: 0.785714rem">

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
        .replace('{{date}}', comment.created_at)
        .replace('{{content}}', markdownIt.render(comment.body))

        posts = posts + post 
    });

    return '<header>' + style + '</header>' + '<body>' + first_post + posts + '</body>'
}


export function showIssueMD(issue: Issue) {
    let md_labels = issue.labels.map(label => {
        return '![' + label.name + '](https://img.shields.io/badge/' + label.name + '-' + label.color + '.svg)'
    }).join(', ')

    let assignees = issue.assignees === null ? "Nobody" : issue.assignees.map(assignee => { return assignee.login }).join(', ');

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
        .replace('{{date}}', comment.created_at)
        .replace('{{content}}', comment.body)
        .replace('![image](/attachments/', "![image]("+issue.repo_url+"/attachments/")
    });
    result = result + footer

    return result
}
