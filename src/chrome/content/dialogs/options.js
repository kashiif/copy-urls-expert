/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2013-2016 Kashif Iqbal Khan
********************************************/

'use strict';

(function(globalContext) {


	function _appendRowForTemplate(tree, template, isDefault) {
		var treeChildren = tree.treeBoxObject.treeBody;
		var treeItem = document.createElement('treeitem');
		var treeRow = document.createElement('treerow');


		for (var i=0 ; i<tree.columns.length; i++) {
			var treeCell = document.createElement('treecell');
			treeRow.appendChild(treeCell);
		}

		treeItem.appendChild(treeRow);
		treeChildren.appendChild(treeItem);

		var index = tree.view.rowCount-1;
		_loadTemplateIntoTreeRow(tree, index, template);

		_updateTreeRowProperties(treeRow, isDefault);

		return index;
	}

	function _updateTreeRowProperties(treeRow, isDefault) {

		var cells = treeRow.getElementsByTagName('treecell');

		for (var i=0 ; i<cells.length; i++) {
			var cell = cells[i];
			var v = cell.getAttribute('properties');
			if (v) {
				if (isDefault) {
					v+= ',defaultFormat';
				}
				else {
					v = v.split(',');
					var found = v.indexOf('defaultFormat');
					if (found >= 0) {
						v.splice(found, 1);
					}
					v = v.join(',');
				}
				cell.setAttribute('properties', v);
			}
			else {
				if (isDefault) {
					cell.setAttribute('properties', 'defaultFormat');
				}
			}
		}
		// alert(attr + ' ' + isDefault);
	}

	function _getTreeRowAtIndex(tree, index) {
		var treeItem = tree.view.getItemAtIndex(index);

		return treeItem.getElementsByTagName('treerow')[0];
	}

	function _loadTemplateIntoTreeRow(tree, index, selectedTemplate) {
		// TODO: Optimize
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colid'), selectedTemplate.id);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colname'), selectedTemplate.name);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colmarkup'), selectedTemplate.pattern);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colprefix'), selectedTemplate.prefix);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colpostfix'), selectedTemplate.postfix);
	}

	function populateTree(tree, templates, defaultId) {
		tree.treeBoxObject.beginUpdateBatch();

		for (var i=0 ; i<templates.length; i++) {
			var t = templates[i];
			var isDefault = (t.id == defaultId);
			_appendRowForTemplate(tree, t, isDefault);

			if (isDefault) {
				tree.cueDefTemplateIndex = i;
			}

		}
		tree.treeBoxObject.endUpdateBatch();
		tree.cueTemplates = templates;

	}

	function addClickHandler(id, handler){
		document.getElementById(id).addEventListener('click', handler);
	}

	function removeClickHandler(id, handler){
		document.getElementById(id).removeEventListener('click', handler);
	}

var copyUrlsExpertOptions = {
	gUriTree: null,
	gShortcutsTree: null,

	init: function() {

		Components.utils.import('resource://copy-urls-expert/keyboardshortcut.jsm');
		Components.utils.import('resource://copy-urls-expert/modifiers.jsm');

		var gUriTree = document.getElementById('copyurlsexpert-treeformats');
		gUriTree.addEventListener('select', this._onUriTreeSelect, false);
		this.gUriTree = gUriTree;

		this.gShortcutsTree = document.getElementById('copyurlsexpert-treeshortcutkeys');
		this.gShortcutsTree.addEventListener('keydown', this._onShortcutsTreeKeyDownOrUp);
		this.gShortcutsTree.addEventListener('keyup', this._onShortcutsTreeKeyDownOrUp);
		this.gShortcutsTree.addEventListener('select', this._onShortcutsTreeSelect, false);

		this.btnResetShortcut = document.getElementById('copyurlsexpert-reset-shortcut');
		this.btnResetShortcut.addEventListener('click', this._onResetShortcutButtonClicked);

		let commonUtils = {};
		Components.utils.import('resource://copy-urls-expert/common.jsm', commonUtils);

		commonUtils.readTemplatesFile(function(result){
			populateTree(gUriTree, result.templates, result.defaultTemplateId);
		});

		let shortcutDesc = commonUtils.getCustomShortcuts();
		this.loadShortcutsIntoTree(shortcutDesc);

		addClickHandler('copyurlsexpert-btnAddNew', this.onNewTemplateButtonClicked);
		addClickHandler('copyurlsexpert-btnCancelSave', this.onCancelSaveTemplateButtonClicked);
		addClickHandler('copyurlsexpert-btnUpdate', this.onSaveTemplateButtonClicked);
		addClickHandler('copyurlsexpert-btnSave', this.onSaveTemplateButtonClicked);

		addClickHandler('copyurlsexpert-btnedit', this.onEditTemplateButtonClicked);
		addClickHandler('copyurlsexpert-btndefault', this.onSetAsDefaultButtonClicked);
		addClickHandler('copyurlsexpert-btndelete', this.onDelTemplateButtonClicked);

		addClickHandler('copyurlsexpert-btnaccept', this.onDialogAccept);
	},
	

	loadShortcutsIntoTree: function(shortcutDesc) {

		let tree = this.gShortcutsTree,
				treeView = tree.view,
				colCommandId = tree.columns.getFirstColumn(),
				colMessage = tree.columns.getNamedColumn('copyurlsexpert-colshortcutmessage'),
				colShortcut = tree.columns.getNamedColumn('copyurlsexpert-colshortcutkey');

		for(let row=0 ; row<tree.view.rowCount; row++) {

			let commandId = treeView.getCellValue(row, colCommandId);

			if (shortcutDesc.hasOwnProperty(commandId)) {
				let shortcut = shortcutDesc[commandId];

				// check if shortcut is unique
				let existingKey = copyUrlsExpertOptions._findShortcutExistingAssignment(shortcut, commandId);
				if (existingKey) {
					treeView.setCellText(row,
							colMessage, 
							shortcut.toUIString() + ' already assigned to ' + existingKey.getAttribute('id'));

				}

	    	treeView.setCellText(row, colShortcut, shortcut.toUIString());
			}
		}

		tree.cueShortcuts = shortcutDesc;

	},

	_findShortcutExistingAssignment: function (shortcut, commandToIgnore) {
		let browserWin = Components.classes['@mozilla.org/appshell/window-mediator;1']
											.getService(Components.interfaces.nsIWindowMediator)
											.getMostRecentWindow('navigator:browser');

		let allKeySets = browserWin.document.querySelectorAll('keyset'),
				allDefinedKeys,
				shortcutKeyConfig = shortcut.getKeyConfig(),
				attrForKey = shortcutKeyConfig.hasOwnProperty('keycode') ? 'keytext' : 'key',
				keyText = shortcutKeyConfig.keytext.toLowerCase();

		for (let i = 0; i < allKeySets.length; i++) {

			allDefinedKeys = allKeySets.item(i).querySelectorAll('key');

			for (let j = 0; j < allDefinedKeys.length; j++) {
				let currentKey = allDefinedKeys.item(j);

				if (currentKey.getAttribute('disabled') === 'true') {
					continue;
				}

				if (currentKey.getAttribute(attrForKey).toLowerCase() == keyText) {

					if (shortcut.modifiers && shortcut.modifiers.toXulModifiersString() == currentKey.getAttribute('modifiers')) {

						if (!commandToIgnore || currentKey.getAttribute('command') != commandToIgnore) {
							return currentKey;
						}
					}

				}

			} // for allDefinedKeys
		} // for allKeySets

		// No existing assignment found for this shortcut
		return null;
	},

	_onShortcutsTreeKeyDownOrUp: function(event) {

		var tree, treeView;

		if (event.type == 'keydown' && event.repeat) {
			// event.repeat is supported only in FX28+
			return;
		}

		tree = copyUrlsExpertOptions.gShortcutsTree;
		treeView = tree.view;

    if (!tree.editingColumn) {
      return;
    }

    if (event.getModifierState('OS')) {
    	// do not support Win key in a shortcut
    	return;
    }

    event.preventDefault();
    event.stopPropagation();

    let shortcut = KeyboardShortcut.fromEvent(event);

    if (shortcut.isComplete()) {

	    let {editingRow, editingColumn} = tree,
					propName,
					colMessage = tree.columns.getNamedColumn('copyurlsexpert-colshortcutmessage');

			// check if shortcut is unique
			let existingKey = copyUrlsExpertOptions._findShortcutExistingAssignment(shortcut);
			if (existingKey) {
	      tree.inputField.value = ''; 
				treeView.setCellText(editingRow, 
						colMessage, 
						shortcut.toUIString() + ' already assigned to ' + existingKey.getAttribute('id'));

			}
			else {
	      tree.stopEditing(true); // Exit edit mode and accept the new value
				treeView.setCellText(editingRow, colMessage, '');

		    treeView.setCellText(editingRow, editingColumn, shortcut.toUIString());

				propName = treeView.getCellValue(editingRow, tree.columns.getFirstColumn())
				tree.cueShortcuts[ propName ] = shortcut;

			}

    }
    else {
	    tree.inputField.value = shortcut.toUIString();
    }

	},

	_onUriTreeSelect: function(evt) {
		var tree = evt.target;
		copyUrlsExpertOptions._toggleNonEditingButtons(tree.currentIndex < 0);
	},

	_onShortcutsTreeSelect: function(evt) {
		var tree = evt.target;
		copyUrlsExpertOptions.btnResetShortcut.setAttribute('disabled', tree.currentIndex < 0);
	},

	_onResetShortcutButtonClicked: function(evt) {
		var tree = copyUrlsExpertOptions.gShortcutsTree;

		if (tree.editingColumn) {
			tree.stopEditing(false);
		}

		var propName = tree.view.getCellValue(tree.currentIndex, tree.columns.getFirstColumn());

		tree.view.setCellText(tree.currentIndex, tree.columns.getNamedColumn('copyurlsexpert-colshortcutkey'), '');

		delete tree.cueShortcuts[ propName ];
	},

	onEditTemplateButtonClicked: function(target) {
		var tree = copyUrlsExpertOptions.gUriTree;
		
		if (tree.currentIndex < 0) {
			alert('Select an item.'); // TODO: localize it
			return;
		}
		
		var selectedTemplate = tree.cueTemplates[tree.currentIndex];
		document.getElementById('copyurlsexpert-lblSelIndex').value = tree.currentIndex;
		copyUrlsExpertOptions._loadTemplate(selectedTemplate);
		
		var btn = document.getElementById('copyurlsexpert-btnAddNew'); 
		btn.disabled = true;

		btn = document.getElementById('copyurlsexpert-btnSave');
		btn.disabled = btn.hidden = true;
		
		btn = document.getElementById('copyurlsexpert-btnCancelSave');
		btn.disabled = btn.hidden = false;

		btn = document.getElementById('copyurlsexpert-btnUpdate');
		btn.disabled = btn.hidden = false;

		btn = document.getElementById('copyurlsexpert-btnedit');
		btn.disabled = true;

		copyUrlsExpertOptions._toggleNonEditingButtons(true);
	},
	
	onNewTemplateButtonClicked: function() {
		copyUrlsExpertOptions._loadEmptyTemplate();
		
		document.getElementById('copyurlsexpert-lblSelIndex').value = -1;
		
		//document.getElementById('copyurlsexpert-btnAddNew').disabled = true; 
		var btn = document.getElementById('copyurlsexpert-btnSave');
		btn.disabled = btn.hidden = false;
		
		btn = document.getElementById('copyurlsexpert-btnCancelSave');
		btn.disabled = btn.hidden = false;
		
		btn = document.getElementById('copyurlsexpert-btnUpdate');
		btn.disabled = btn.hidden = true;
		
		copyUrlsExpertOptions._toggleNonEditingButtons(true);
		
	},
	
	onCancelSaveTemplateButtonClicked: function() {
		copyUrlsExpertOptions._toggleNonEditingButtons(copyUrlsExpertOptions.gUriTree.currentIndex < 0);
		copyUrlsExpertOptions._disableEditInputs();
	},
	
	_loadEmptyTemplate: function() {
		var selectedTemplate = new copyUrlsExpert._FormatPattern('','','');
		
		this._loadTemplate(selectedTemplate);
		return selectedTemplate;
	},
	
	_loadTemplate: function(selectedTemplate) {
		var t = document.getElementById('copyurlsexpert-txtname');
		t.value = selectedTemplate.name;
		t.disabled = false;
		
		t = document.getElementById('copyurlsexpert-txtmarkup');
		t.value = selectedTemplate.pattern;
		t.disabled = false;
		
		t = document.getElementById('copyurlsexpert-txtprefix');
		t.value = selectedTemplate.prefix;
		t.disabled = false;
		
		t = document.getElementById('copyurlsexpert-txtpostfix');
		t.value = selectedTemplate.postfix;
		t.disabled = false;
	},
	
	_toggleNonEditingButtons: function(isDisabled) {
		var btns = ['btnedit', 'btndefault', 'btndelete'];

		for (var i=0 ; i<btns.length ; i++) {
			var t = document.getElementById('copyurlsexpert-' + btns[i]);
			t.disabled = isDisabled;
		}
		
	},
	
	_disableEditInputs: function() {
		var ctrls = ['txtname', 'txtmarkup', 'txtprefix', 'txtpostfix'];

		for (var i=0 ; i<ctrls.length ; i++) {
			var t = document.getElementById('copyurlsexpert-' + ctrls[i]);
			t.value = '';
			t.disabled = true;
		}

		var btn = document.getElementById('copyurlsexpert-btnAddNew'); 
		btn.disabled = false;
		
		btn = document.getElementById('copyurlsexpert-btnSave');
		btn.hidden = false;
		btn.disabled = true;
		
		btn = document.getElementById('copyurlsexpert-btnUpdate');
		btn.disabled = btn.hidden = true;

		btn = document.getElementById('copyurlsexpert-btnCancelSave');
		btn.disabled = true;
	},
	
	onSaveTemplateButtonClicked: function() {
		var t = document.getElementById('copyurlsexpert-txtname');
		var name = t.value;
		if (name.trim().length == 0) {
			alert('Name cannot be empty.'); // TODO: localize it
			return;
		}
				
		t = document.getElementById('copyurlsexpert-txtmarkup');
		var pattern = t.value;
		if (pattern.trim().length == 0) {
			alert('Markup cannot be empty.'); // TODO: localize it
			return;
		}
		
		var tree = copyUrlsExpertOptions.gUriTree;
		var selectedTemplate = null;
		
		var selIndex = parseInt(document.getElementById('copyurlsexpert-lblSelIndex').value);

		if (selIndex < 0) { // add new
			
			// Find max Id
			var id = -1;
			for (var i=0 ; i<tree.cueTemplates.length; i++) {
				var j = tree.cueTemplates[i].id;
				if (j > id) {
					id = j;
				}
			}
		
			selectedTemplate = new copyUrlsExpert._FormatPattern(id+1, name, pattern);
			tree.cueTemplates.push(selectedTemplate);
		}
		else {
			selectedTemplate = tree.cueTemplates[selIndex];
			selectedTemplate.name = name;
			selectedTemplate.pattern = pattern;
		}
		selectedTemplate.prefix = document.getElementById('copyurlsexpert-txtprefix').value;
		selectedTemplate.postfix = document.getElementById('copyurlsexpert-txtpostfix').value;
		
		// update Tree
		if (selIndex < 0) { // add new
			
			tree.treeBoxObject.beginUpdateBatch();
			selIndex = _appendRowForTemplate(tree, selectedTemplate);
			tree.treeBoxObject.endUpdateBatch();
		}
		else {
			_loadTemplateIntoTreeRow(tree, selIndex, selectedTemplate);
		}
		
		tree.view.selection.select(selIndex);
		
		copyUrlsExpertOptions._disableEditInputs();
		copyUrlsExpertOptions._toggleNonEditingButtons(false);
	},
	
	onSetAsDefaultButtonClicked: function(target) {
		var tree = copyUrlsExpertOptions.gUriTree;
		if (tree.currentIndex < 0) {
			alert('Select an item.'); // TODO: localize it
			return;
		}

		// remove the default style from old row
		var treeRow = _getTreeRowAtIndex(tree, tree.cueDefTemplateIndex);
		_updateTreeRowProperties(treeRow, false);

		// apply the default style to new row
		treeRow = _getTreeRowAtIndex(tree, tree.currentIndex);
		_updateTreeRowProperties(treeRow, true);
		
		tree.cueDefTemplateIndex = tree.currentIndex;
	},
	
	onDelTemplateButtonClicked: function(target) {
		var tree = copyUrlsExpertOptions.gUriTree;
		var index = tree.currentIndex;
		if (index < 0) {
			alert('Select an item.'); // TODO: localize it
			return;
		}

		if (index == tree.cueDefTemplateIndex) {
			alert('Selected format is the default format. Mark another format as default first.'); // TODO: localize it
			return;
		}
		
		if (tree.cueDefTemplateIndex > index) {
			tree.cueDefTemplateIndex--;
		}
		
		tree.view.selection.clearSelection();
		tree.treeBoxObject.treeBody.removeChild(tree.treeBoxObject.treeBody.children[index]);

		tree.cueTemplates.splice(index,1); // delete 1 item from array
		
		// Select next row
		var lastRowIndex = tree.view.rowCount;
		if (index > lastRowIndex) {
			index = lastRowIndex;
		}
		tree.view.selection.select(index);
	},
	
	onDialogAccept: function() {
		let tree = copyUrlsExpertOptions.gUriTree;
		let defTemplate = tree.cueTemplates[tree.cueDefTemplateIndex];
		
		copyUrlsExpert._updateFuelAppData(tree.cueTemplates, tree.cueDefTemplateIndex);

		copyUrlsExpert.updateUrlListFile(defTemplate.id + copyUrlsExpert.LINE_FEED + tree.cueTemplates.join(copyUrlsExpert.LINE_FEED));
		
		tree.cueTemplates = null;

		tree = copyUrlsExpertOptions.gShortcutsTree;
		copyUrlsExpert.updateCustomShortcuts(tree.cueShortcuts);
		tree.cueShortcuts = null;

        Components.utils.import('resource://gre/modules/Services.jsm');

        let instantApply = Services.prefs.getBoolPref('browser.preferences.instantApply');

        if (instantApply) {
			window.close();
		}
		else {
            document.documentElement.acceptDialog();
        }

		return true;
	},
	
	onLoad: function(evt) {

		window.removeEventListener('load', onLoadHandler);
		window.addEventListener('unload', onUnloadHandler, false);

		window.setTimeout(function() { copyUrlsExpertOptions.init(); }, 60 );
	},

	onUnload: function(evt) {
		window.removeEventListener('unload', onUnloadHandler);

		this.gUriTree.removeEventListener('select', this._onUriTreeSelect, false);

		this.gShortcutsTree.removeEventListener('keydown', this._onShortcutsTreeKeyDownOrUp);
		this.gShortcutsTree.removeEventListener('keyup', this._onShortcutsTreeKeyDownOrUp);
		this.gShortcutsTree.removeEventListener('select', this._onShortcutsTreeSelect, false);

		this.btnResetShortcut.removeEventListener('click', this._onResetShortcutButtonClicked);


		this.gUriTree = null;
		this.gShortcutsTree = null;
		this.btnResetShortcut = null;

		removeClickHandler('copyurlsexpert-btnAddNew', this.onNewTemplateButtonClicked);
		removeClickHandler('copyurlsexpert-btnCancelSave', this.onCancelSaveTemplateButtonClicked);
		removeClickHandler('copyurlsexpert-btnUpdate', this.onSaveTemplateButtonClicked);
		removeClickHandler('copyurlsexpert-btnSave', this.onSaveTemplateButtonClicked);

		removeClickHandler('copyurlsexpert-btnedit', this.onEditTemplateButtonClicked);
		removeClickHandler('copyurlsexpert-btndefault', this.onSetAsDefaultButtonClicked);
		removeClickHandler('copyurlsexpert-btndelete', this.onDelTemplateButtonClicked);

		removeClickHandler('copyurlsexpert-btnaccept', this.onDialogAccept);
	}
};

var onLoadHandler = copyUrlsExpertOptions.onLoad.bind(copyUrlsExpertOptions),
		onUnloadHandler = copyUrlsExpertOptions.onUnload.bind(copyUrlsExpertOptions);

window.addEventListener('load', onLoadHandler, false);

})(this);
