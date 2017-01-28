/*******************************************
* Author: Kashif Iqbal Khan
* Email: kashiif@gmail.com
* License: MPL 1.1, MIT
* Copyright (c) 2016 Kashif Iqbal Khan
********************************************/

'use strict';
(function(globalContext) {

  let templates = null;

  function onLoad(evt){
    window.removeEventListener('load', onLoad, false);
    window.addEventListener('unload', onUnload, false);
    window.setTimeout(init, 100);
  }

  function onUnload(evt){
    window.removeEventListener('unload', onUnload, false);
    window.removeEventListener('dialogaccept', onDialogAccept);
  }

  function getSelectedValueOfList(id) {
    return document.getElementById(id).selectedItem.getAttribute('value');
  }

  function onDialogAccept(evt) {

    let template = null;

    for (let i= 0, templateId = getSelectedValueOfList('copyurlsexpert-ddltemplate') ; i<templates.length ; i++) {
      if (templates[i].id == templateId) {
        template = templates[i];
        break;
      }
    }

    let dialogArgs = window.arguments[0];

    let options = {
      template: template,
      sortBy: getSelectedValueOfList('copyurlsexpert-ddlsortorder'),
      contextTab: dialogArgs.contextTab
    };

    copyUrlsExpert._doAction(getSelectedValueOfList('copyurlsexpert-ddlsource'), options);

    return true;
  }

  function init() {
    window.addEventListener('dialogaccept', onDialogAccept);

    let commonUtils = {};
    Components.utils.import('resource://copy-urls-expert/common.jsm', commonUtils);

    commonUtils.readTemplatesFile(function(result){
      templates = result.templates;
      populateTemplates(result.templates, result.defaultTemplateId)
    });
  }

  function populateTemplates(templates, defaultTemplateId) {
    var ddlTemplates = document.getElementById('copyurlsexpert-ddltemplate'),
        popupTemplates = ddlTemplates.firstElementChild;

    for (let i=0 ; i<templates.length ; i++) {
      var menuItem = document.createElement('menuitem'),
          id = templates[i].id;
      
      menuItem.setAttribute('label', templates[i].name);
      menuItem.setAttribute('value', id);

      popupTemplates.appendChild(menuItem);

      if (id == defaultTemplateId) {
        ddlTemplates.selectedIndex = i;
      }

    }
  }


  window.addEventListener('load', onLoad, false);

}) (this);
