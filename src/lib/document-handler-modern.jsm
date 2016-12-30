/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['documentHandler'];

Components.utils.import('resource://copy-urls-expert/chrome-utils.jsm');
Components.utils.import('resource://copy-urls-expert/copy-task.jsm');
Components.utils.import('resource://copy-urls-expert/open-urls-task.jsm');

let MSG_RECEIVE_ID = 'copy-urls-expert@kashiif-gmail.com::content';
let MSG_SEND_ID = 'copy-urls-expert@kashiif-gmail.com::chrome';

let commands = {


  'copy-to-clipboard': function(message) {
    // do the actual action that we want to do with the entries
    let entries = message.data.response.entries,
        commandArgs = message.data.request.args;

    copyEntriesToClipBoard(entries, null, commandArgs.template);
  },

  'open-urls': function(message) {
    // do the actual action that we want to do with the entries
    let entries = message.data.response.entries.map(function(entry) {
      return entry.url;
    });

    openAllUrls(entries);
  }

}


function _handleMessageFromFrameScript(message) {
  // Frame script has returned us the entries from selection

  let pipe = message.data.request.pipe;

  if (commands.hasOwnProperty(pipe)) {
    commands[pipe](message);
  }
  else {
    // TODO: report error - unknown command
  }

}

var documentHandler = {
  init: function(args) {

    let mm = args.messageManager;
    mm.loadFrameScript('chrome://copy-urls-expert/content/frame-script.js', true);
    mm.addMessageListener(MSG_RECEIVE_ID, _handleMessageFromFrameScript);
  },

  _sendMessageToFrameScript: function(msgPayload) {
    let gBrwsr = getGBrowser();

    let frameMessageManager = gBrwsr.selectedBrowser.messageManager;
    frameMessageManager.sendAsyncMessage(MSG_SEND_ID, msgPayload, {});
  },

  /*
   Copies a list of urls to clipboard
   @param: tagName - Name of tag to process e.g. a, img
   @param: entryExtractor - pointer to a function that accepts two arguments item and selection
   */
  extractAndCopyUrlsFromSelection: function (options) {
    let msgPayload = {
      command: 'get-elements-in-selection',
      pipe: 'copy-to-clipboard',
      args: options
    };

    this._sendMessageToFrameScript(msgPayload);
  },

  openUrlsInSelection: function (options) {

    options.tagName = 'a';

    let msgPayload = {
      command: 'get-elements-in-selection',
      pipe: 'open-urls',
      args: options
    };

    this._sendMessageToFrameScript(msgPayload);

  },

  uninit: function(args) {
    let mm = args.messageManager;
    mm.removeMessageListener(MSG_RECEIVE_ID, _handleMessageFromFrameScript);
  }

};