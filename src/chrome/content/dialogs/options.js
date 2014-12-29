/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2013-2014 Kashif Iqbal Khan
********************************************/

'use strict';

(function(globalContext) {


copyUrlsExpert.options = {
	gUriTree: null,
	init: function() {
		this.gUriTree = document.getElementById('copyurlsexpert-treeformats');
		this.gShortcutsTree = document.getElementById('copyurlsexpert-treeshortcutkeys');

		this.gShortcutsTree.addEventListener('keydown', this._onShortcutsTree_KeyDownOrUp);
		this.gShortcutsTree.addEventListener('keyup', this._onShortcutsTree_KeyDownOrUp);

		this.loadModelIntoTree();
		this.loadShortcuts();
	},
	
	loadModelIntoTree: function() {
		var tree = this.gUriTree;
		
		var templatesOriginal = Application.storage.get(copyUrlsExpert.FUEL_KEY_ALL_PATTERNS, '');

		// Edit a deep-clone of templates
		var templates = [];
		for (var i=0 ; i<templatesOriginal.length; i++) {
			templates.push(templatesOriginal[i].clone());
		}
		
		var defTemplate = Application.storage.get(copyUrlsExpert.FUEL_KEY_DEFUALT_PATTERN, null);
		var defaultId = -1;
		
		if (defTemplate) {
			defaultId = defTemplate.id;
		}
			
		tree.treeBoxObject.beginUpdateBatch();
		
		for (var i=0 ; i<templates.length; i++) {
			var t = templates[i];
			var isDefault = (t.id == defaultId);
			this._appendRowForTemplate(tree, t, isDefault);
			
			if (isDefault) {
				tree.cueDefTemplateIndex = i;
			}
			
		}
		tree.treeBoxObject.endUpdateBatch();
		tree.cueTemplates = templates;

	},
	
	loadShortcuts: function() {
		let shortcutStr = copyUrlsExpert._getPrefService().getCharPref('shortcuts'),
				shortcutDesc = {};

		if (shortcutStr) {
			let temp = JSON.parse(shortcutStr);

			for (let prop in temp) {
				//shortcutDesc[prop] = new KeyboardShortcut(temp[prop]);
			}
		}	

		this.gShortcutsTree.cueShortcuts = shortcutDesc;
	},

	_onShortcutsTree_KeyDownOrUp: function(event) {
		// evt.target
		// evt.currentTarget
		// evt.originalTarget

		if (event.type == 'keydown' && event.repeat) {
			// event.repeat is supported only in FX28+
			return;
		}

		var tree = copyUrlsExpert.options.gShortcutsTree,
				treeView = tree.view;

    if (!tree.editingColumn) {
      return;
    }

    if (event.getModifierState("OS")) {
    	// do not support Win key in a shortcut
    	return;
    }

    event.preventDefault();
    event.stopPropagation();

    let shortcut = KeyboardShortcut.fromEvent(event);

    if (shortcut.isComplete()) {

	    let {editingRow, editingColumn} = tree,
					propName = treeView.getCellValue(editingRow, tree.columns.getFirstColumn());

      tree.stopEditing(true);

	    treeView.setCellText(editingRow, editingColumn, shortcut.toUIString());

			tree.cueShortcuts[ propName ] = shortcut;

    }
    else {
	    tree.inputField.value = shortcut.toUIString();
    }

	},

	_appendRowForTemplate: function(tree, template, isDefault) {
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
		this._loadTemplateIntoTreeRow(tree, index, template);

		this._updateTreeRowProperties(treeRow, isDefault);

		return index;
	},	
	
	_updateTreeRowProperties: function(treeRow, isDefault) {
	
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
	},
	
	_loadTemplateIntoTreeRow: function(tree, index, selectedTemplate) {
		// TODO: Optimize
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colid'), selectedTemplate.id);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colname'), selectedTemplate.name);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colmarkup'), selectedTemplate.pattern);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colprefix'), selectedTemplate.prefix);
		tree.view.setCellText(index, tree.columns.getNamedColumn('copyurlsexpert-colpostfix'), selectedTemplate.postfix);
	},
	
	onEditTemplateButtonClicked: function(target) {
		var tree = copyUrlsExpert.options.gUriTree;
		
		if (tree.currentIndex < 0) {
			alert('Select an item.'); // TODO: localize it
			return;
		}
		
		var selectedTemplate = tree.cueTemplates[tree.currentIndex];
		document.getElementById('copyurlsexpert-lblSelIndex').value = tree.currentIndex;
		copyUrlsExpert.options._loadTemplate(selectedTemplate);
		
		var btn = document.getElementById('copyurlsexpert-btnAddNew'); 
		btn.disabled = true;

		btn = document.getElementById('copyurlsexpert-btnSave');
		btn.disabled = btn.hidden = true;
		
		btn = document.getElementById('copyurlsexpert-btnCancelSave');
		btn.disabled = btn.hidden = false;

		btn = document.getElementById('copyurlsexpert-btnUpdate');
		btn.disabled = btn.hidden = false;

		copyUrlsExpert.options._toggleNonEditingButtons(true);
	},
	
	onNewTemplateButtonClicked: function(target) {
		copyUrlsExpert.options._loadEmptyTemplate();
		
		document.getElementById('copyurlsexpert-lblSelIndex').value = -1;
		
		//document.getElementById('copyurlsexpert-btnAddNew').disabled = true; 
		var btn = document.getElementById('copyurlsexpert-btnSave');
		btn.disabled = btn.hidden = false;
		
		btn = document.getElementById('copyurlsexpert-btnCancelSave');
		btn.disabled = btn.hidden = false;
		
		btn = document.getElementById('copyurlsexpert-btnUpdate');
		btn.disabled = btn.hidden = true;
		
		copyUrlsExpert.options._toggleNonEditingButtons(true);
		
	},
	
	onCancelSaveTemplateButtonClicked: function() {
		copyUrlsExpert.options._toggleNonEditingButtons(false);
		copyUrlsExpert.options._disableEditInputs();
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
		var btns = ['btndefault', 'btndelete'];

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
		
		var tree = copyUrlsExpert.options.gUriTree;
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
			selIndex = copyUrlsExpert.options._appendRowForTemplate(tree, selectedTemplate);
			tree.treeBoxObject.endUpdateBatch();
		}
		else {
			copyUrlsExpert.options._loadTemplateIntoTreeRow(tree, selIndex, selectedTemplate);
		}
		
		tree.view.selection.select(selIndex);
		
		copyUrlsExpert.options._disableEditInputs();
		copyUrlsExpert.options._toggleNonEditingButtons(false);
	},
	
	onSetAsDefaultButtonClicked: function(target) {
		var tree = copyUrlsExpert.options.gUriTree;
		if (tree.currentIndex < 0) {
			alert('Select an item.'); // TODO: localize it
			return;
		}

		// remove the default style from old row
		var treeRow = copyUrlsExpert.options._getTreeRowAtIndex(tree, tree.cueDefTemplateIndex);
		copyUrlsExpert.options._updateTreeRowProperties(treeRow, false);

		// apply the default style to new row
		treeRow = copyUrlsExpert.options._getTreeRowAtIndex(tree, tree.currentIndex);
		copyUrlsExpert.options._updateTreeRowProperties(treeRow, true);
		
		tree.cueDefTemplateIndex = tree.currentIndex;
	},
	
	onDelTemplateButtonClicked: function(target) {
		var tree = copyUrlsExpert.options.gUriTree;
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
	
	_getTreeRowAtIndex: function(tree, index) {
		var treeItem = tree.view.getItemAtIndex(index);
		
		return treeItem.getElementsByTagName('treerow')[0];
	},
	
	onDialogAccept: function() {
		var tree = copyUrlsExpert.options.gUriTree;
		var defTemplate = tree.cueTemplates[tree.cueDefTemplateIndex];
		
		Application.storage.set(copyUrlsExpert.FUEL_KEY_ALL_PATTERNS, tree.cueTemplates);
		Application.storage.set(copyUrlsExpert.FUEL_KEY_DEFUALT_PATTERN, defTemplate);

		copyUrlsExpert.updateUrlListFile(defTemplate.id + copyUrlsExpert.LINE_FEED + tree.cueTemplates.join(copyUrlsExpert.LINE_FEED));
		
		tree.cueTemplates = null;

		tree = copyUrlsExpert.options.gShortcutsTree;
		copyUrlsExpert.updateShortcuts(tree.cueShortcuts);
		tree.cueShortcuts = null;

		document.documentElement.acceptDialog();
		return true;
	},
	
	onLoad: function(evt) {

		window.removeEventListener('load', onLoadHandler);
		window.addEventListener('unload', onUnloadHandler, false);

		Components.utils.import('resource://copy-urls-expert/keyboardshortcut.jsm');
		Components.utils.import('resource://copy-urls-expert/modifiers.jsm');

		this.init();
	},

	onUnload: function(evt) {
		window.removeEventListener('unload', onUnloadHandler);

		this.gShortcutsTree.removeEventListener('keydown', this._onShortcutsTree_KeyDownOrUp);
		this.gShortcutsTree.removeEventListener('keyup', this._onShortcutsTree_KeyDownOrUp);

		this.gUriTree = null;
		this.gShortcutsTree = null;

	},
}

var onLoadHandler = copyUrlsExpert.options.onLoad.bind(copyUrlsExpert.options),
		onUnloadHandler = copyUrlsExpert.options.onUnload.bind(copyUrlsExpert.options);

window.addEventListener
(
  'load', 
	onLoadHandler,
  false
);

}) (this);
