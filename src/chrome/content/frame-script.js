/*******************************************
 * Author: Kashif Iqbal Khan
 * Email: kashiif@gmail.com
 * License: MPL 1.1, MIT
 * Copyright (c) 2016 Kashif Iqbal Khan
 ********************************************/

(function() {

  let MSG_RECEIVE_ID = 'copy-urls-expert@kashiif-gmail.com::chrome';
  let MSG_SEND_ID = 'copy-urls-expert@kashiif-gmail.com::content';

  // frame scripts can import jsm
  //https://developer.mozilla.org/en-US/Firefox/Multiprocess_Firefox/Message_Manager/Performance
  Components.utils.import('resource://copy-urls-expert/selection-worker.jsm');


  function handleGetElementsInSelection(messageData) {
    let args = messageData.args;

    let entries = CUESelectionWorker(content.document)
                  .getEntriesFromSelection(args.tagName, args.filterDuplicates);

    let message = {
      request: {
        command: 'get-elements-in-selection',
        args: args,
        pipe: messageData.pipe
      },

      response: {
        entries: entries
      }
    };

    // respond back to chrome
    sendAsyncMessage(MSG_SEND_ID, message);
  }


  addMessageListener(MSG_RECEIVE_ID, {
    receiveMessage: function(message) {

      switch(message.data.command) {
        case 'get-elements-in-selection':
          handleGetElementsInSelection(message.data);
          break;

      }
    }
  });

})();