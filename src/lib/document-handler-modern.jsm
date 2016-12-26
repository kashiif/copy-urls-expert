/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

var EXPORTED_SYMBOLS = ['documentHandler'];

Components.utils.import('resource://copy-urls-expert/copy-task.jsm');

let MSG_RECEIVE_ID = 'copy-urls-expert@kashiif-gmail.com::content';
let MSG_SEND_ID = 'copy-urls-expert@kashiif-gmail.com::chrome';

function _handleMessageFromFrameScript(message) {
  let entries = message.data.response.entries,
      commandArgs = message.data.request.args;

  copyEntriesToClipBoard(entries, null, commandArgs.template);
}

var documentHandler = {
  init: function(args) {

    let mm = args.messageManager;
    mm.loadFrameScript('chrome://copy-urls-expert/content/frame-script.js', true);
    mm.addMessageListener(MSG_RECEIVE_ID, _handleMessageFromFrameScript);
	},

  /*
   Copies a list of urls to clipboard
   @param: tagName - Name of tag to process e.g. a, img
   @param: entryExtractor - pointer to a function that accepts two arguments item and selection
   */
  extractAndCopyUrlsFromSelection: function (options) {
    let browserWin = Components.classes['@mozilla.org/appshell/window-mediator;1']
                      .getService(Components.interfaces.nsIWindowMediator)
                      .getMostRecentWindow('navigator:browser');

    let browserMM = browserWin.messageManager;

    browserMM = this.messageManager;

    let msgPayload = {
      command: 'get-elements-in-selection',
      args: options
    };

    let frameMessageManager = browserWin.copyUrlsExpert._gBrowser().selectedBrowser.messageManager;
    frameMessageManager.sendAsyncMessage(MSG_SEND_ID, msgPayload, {});
  },

	uninit: function(args) {
    let mm = args.messageManager;
    mm.removeMessageListener(MSG_RECEIVE_ID, _handleMessageFromFrameScript);
	}

};