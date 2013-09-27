'use strict';
var copyUrlsExpert = {
	_prefService: null,
	SORT_BY_TAB_ORDER: 'default',
	SORT_BY_DOMAIN: 'domain',
	SORT_BY_TITLE: 'title',
	TBB_ACTION_ACTIVE_WIN: 'active-win',
	TBB_ACTION_ACTIVE_TAB: 'active-tab',
	TBB_ACTION_ACTIVE_TABGROUP: 'active-tabgroup',
	TBB_ACTION_ALL_WIN: 'all-win',
	TBB_ACTION_OPEN_TABS: 'open-tabs',
	LINE_FEED:'\r\n',
	FUEL_KEY_DEFUALT_PATTERN: 'extensions.copyurlsexpert.defaulttemplate',
	FUEL_KEY_ALL_PATTERNS: 'extensions.copyurlsexpert.urltemplates',

	
	_AsynHandler: function(file, oPrefs) {
		this.file = file;
		this.oPrefs = oPrefs;
	},	
	
	handleLoad: function(evt) {
		window.removeEventListener('load', copyUrlsExpert.handleLoad);
		window.addEventListener('unload', copyUrlsExpert.handleUnload, false);
		window.setTimeout(function() { copyUrlsExpert.init(); }, 50 );
	},

	init: function() {
		this._prefService = this._getPrefService();
		this._handleStartup();
	
		var platformStr =  Components.classes['@mozilla.org/network/protocol;1?name=http'].getService(Components.interfaces.nsIHttpProtocolHandler).oscpu.toLowerCase();

		if (platformStr.indexOf('win') != -1) {
		  this.LINE_FEED = '\r\n';
		}
		else if (platformStr.indexOf('mac') != -1) {
		  this.LINE_FEED = '\r';
		}
		else if (platformStr.indexOf('unix') != -1
					|| platformStr.indexOf('linux') != -1
					|| platformStr.indexOf('sun') != -1) {
		  this.LINE_FEED = '\n';
		}

		Components.utils.import('resource://copy-urls-expert/cue-classes.jsm', copyUrlsExpert);
					
		this._AsynHandler.prototype.handleFetch = function(inputStream, status) {
			if (!Components.isSuccessCode(status)) {
				// Handle error!
				alert('Copy Urls Expert: Error reading templates list file.\n.' + status); // TODO: localize it
				return;
			}

			// The file data is contained within inputStream.
			// You can read it into a string with
			var data = '';
			var target = [];
			var index;
			
			var converterStream = null;
			try {
				//data = NetUtil.readInputStreamToString(inputStream, inputStream.available());
				
				converterStream = Components.classes["@mozilla.org/intl/converter-input-stream;1"]  
								   .createInstance(Components.interfaces.nsIConverterInputStream);  
				converterStream.init(inputStream, 'UTF-8', 1024, Components.interfaces.nsIConverterInputStream.DEFAULT_REPLACEMENT_CHARACTER);  

				var input = {};
				// read all "bytes" (not characters) into the input
				var numChars = converterStream.readString(inputStream.available(), input);  
				if (numChars != 0) /* EOF */
					data = input.value;  				
				
				index  = copyUrlsExpert._updateModel(data, target);
			}
			catch(ex) {
				Components.utils.reportError('Copy Urls Expert: ' + ex);
				alert('Copy Urls Expert: Error reading templates list file.\nRestoring to default values.'); // TODO: localize it
				target = [];
				index = copyUrlsExpert._setupDefaultModel(target);
				
				// attempt to update file
				var defaultContent = '0' + copyUrlsExpert.LINE_FEED + target.join(copyUrlsExpert.LINE_FEED);
				copyUrlsExpert._writeDataToFile(defaultContent, this.file, function(inputStream, status) {
						if (!Components.isSuccessCode(status)) {
							// Handle error!
							alert('Copy Urls Expert: Failed to write to templates list file (default values): ' + status); // TODO: localize it
							return;
						} });
				
			}
			finally {
				if (converterStream) {
					try { converterStream.close(); }
					catch(ex) { Components.utils.reportError('Copy Urls Expert: Error while closing file - ' + ex); }
				}
			}

			Application.storage.set(copyUrlsExpert.FUEL_KEY_ALL_PATTERNS, target);
			Application.storage.set(copyUrlsExpert.FUEL_KEY_DEFUALT_PATTERN, target[index]);

			};
			
		this._AsynHandler.prototype.handleUpdate =  function(status) {  
			if (!Components.isSuccessCode(status)) {  
				// Handle error!
				alert('Copy Urls Expert: Failed to update file templates list file: ' + status);
				return;  
			}  
			
			// Data has been written to the file.
			// First update the preferences to store the path of file
			var relFile = Components.classes['@mozilla.org/pref-relativefile;1'].createInstance(Components.interfaces.nsIRelativeFilePref);  
			relFile.relativeToKey = 'ProfD'; // or any other string listed above  
			relFile.file = this.file;             // |file| is nsILocalFile  
			this.oPrefs.setComplexValue('urltemplatesfile', Components.interfaces.nsIRelativeFilePref, relFile);			  
		};
		
		var cm = document.getElementById('contentAreaContextMenu');
		if (cm != null)	{
			cm.addEventListener('popupshowing', function (evt) { copyUrlsExpert.onContentContextMenuShowing(evt); }, false);
			this._readTemplates();
		}
	},
	
	handleUnload: function(evt) {
		var cm = document.getElementById('contentAreaContextMenu');
		if (cm != null)	{
			cm.removeEventListener('popupshowing', copyUrlsExpert.onContentContextMenuShowing);
		}
		window.removeEventListener('unload', copyUrlsExpert.handleUnload);

	},

	_handleStartup: function() {
		var oldVersion = '___version___';
		var currVersion = '___version___';
		
		try {
			oldVersion = this._prefService.getCharPref('version');
		}
		catch(e) {}
		
		if (oldVersion != currVersion) {
			this._prefService.setCharPref('version', currVersion);
			try {
				setTimeout(function() { copyUrlsExpert._welcome(currVersion); },100);
			}
			catch(e) {}
		}
	},
	
	_welcome: function(version) {
		try {
			var url = 'http://www.kashiif.com/firefox-extensions/copy-urls-expert/copy-urls-expert-welcome/?v='+version;
			openUILinkIn( url, 'tab');
		} 
		catch(e) {}
	},	
	
	_getPrefService: function() {
		var prefService = null;
		try 
		{
			prefService = gPrefService;
		}
		catch(err)
		{
			// gPrefService not available in SeaMonkey
			prefService = Components.classes['@mozilla.org/preferences-service;1'].getService(Components.interfaces.nsIPrefService);
		}
		
		prefService = prefService.getBranch('extensions.copyurlsexpert.');
		return prefService;
	},
	
	_compareEntriesByTitle: function(a, b) {
	   if (a.title.toLowerCase() < b.title.toLowerCase())
		  return -1
	   if (a.title.toLowerCase() > b.title.toLowerCase())
		  return 1
	   // a must be equal to b
	   return 0
	},

	_compareEntriesByUrl: function(a, b) {
	   if (a.url.toLowerCase() < b.url.toLowerCase())
		  return -1
	   if (a.url.toLowerCase() > b.url.toLowerCase())
		  return 1
	   // a must be equal to b
	   return 0
	},

	_UrlEntry: function (title,url,tab) {
	   this.title=title;
	   this.url=url;
	   this.tab=tab;
	},
	
	_getEntriesFromTabs: function(aBrowsers, filterHidden) {
		var title = '';
		var url = '';
		var entries = [];

		for(var i = 0; i < aBrowsers.length; i++) {
			var tabbrowser = aBrowsers[i].gBrowser;
			var tabHistory = aBrowsers[i].sessionHistory;
			
			// Check each tab of this tabbrowser instance
			var numTabs = tabbrowser.browsers.length,
				tabContainer = tabbrowser.tabContainer;
			
			for (var index = 0; index < numTabs; index++) { 
				var targetBrwsr = tabbrowser.getBrowserAtIndex(index),
					targetTab = tabContainer.getItemAtIndex(index)

				if (filterHidden && targetTab.hidden) continue;
				
				var auxTemp = this._getEntryForTab(targetBrwsr, targetTab);
				entries.push(auxTemp);
			}
		}
		
		return entries;		
	},

	_getEntryForTab: function(brwsr, tab) {
		var url = brwsr.currentURI.spec;
		
		var title = brwsr.contentTitle;
		
		if (!title && tab) {
			title = tab.label;
		}

		var auxTemp = new copyUrlsExpert._UrlEntry(title,url);
		return auxTemp;
	},
	
	/*
	Returs a list of entries objects
	@param: tagName - Name of tag to process e.g. a, img
	@param: entryExtractor - pointer to a function that accpets two arguments item and selection
	*/
	_getEntriesFromSelection: function(tagName, entryExtractor) {
		var entries = [];

		// get the content document
		var focusedWindow = document.commandDispatcher.focusedWindow;
		var focusedDoc = document.commandDispatcher.focusedWindow.document;
		
		var sel = focusedWindow.getSelection();
		var items = focusedDoc.getElementsByTagName(tagName);
		
		for (var i=0;i < items.length;i++) {
			var item = items[i];
			var entry = entryExtractor(item, sel);
			
			if (entry) {
				entries.push(entry);
			}
			else if (entries.length) {
				// selections must be continuous
				break;
			}
		}		
		return entries;		
	},
	
	getEntryFromLink: function(link, sel) {
		var entry = null;
		// skip named anchors
		if (link.href && sel.containsNode(link, true)) {
			var title = link.title;
			if (title == '')
			{
				title = link.text.trim();
			}		
			entry = new copyUrlsExpert._UrlEntry(title,link.href);
		}
		return entry;
	},
	
	getEntryFromImage: function(image, sel) {
		var entry = null;
		// skip named anchors
		if (sel.containsNode(image, true)) {
			var title = image.title;
			if (title == '')
			{
				title = image.name;
			}
			if (title == '')
			{
				title = image.alt;
			}
			
			entry = new copyUrlsExpert._UrlEntry(title,image.src);
		}
		return entry;
	},	
	
	_copyEntriesToClipBoard: function(entries,oPrefs) {

		switch(oPrefs.getCharPref('sortby')) {
			case copyUrlsExpert.SORT_BY_TITLE:
				entries.sort(copyUrlsExpert._compareEntriesByTitle);
				break;
			case copyUrlsExpert.SORT_BY_DOMAIN:
				entries.sort(copyUrlsExpert._compareEntriesByUrl);
				break;
		}
		
		var defUrlPattern = Application.storage.get(copyUrlsExpert.FUEL_KEY_DEFUALT_PATTERN, '');
		var str = copyUrlsExpert._transform(defUrlPattern, entries);

		//alert(str);
		if(str != null && str.length > 0) {
			var oClipBoard = Components.classes['@mozilla.org/widget/clipboardhelper;1'].getService(Components.interfaces.nsIClipboardHelper);
			oClipBoard.copyString(str);
		}
	},

  // dateUtils.format()
  formatDate: function(d, f) {
    // make a single digit two digit by prefixing 0
    function t(n) n<10? "0"+n:n;
    
    var h = d.getHours(), 
        m = d.getMinutes(),
        s = d.getSeconds();
  
    var strDate = f.replace(/YYYY/g, d.getFullYear())
             .replace(/YY/g, d.getFullYear().toString().substr(2))
             .replace(/mm/g, t(d.getMonth()))
             .replace(/dd/g, t(d.getDate()))
             .replace(/HH/g, t(h))  // 24-hour clock
             .replace(/hh/g, t(h>12?h-12:h))
             .replace(/h/gi, h)
             .replace(/MM/g, t(m))
             .replace(/M/g, m)
             .replace(/SS/g, t(s))
             .replace(/S/g, s);
             
    return strDate;
  },

	_transform: function(fmtPattern, entries) {
		var returnValue = '';

		var d = new Date();
		
		var strDate = d.toLocaleString();
		var strTime = d.getTime();
		
		var pattern = fmtPattern.pattern;
		
		for(var i = 0; i < entries.length; i++) {
			var entry = entries[i];			
			var mystring = pattern.replace(/\$title/gi,entry.title);
			mystring = mystring.replace(/\$url/gi,entry.url);
			mystring = mystring.replace(/\$index/gi,i+1);
			returnValue += mystring;
		}
		
		returnValue = fmtPattern.prefix + returnValue + fmtPattern.postfix;

    // http://stackoverflow.com/questions/1234712/javascript-replace-with-reference-to-matched-group
		returnValue = returnValue.replace(/\$date\((.+?)\)/g, function(match, grp1){
                        return copyUrlsExpert.formatDate(d, grp1);
                      });

		returnValue = returnValue.replace(/\$date/gi, strDate);
		returnValue = returnValue.replace(/\$time/gi, strTime);
		returnValue = returnValue.replace(/\$n/gi, copyUrlsExpert.LINE_FEED);
		returnValue = returnValue.replace(/\$t/gi, '\t');

		return returnValue;
	},

	_gBrowser: function() {
		var _g = null;
		if (typeof(gBrowser) == undefined) {
			// gBrowser is not available in Seamonkey
			_g = doc.getElementById('content');			
		} else {
			_g = gBrowser;
		}
		return _g;
	},

	performCopyActiveTabUrl: function() {
		var _g = this._gBrowser();

		var entries = [copyUrlsExpert._getEntryForTab(_g.selectedBrowser)];
	
		copyUrlsExpert._copyEntriesToClipBoard(entries, copyUrlsExpert._prefService);
	},

	_getBrowsers: function(onlyActiveWindow) {
		var aBrowsers = new Array();       
		
		var winMediator = Components.classes['@mozilla.org/appshell/window-mediator;1'].getService(Components.interfaces.nsIWindowMediator);
		if (onlyActiveWindow) {
			aBrowsers.push(winMediator.getMostRecentWindow('navigator:browser'));
		}
		else {
			var browserEnumerator = winMediator.getEnumerator('navigator:browser');
			// Iterate all open windows
			while (browserEnumerator.hasMoreElements()) {
				aBrowsers.push(browserEnumerator.getNext());
			}
		}
		
		return aBrowsers;
	},
	
	performCopyTabsUrl: function(onlyActiveWindow, filterHidden) {
		var aBrowsers = copyUrlsExpert._getBrowsers(onlyActiveWindow);
		
		var entries = copyUrlsExpert._getEntriesFromTabs(aBrowsers, filterHidden);
		
		copyUrlsExpert._copyEntriesToClipBoard(entries, copyUrlsExpert._prefService);
					
	},
	
	performCopySelectedUrls : function(tagName, entryExtractor) {
		var entries = copyUrlsExpert._getEntriesFromSelection(tagName, entryExtractor);
		copyUrlsExpert._copyEntriesToClipBoard(entries, copyUrlsExpert._prefService);
	},
	
	onContentContextMenuShowing: function(evt) {
		if (evt.target.id == 'contentAreaContextMenu')
		{
			var f = copyUrlsExpert._isEmptySelection();

			var mnuItm = document.getElementById('copyurlsexpert-contextmenu-mainmenu');
			mnuItm.collapsed = f;
		}
	},
	
	_isEmptySelection: function () {
		// Check if there is some text selected

		var focusedWindow = document.commandDispatcher.focusedWindow;
		var sel = focusedWindow.getSelection.call(focusedWindow);		
		return sel.isCollapsed;
	},

	handleToolbarButtonClick: function(evt) {
	
		switch (evt.target.id) {
			case 'copyurlsexpert-toolbar-btnmain':
				switch(copyUrlsExpert._prefService.getCharPref('toolbaraction')) {
					case copyUrlsExpert.TBB_ACTION_ACTIVE_WIN:
						copyUrlsExpert.performCopyTabsUrl(true);
						break;
					case copyUrlsExpert.TBB_ACTION_ACTIVE_TABGROUP:
						copyUrlsExpert.performCopyTabsUrl(true, true);
						break;
					case copyUrlsExpert.TBB_ACTION_ACTIVE_TAB:
						copyUrlsExpert.performCopyActiveTabUrl();
						break;
					case copyUrlsExpert.TBB_ACTION_ALL_WIN:
						copyUrlsExpert.performCopyTabsUrl(false);
						break;
					case copyUrlsExpert.TBB_ACTION_OPEN_TABS:
						document.getElementById('copyurlsexpert-command-opentabs').doCommand();
						break;
				}
				break;
			case 'copyurlsexpert-toolbar-btnactivewin':
				copyUrlsExpert.performCopyTabsUrl(true);
				break;
			case 'copyurlsexpert-toolbar-btnactivetabgroup':
				copyUrlsExpert.performCopyTabsUrl(true, true);
				break;
			case 'copyurlsexpert-toolbar-btnactivetab':
				copyUrlsExpert.performCopyActiveTabUrl();
				break;
			case 'copyurlsexpert-toolbar-btnallwin':
				copyUrlsExpert.performCopyTabsUrl(false);
				break;
			case 'copyurlsexpert-toolbar-btnoptions':
				copyUrlsExpert.showOptionsWindow();
				break;
		}
	},
	
	showOptionsWindow: function() {
		//window.open('chrome://copy-urls-expert/content/dialogs/options.xul', 'copyUrlsExpertOptionsWindow', 'addressbar=no, modal');

         var features = "chrome,titlebar,toolbar,centerscreen";
         try {
           var instantApply = Services.prefs.getBoolPref('browser.preferences.instantApply');
           features += instantApply ? ",dialog=no" : ",modal";
         } catch (e) {
           features += ",modal";
         }
         openDialog('chrome://copy-urls-expert/content/dialogs/options.xul', '', features);
	},


	_getClipboardText: function() {
		var clip = Components.classes['@mozilla.org/widget/clipboard;1'].getService(Components.interfaces.nsIClipboard);  
		if (!clip) return null;  
		  
		var trans = Components.classes['@mozilla.org/widget/transferable;1'].createInstance(Components.interfaces.nsITransferable);
		if (!trans) return null;  
		
		var source = window;
		
		// Ref: https://developer.mozilla.org/en-US/docs/Using_the_Clipboard
		if ('init' in trans) {
			// When passed a Window object, find a suitable provacy context for it.
			if (source instanceof Ci.nsIDOMWindow)
				// Note: in Gecko versions >16, you can import the PrivateBrowsingUtils.jsm module
				// and use PrivateBrowsingUtils.privacyContextFromWindow(sourceWindow) instead
				source = source.QueryInterface(Ci.nsIInterfaceRequestor)
                           .getInterface(Ci.nsIWebNavigation);
 
			trans.init(source);
		}	
		
		trans.addDataFlavor('text/unicode');

	    clip.getData(trans, clip.kGlobalClipboard);  
	      
	    var str       = new Object();  
	    var strLength = new Object();  
	      
	    trans.getTransferData("text/unicode", str, strLength);  

	    if (str) {  
	      str = str.value.QueryInterface(Components.interfaces.nsISupportsString);  
	      str = str.data.substring(0, strLength.value / 2);  
	    }  

	    return str;
	},

	/**
	This function is called from Open Tabs Dialog
	*/
	openTabs: function () {
		var sUrl = this._getClipboardText();

		// the following regex is extracting urls from any text
		var myRe=/((https?):\/\/((?:(?:(?:(?:(?:[a-zA-Z0-9][-a-zA-Z0-9]*)?[a-zA-Z0-9])[.])*(?:[a-zA-Z][-a-zA-Z0-9]*[a-zA-Z0-9]|[a-zA-Z])[.]?)|(?:[0-9]+[.][0-9]+[.][0-9]+[.][0-9]+)))(?::((?:[0-9]*)))?(\/(((?:(?:(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*)(?:;(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*))*)(?:\/(?:(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*)(?:;(?:(?:[a-zA-Z0-9\-_.!~*'():@&=+$,^#]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*))*))*))(?:[?]((?:(?:[;\/?:@&=+$,^#a-zA-Z0-9\-_.!~*'()]+|(?:%[a-fA-F0-9][a-fA-F0-9]))*)))?))?)/ig;
		var myArray = null;

		var urls  = [];
		while ((myArray = myRe.exec(sUrl))) {
			var newUrl = String(myArray[0]);
			urls.push(newUrl);			
		}

		if (!urls.length) return true;

		var _g = this._gBrowser();

		var aBrowsers = _g.browsers;

		var start = 0;
		var webNav = aBrowsers[aBrowsers.length-1].webNavigation;
		if (webNav.currentURI.spec == 'about:blank') {
			// yes it is empty
			_g.loadURI(urls[0]);
			start++;
		}
		
		var delayStep = copyUrlsExpert._prefService.getIntPref('opentabdelaystepinmillisecs');
		for (; start<urls.length; start++) {
			window.setTimeout( function(u) {_g.addTab(u);}, delayStep*start, urls[start]);
		}

		return true;		
	},
	
	_readTemplates: function() {		
		var templatesPrefName = 'urltemplatesfile';

		var file = null;
		
		Components.utils.import('resource://gre/modules/NetUtil.jsm'); 	
		Components.utils.import('resource://gre/modules/FileUtils.jsm'); 
		
		if (this._prefService.prefHasUserValue(templatesPrefName))	{
			var v = this._prefService.getComplexValue(templatesPrefName, Components.interfaces.nsIRelativeFilePref);
			file = v.file;
						
			if(file.exists()) {
				var fetchHandler = new this._AsynHandler(v.file, this._prefService);
				NetUtil.asyncFetch(v.file, function(inputStream, status) { fetchHandler.handleFetch(inputStream, status); });			
				return;
			}
		}
		
		var target = [];
		var index  = this._setupDefaultModel(target);

		var defaultContent = '0' + copyUrlsExpert.LINE_FEED + target.join(copyUrlsExpert.LINE_FEED);

		this.updateUrlListFile(defaultContent);
		
		// Do not wait for file write and update model		
		Application.storage.set(copyUrlsExpert.FUEL_KEY_ALL_PATTERNS, target);
		Application.storage.set(copyUrlsExpert.FUEL_KEY_DEFUALT_PATTERN, target[index]);
	},
	
	updateUrlListFile: function(theContent) {
		// Write to prefs 
		// get profile directory  
		var file = Components.classes['@mozilla.org/file/directory_service;1'].getService(Components.interfaces.nsIProperties).get('ProfD', Components.interfaces.nsIFile);
		file.append('copyurlsexpert');
		if( !file.exists() || !file.isDirectory() ) {
			// if it doesn't exist, create   
			file.create(Components.interfaces.nsIFile.DIRECTORY_TYPE, 0x1FF);   // 0x1FF = 0777
		}
		
		file.append('urls.templates'); 
		
 		var updateHandler = new copyUrlsExpert._AsynHandler(file, copyUrlsExpert._prefService);
		copyUrlsExpert._writeDataToFile(theContent, file, function(inputStream, status) { updateHandler.handleUpdate(inputStream, status); });
	},
	
	_writeDataToFile: function(content, file, fptr) {
		// file is nsIFile, content is a string  
		
		Components.utils.import('resource://gre/modules/NetUtil.jsm'); 	
		Components.utils.import('resource://gre/modules/FileUtils.jsm'); 
		// You can also optionally pass a flags parameter here. It defaults to  
		// FileUtils.MODE_WRONLY | FileUtils.MODE_CREATE | FileUtils.MODE_TRUNCATE;  
		var ostream = FileUtils.openSafeFileOutputStream(file)  
		  
		var converter = Components.classes['@mozilla.org/intl/scriptableunicodeconverter'].createInstance(Components.interfaces.nsIScriptableUnicodeConverter);  
		converter.charset = 'UTF-8';  
		var istream = converter.convertToInputStream(content);  
		
		// The last argument (the callback) is optional.  
		NetUtil.asyncCopy(istream, ostream, fptr);  
	},
	
	/*
	Fills the 'templates' by parsing the contents of 'data'
	@param: data - Contents of file.
	@param: templates - target array object that would be populated.
	@returns: int representing the index of default pattern.
	*/
	_updateModel: function(data, templates) {
		var lines = data.split(copyUrlsExpert.LINE_FEED);
	
		var defPatternIndex = -1, defId = -1;
		
		if (lines.length <2) {
			return copyUrlsExpert._setupDefaultModel(templates);
		}
		
		try
		{
			defId = parseInt(lines[0]);
		}
		catch(ex) {
			// Simply ignore the bad line
		}
		
		for (var i=1, j=0 ; i<lines.length; i++) {
			var pattern = null;
			try
			{
				pattern = copyUrlsExpert._FormatPattern.parseString(lines[i]);
			}
			catch(ex) {
				// Simply ignore the bad line
				continue;
			}
			templates.push(pattern);
			
			if (pattern.id == defId) {
				defPatternIndex = j;
			}
			j++;
		}
		
		if (templates.length == 0) {
			return copyUrlsExpert._setupDefaultModel(templates);
		}
		
		if (defPatternIndex < 0) {
			return 0;
		}
		
		return defPatternIndex;
	},
	
	_setupDefaultModel: function(templates){
		templates.push(new this._FormatPattern(0, 'Default','$url$n'));
		templates.push(new this._FormatPattern(1, 'html','<a href="$url">$title</a>$n'));
		templates.push(new this._FormatPattern(2, 'forum','[a=$url]$title[/a]$n'));
		return 0;
	},
	
}

window.addEventListener
(
  'load', 
  copyUrlsExpert.handleLoad,
  false
);