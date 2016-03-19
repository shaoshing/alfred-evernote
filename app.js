var MAX_RESULTS = 20;

var AlfredNode = require('alfred-workflow-nodejs'),
    actionHandler = AlfredNode.actionHandler,
    workflow = AlfredNode.workflow,
    Item = AlfredNode.Item,
    storage = AlfredNode.storage;

workflow.setName("Alfred/Evernote");

actionHandler.onAction("search", function(query) {
    var fs = require('fs'),
        devToken = storage.get("devToken");

    if (!devToken) {
        workflow.addItem(new Item({
            title: 'Please run "es-token" to setup your Evernote Token.',
            valid: false
        }));
        workflow.feedback();
        return;
    }

    var Evernote = require('evernote').Evernote,
        client = new Evernote.Client({token: devToken, sandbox: false}),
        userID = storage.get('userID'),
        shardID = storage.get('shardID');

    // Support Evernote Advanced Search Syntax
    // https://help.evernote.com/hc/en-us/articles/208313828-How-to-use-Evernote-s-advanced-search-syntax
    var filter = new Evernote.NoteFilter({ words: query, order: Evernote.NoteSortOrder.UPDATED });

    client.getNoteStore().findNotes(devToken, filter, 0, MAX_RESULTS, function (err, result) {
        if (err) {
            workflow.addItem(new Item({
                title: 'Hmm, unable to perform a search request. You may need a new token.',
                valid: false
            }));
            workflow.feedback();
            return;
        }

        result.notes.forEach(function (note) {
            workflow.addItem(new Item({
                uid: note.guid,
                title: note.title,
                arg: note.guid,
                valid: true,
                icon: 'note.png'
            }));
        })

        workflow.feedback();
    });
});

actionHandler.onAction("token", function(query) {
    var Evernote = require('evernote').Evernote,
        fs = require('fs'),
        token = query,
        client = new Evernote.Client({token: token, sandbox: false});

    client.getUserStore().getUser(function (err, user) {
        if (err) {
            console.log("Oops, your token seems invalid.");
            return;
        }
        
        storage.set('devToken', token);
        storage.set('userID', user.id);
        storage.set('shardID', user.shardId);

        console.log("Hooray, your token has been accepted! Your user ID is %s.", storage.get('userID'));
    });
});

actionHandler.onAction("get-link", function(linkType) {
    var userID = storage.get('userID'),
        shardID = storage.get('shardID'),
        noteGUID = process.argv[process.argv.length - 1];
    
    // https://dev.evernote.com/doc/articles/note_links.php
    switch (linkType) {
        case "app":    
            console.log("evernote:///view/%s/%s/%s/%s/", userID, shardID, noteGUID, noteGUID);
            break;
        case "www":
            console.log("https://www.evernote.com/shard/%s/nl/%s/%s/", shardID, userID, noteGUID);
            break;
    }
});

AlfredNode.run();
