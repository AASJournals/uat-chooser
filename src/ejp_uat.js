/******************************************************************************************/
/******************************************************************************************/
/*                                                                                        */
/* Copyright 2018 Precision Computer Works Inc / eJournalPress                            */
/*                                                                                        */
/* ejp_uat.css                                                                            */
/*                                                                                        */
/* $Id: ejp_uat.js,v 83.4 2019/01/24 15:18:33 plotkin Exp $                               */
/*                                                                                        */
/* Permission is hereby granted, free of charge, to any person obtaining a copy of this   */
/* software and associated documentation files (the "Software"), to deal in the Software  */
/* without restriction, including without limitation the rights to use, copy, modify,     */
/* merge, publish, distribute, sublicense, and/or sell copies of the Software, and to     */
/* permit persons to whom the Software is furnished to do so, subject to the following    */
/* conditions:                                                                            */
/*                                                                                        */
/* The above copyright notice and this permission notice shall be included in all copies  */
/* or substantial portions of the Software.                                               */
/*                                                                                        */
/* THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED,    */
/* INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A          */
/* PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT     */
/* HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF   */
/* CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE   */
/* OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.                                          */
/*                                                                                        */
/*                                                                                        */
/******************************************************************************************/
/******************************************************************************************/


// Place holder object
var Uat = {};
Uat['urls'] = {};

Uat.Autocompleter = Class.create(Autocompleter.Base,
{

    initialize: function($super, key, update, options) {
        // parse options
        if ( !options || options == '' ) {
            options = '{}';
        }
        this.options = JSON.parse( options );

        // Initialize options, class variables, etc
        this.initSettings(key, update);

        // Initialize the display
        this.initDivContents( key, update, this.options );

        // Initialize $super
        this.baseInitialize(key+'_input', update, this.options);

        // Do http request to load terms list from url
        ejpUatGetTerms(this.url, this.getTermsXMLFinish );
    },
    initSettings: function(key, update) {
        // Set initial vars
        if ( !this.options.containerId ) this.options.containerId = key;
        this.options.indicator = key+'_ind';
        this.startInd = 1;
        if ( this.options.max ) {
            this.endInd = this.startInd + this.options.max - 1;
        } else {
            this.endInd = 20; // Allow 20 keywords
        }
        this.url = this.options.url || 'https://raw.githubusercontent.com/astrothesaurus/UAT/master/UAT.rdf';
        this.key = key;
        this.options.minChars = this.options.minChars || 2;
        this.options.updateElement = this.updateElement.bind(this);

        // Default to 'static' display. autocomplete div displays within input div. Also can be 'absolute' to display popped-over the page
        if ( !this.options.position ) this.options.position = 'absolute';

        // Set maxheight/maxwidth so the static autocomplete div isn't too large
        if ( this.options.position == 'static' && !this.options.maxHeight ) this.options.maxHeight = '200px';
        if ( this.options.position == 'static' && !this.options.maxWidth ) this.options.maxWidth = '300px';

        this.options.onShow = function(element, update) {
            // Keep input width
            update.style.position = this.options.position;
            if ( this.options.maxHeight ) update.style.maxHeight = this.options.maxHeight;
            if ( this.options.maxWidth ) update.style.maxWidth = this.options.maxWidth;

            if(!update.style.position || update.style.position=='absolute') {
                update.style.position = 'absolute';
                Element.clonePosition(element, update, {
                    setHeight: false,
                    setWidth: false,
                    offsetTop: element.offsetHeight
                });

            }
            update.show();
        }.bind(this);

        if ( !this.options.links ) {
            // Initialize links to display
            this.options.links = [];
            var link = {};
            link['action'] = 'latex_popup';
            link['label'] = 'Cut/Paste Latex';
            this.options.links.push( link );
            link = {};
            link['action'] = 'text_popup';
            link['label'] = 'Cut/Paste Text';
            this.options.links.push( link );
        }

        if ( !this.options.popupx ) {
            // Initalize popup width
            this.options.popupx = 300;
        }
        if ( !this.options.popupy ) {
            // Initalize popup height
            this.options.popupy = 200;
        }
        if ( !this.options.infoDivSections ) {
            // Initialize info div display sections
            this.options.infoDivSections = ['term', 'parents', 'children', 'altLabels', 'related', 'definitions', 'scopeNotes'];
        }
        if ( !this.options.infoDivAddIcon ) {
            // Info div add icon
            this.options.infoDivAddIcon = '<img src="'+img_taxonomyterms_miss+'" alt="Add Term" title="Add Term"/>';
        }
    },
    hide: function($super) {
        var hide = true;
        if ( this.hasFocus ) {
            //Only hide when we lose focus, allow user to select multiple options
            hide = false;
        }
        if ( hide ) {
            this.element.style.width = '';

            //call hide() in controls.js
            $super();
        }
    },
    onBlur: function(event) {
        // needed to make click events work
        if ($$('#'+this.update.id+':hover').length > 0) return; //tt20033: fix for IE scrollbar issue
        this.hasFocus = false;
        this.hide();
        this.active = false;
    },

    onFocus: function (event) {
        if ( this.update.style.display == 'none' ) {
            // Only redisplay if not displayed
            this.changed = false;
            this.hasFocus = true;
            this.getUpdatedChoices();
        }
    },

    // scriptaculous bug fix
    markPrevious: function() {
        if(this.index > 0) {this.index--;}
        else {
            this.index = this.entryCount-1;
            this.update.scrollTop = this.update.scrollHeight;
        }
        var selection = this.getEntry(this.index);
        var selection_top = selection.offsetTop;
        if(selection_top < this.update.scrollTop){
            this.update.scrollTop = this.update.scrollTop-selection.offsetHeight;
        }
    },

    // scriptaculous bug fix
    markNext: function() {
        if(this.index < this.entryCount-1) {this.index++;}
        else {
            this.index = 0;
            this.update.scrollTop = 0;
        }
        var selection = this.getEntry(this.index);
        var selection_bottom = selection.offsetTop+selection.offsetHeight;
        if(selection_bottom > this.update.scrollTop+this.update.offsetHeight){
            this.update.scrollTop = this.update.scrollTop+selection.offsetHeight;
        }
    },
    updateElement: function (selectedElement) {
        // Overrides control.js updateElement, see also ejp.js updateElement
        var value = '';
        value = Element.collectTextNodesIgnoreClass(selectedElement, 'informal');
        this.element.focus();
        this.hasFocus = true;
        var externalId = '';
        if ( Uat['urls'][this.url]['terms'][value] ) {
            externalId = Uat['urls'][this.url]['terms'][value].externalId;
        }
        // populate info div with term
        this.infoDivPopulate(value);

        // Add to term table
        this.termAdd( value, externalId );
    },
    getTermsXMLFinish: function (url, xmlString) {
        // Called when http request finishes
        ejpUatParseXmlTerms(url, xmlString);
    },
    getTerms: function() {
        // Get the list of terms for this
        if ( Uat['urls'][this.url]['status'] == 'success' ) {
            return Uat['urls'][this.url]['terms'];
        } else {
            // No terms yet loaded
            var terms = {};
            return terms;
        }
    },
    getTermFromExternalId: function(externalId) {
        // Get the list of terms for this
        if ( Uat['urls'][this.url]['status'] == 'success' ) {
            return Uat['urls'][this.url]['externalIds'][externalId];
        } else {
            // No terms yet loaded
            return 0;
        }
    },
    getExternalId: function(term) {
        // Get the list of terms for this
        if ( Uat['urls'][this.url]['status'] == 'success' ) {
            return Uat['urls'][this.url]['terms'][term].externalId;
        } else {
            // No terms yet loaded
            return 0;
        }
    },
    getTermInfo: function(term) {
        // Get info for a single term
        var terms = this.getTerms();
        return terms[term];
    },
    initDivContents: function(key, update, options) {
        // Build basic contents structure
        this.createDivContents(key, update, options);

        if ( options.selected ) {
            // Add preselected terms
            for ( var i = 0; i < options.selected.length; i++ ) {
                this.termAdd( options.selected[i].name, options.selected[i].external_id );
            }
        }
    },
    createDivContents: function(key, update, options) {
        var html = '';
        html += '<table class="ejp-uat-autocompleter" ><tr><td width="50%">';

        // table to hold added terms
        html += '<div id="'+key+'_added_terms" style="display:none">';
        html += '<table id="'+key+'_added_table"  class="ejp-uat-added-terms"><tr><th>Added Concepts</th><th></th></tr></table>';
        // Hidden term count
        html += '<input type="hidden" id="keywords_cnt" name="keywords_cnt" value="0">';
        html += '</div>';

        // Term search input
        html += '<div>';
        html += '<input type="text" id="'+key+'_input" value="" size="20" maxlength="100">';

        // Autocompleter div
        html += '<span id="' + options.indicator + '" style="display: none"><img src="'+img_indicator_tiny_red+'" alt="Working..." /></span>';
        html += '<div id="' + update +'" class="autocomplete"></div>';

        html += '</div><br>';

        // Links div
        html += '<div class="ejp-uat-links" id="'+key+'_links" style="display:none">';
        html += '</div>';

        // Cut/Paste Div
        html += '<div class="ejp-uat-clipboard" id="'+key+'_clipboard" style="display:none">';
        html += '</div>';

        html += '</td><td>';

        // Info div
        html += '<div class="ejp-uat-info" id="'+key+'_info" style="display:none"></div>';
        html += '</div>';
        html += '</td></tr></table>';

        // Insert the html
        $(options.containerId).update(html);

        if ( this.options.maxWidth ) {
            $(key+'_added_terms').style.maxWidth = this.options.maxWidth;
            $(key+'_added_table').style.display = 'block';
            $(key+'_added_table').style.maxWidth = this.options.maxWidth;
            $(key+'_added_table').style.wordWrap = 'break-word';
            // $(key+'_added_table').style.tableLayout = 'fixed';
        }

        // Create links
        this.createLinks( key, options );
        return;
    },
    createLinks: function(key, options ) {
        // Create links at bottom of widget
        var id, html;
        if ( !options.links ) return;
        var linkClickFunc = this.linkClick.bind(this);

        for ( var i = 0; i < options.links.length; i++ ) {
            id = key+'_link_'+i;
            html = '';

            // Build and insert link
            html += '<div class="ejp-uat-link"><a href="javascript:void(0);" id="'+id+'" action="'+options.links[i].action+'" >'+options.links[i].label+'</a></div>';
            $(key+'_links').insert(html);

            // Add event
            $(id).addEventListener('click', function(e){linkClickFunc(this);}, false);
        }

        return;
    },
    linkClick: function(linkElement) {
        // Handler when links at bottom of widget are clicked
        var action = linkElement.getAttribute('action');
        if ( action == 'text_popup' ) {
            this.getClipboardPopup( this.getTextTerms(), 'text' );
        } else if ( action == 'latex_popup' ) {
            this.getClipboardPopup( this.getLatexTerms(), 'latex' );
        }

        return;
    },
    getTextTerms: function() {
        var terms = this.getAddedTerms();
        var html = '';
        for ( var i = 0; i < terms.length; i++ ) {
            if ( i > 0 ) html += ", ";
            html += terms[i];
            var externalId = this.getTermInfo( terms[i] ).externalId;
            if ( externalId ) {
                html += " ("+externalId+")";
            }
        }
        return html;
    },
    getLatexTerms: function() {
        var terms = this.getAddedTerms();
        var html = '';
        for ( var i = 0; i < terms.length; i++ ) {
            if ( i > 0 ) html += ", ";
            html += terms[i];
            var externalId = this.getTermInfo( terms[i] ).externalId;
            if ( externalId ) {
                html += " ("+externalId+")";
            }
        }
        html = '\\keywords{'+html+'}';
        return html;
    },
    getClipboardPopup: function(contents, type) {
        // Page Div
        html = '<div>';

        // Close icon
        html += '<div class="ejp-uat-clipboard-close" id="'+this.key+'_clipboard_close" action="close"><img src="'+img_vsubmit_close+'" alt="Close" title="Close"/></div>';

        // Contents div
        html += '<div class="ejp-uat-clipboard-contents">'+contents+'</div>';

        // Hidden textarea to copy from (can't be actually hidden)
        html += '<textarea id="'+this.key+'_clipboard_contents" style="height:0px;width:0px;opacity:0">'+contents+'</textarea>';

        // Copy link
        html += "<div class='ejp-uat-clipboard-copy' ><a href='javascript:void(0);' id='"+this.key+"_clipboard_copy' action='copy' >Copy to clipboard</a></div>";

        // End page div
        html += '</div>';

        // Add contents to div
        $(this.key+'_clipboard').update(html);

        // Add events
        var linkClickFunc = this.clipboardClick.bind(this);
        $(this.key+'_clipboard_copy').addEventListener('click', function(e){linkClickFunc(this);}, false);
        $(this.key+'_clipboard_close').addEventListener('click', function(e){linkClickFunc(this);}, false);

        // Show the div
        $(this.key+'_clipboard').show();

        return;
    },
    clipboardClick: function(linkElement) {
        var action = linkElement.getAttribute('action');
        if ( action == 'close' ) {
            this.clipboardHide();

        } else if ( action == 'copy' ) {
            // Select hidden textarea and copy to clipboard
            $(this.key+'_clipboard_contents').select();
            document.execCommand("copy");
            this.clipboardHide();
        }

        return;
    },
    clipboardHide: function() {
        $(this.key+'_clipboard').hide();
        return;
    },
    getAddedTerms: function() {
        // Returns array of added terms
        var terms = [];
        for ( var cnt = this.startInd; cnt <= this.endInd; cnt++ ) {
            if ( $('keywords'+cnt) ) {
                terms.push($('keywords'+cnt).value);
            }
        }
        return terms;
    },
    termAdd: function ( keyword, externalId ) {
        // Add a term as selected
        // Ensure table is shown
        $(this.key+'_added_terms').show();

        $(this.key+'_links').show(); // Show links when we have a term

        var exists = false;
        var nextCnt = 0;
        for ( var cnt = this.startInd; cnt <= this.endInd; cnt++ ) {
            if ( $('keywords'+cnt) ) {
                if ( $('keywords'+cnt).value == keyword ) {
                    // Word is already selected
                    exists = true;
                }
            } else if ( nextCnt == 0 ) {
                nextCnt = cnt;
            }
        }

        if ( exists ) {
            // Word already exists, do not add
            return;
        } else if ( nextCnt == 0 ) {
            // Maximum already selected, do not add
            return;
        }

        // Increase keywords count
        $('keywords_cnt').value = parseInt($('keywords_cnt').value) + 1;

        var externalIdHtml = '';
        if ( externalId && externalId != '' ) {
            externalIdHtml += '<div class="ejp-uat-added-external-id">('+externalId+')</div>';
            // Hidden input for external id
            externalIdHtml += '<input type="hidden" name="keywords'+nextCnt+'_external_id" id="keywords'+nextCnt+'_external_id" value="'+externalId+'">';
        }

        // Insert table row and hidden element
        var keywordKey = this.key+'_keyword'+nextCnt;
        var html = '<tr id="'+keywordKey+'_added"><td>';
        html += keyword+externalIdHtml+'<input type="hidden" name="keywords'+nextCnt+'" id="keywords'+nextCnt+'" value="'+keyword+'">';
        html += '</td>';
        html += '<td><div id="'+keywordKey+'_remove" class="ejp-uat-remove-link" >Remove&nbsp;<img src="'+img_vsubmit_status_error+'"></div></td></tr>';

        $(this.key+'_added_table').down('tr').insert({after:html} );

        var removeFunc = this.termRemove.bind(null, this.key, keywordKey);
        $(keywordKey+'_remove').addEventListener('click', function(e){ removeFunc(); }, false);

        return;
    },

    termRemove: function( key, keywordKey ) {
        // Remove table row (row contains hidden inputs)
        $(keywordKey+'_added').remove();

        // Decrease keywords count
        $('keywords_cnt').value = parseInt($('keywords_cnt').value) - 1;

        // Hide if no keywords displayed
        if ( $('keywords_cnt').value < 1 ) {
            $(key+'_added_terms').hide();
            $(key+'_links').hide();
        }
        return;
    },

    getUpdatedChoices: function($super) {
        // overrides getUpdatedChoices() in controls.js
        // $super();
        if (!this.hasFocus) return; //tt24663

        var update = false;
        var text = this.getToken();

        if ( text.length >= this.options.minChars ) {
            update = true;
        }

        if (update) {
            this.updateChoices(this.filterChoices(this.getToken()));
            return;
        }
    },
    filterChoices: function(token) {
        // Filters list of choices based on search text
        var choices = [];
        var re;
        re = new RegExp(ejpUatEscapeRegex( token ), 'i');
        terms = Object.keys(this.getTerms());
        for ( var j = 0; j < terms.length; j++ ) {
            var choice = terms[j];
            var match = false;
            if ( choice.match(re) ) {
                match = true;
            } else {
                var termInfo = this.getTermInfo(choice);
                // Also search alternate labels
                for ( var i = 0; i < termInfo.altLabels.length; i++ ) {
                    if ( termInfo.altLabels[i].match(re) ) {
                        match = true;
                        break;
                    }
                }
            }
            if ( match ) {
                choices.push(choice);
            }
        }
        choices.sort();
        return choices;
    },

    updateChoices: function($super, choices) {
        var text = ejpUatEscapeRegex( this.getToken() );
        var searchRegex = new RegExp('(' + text + ')', 'ig');

        var html = '<ul>';
        for ( var i = 0; i < choices.length; i++ ) {
            if (choices[i] == '') continue;

            // Highlight the search string in the term
            var choiceHtml = choices[i];
            choiceHtml = choiceHtml.replace(searchRegex, '<span class="autocomplete_regex">$1</span>');

            html += '<li id="'+this.key+'_option_'+choices[i]+'">';
            html += choiceHtml;
            html += '<div class="ejp-uat-infolink" id="'+this.key+'_info_'+choices[i]+'" ><img src="'+img_info_select+'"></div>';
            html += '</li>';
        }
        html += '</ul>';

        //scroll to top of options
        this.update.scrollTop = 0;

        //call updateChoices() in controls.js to set displayed choices to html
        $super(html);

        // TT 25507: Add click listeners to info divs
        var infoClickFunc = this.infoIconClick.bind(this);
        for ( var i = 0; i < choices.length; i++ ) {
            if (choices[i] == '') continue;
            $(this.key+'_info_'+choices[i]).addEventListener('click', function(e){e.stopPropagation();infoClickFunc(this);}, false);
        }

        this.update.style.height = 'auto';
        this.update.style.width = 'auto';

        this.update.show();
        var choicesRect = this.update.getBoundingClientRect();
        var windowHeight = document.viewport.getHeight();
        var choicesHeight = choicesRect.height != null ? choicesRect.height : this.update.getHeight();
        //if choices go off bottom of window, reduce height
        if (choicesRect.top + choicesHeight > windowHeight ) {
            choicesHeight = windowHeight - choicesRect.top;
            if (choicesHeight > 100) { //min height of 100 pixels
                this.update.style.height = choicesHeight.toFixed(0) + 'px';
            }
        }

        this.update.style.left = $(this.element).cumulativeOffset().left.toFixed(0) + 'px';

        //TT 25092: send DIV to front
        this.update.style.zIndex = 100000;
    },

    infoIconClick: function (choice) {

        re = RegExp( this.key+'_info_(.+)' );
        var found = choice.id.match( re );

        if (!found) return;
        var term = found[1];

        this.infoDivPopulate(term);

        this.element.focus();
        this.hasFocus = true;

        return;
    },
    infoDivPopulate: function (term) {
        // Build and show div contents
        var termInfo = this.getTermInfo(term);
        if ( termInfo ) {
            this.buildInfoDiv(termInfo);
            $(this.key+'_info').show();
        }
        return;
    },
    buildInfoDiv: function (termInfo) {
        var html = '';
        var javscript = '';
        var sectionKey;
        var clickIds = [];

        // Top row listing this term
        for ( var j = 0; j < this.options.infoDivSections.length; j++ ) {
            sectionKey = this.options.infoDivSections[j];
            html += '<div class="ejp-uat-info-section">';

            if ( sectionKey == 'term' ) {
                html += '<div class="ejp-uat-info-title">Concept: '+termInfo.name+'</div>';
                html += this.buildInfoDivLink(termInfo.name, sectionKey, clickIds, 'add');

            } else if ( sectionKey == 'parents' ) {
                // List parent terms
                html += '<div class="ejp-uat-info-title">More General Concepts:</div>';
                var parents = Object.keys(termInfo.parents).sort();
                if ( parents.length > 0 ) {
                    for (var i = 0; i < parents.length; i++ ) {
                        html += '<div class="ejp-uat-info-item">';
                        html += this.buildInfoDivLink(parents[i], sectionKey, clickIds, 'parent');
                        html += this.buildInfoDivLink(parents[i], sectionKey, clickIds, 'add');
                        html += '</div>';
                    }
                } else {
                    html += '<div>(None)</div>';
                }

            } else if ( sectionKey == 'children' ) {
                // List child terms
                html += '<div class="ejp-uat-info-title">More Specific Concepts:</div>';
                var children = Object.keys(termInfo.children).sort();
                if ( children.length > 0 ) {
                    for (var i = 0; i < children.length; i++ ) {
                        html += '<div class="ejp-uat-info-item">';
                        html += this.buildInfoDivLink(children[i], sectionKey, clickIds, 'child');
                        html += this.buildInfoDivLink(children[i], sectionKey, clickIds, 'add');
                        html += '</div>';
                    }
                } else {
                    html += '<div>(None)</div>';
                }
            } else if ( sectionKey == 'altLabels' ) {
                // List child terms
                if ( termInfo.altLabels.length > 0 ) {
                    html += '<div class="ejp-uat-info-title">Alternate Terms:</div>';
                    // Iterate in the order loaded by XML
                    for (var i = 0; i < termInfo.altLabels.length; i++ ) {
                        html += '<div class="ejp-uat-info-item">';
                        html += '<div class="ejp-uat-info-term">'+termInfo.altLabels[i]+'</div>';
                        html += '</div>';
                    }
                }
            } else if ( sectionKey == 'related' ) {
                // List related concepts
                var related = Object.keys(termInfo.related).sort();
                if ( related.length > 0 ) {
                    html += '<div class="ejp-uat-info-title">Related Concepts:</div>';
                    if ( related.length > 0 ) {
                        for (var i = 0; i < related.length; i++ ) {
                            html += '<div class="ejp-uat-info-item">';
                            html += this.buildInfoDivLink(related[i], sectionKey, clickIds, 'related');
                            html += this.buildInfoDivLink(related[i], sectionKey, clickIds, 'add');
                            html += '</div>';
                        }
                    }
                }
            } else if ( sectionKey == 'definitions' ) {
                // List definitions
                if ( termInfo.definitions.length > 0 ) {
                    html += '<div class="ejp-uat-info-title">Definition:</div>';
                    // Iterate in the order loaded by XML
                    for (var i = 0; i < termInfo.definitions.length; i++ ) {
                        html += '<div class="ejp-uat-info-item">';
                        html += '<div class="ejp-uat-info-term">'+termInfo.definitions[i]+'</div>';
                        html += '</div>';
                    }
                }
            } else if ( sectionKey == 'scopeNotes' ) {
                // List scope notes
                if ( termInfo.scopeNotes.length > 0 ) {
                    html += '<div class="ejp-uat-info-title">Scope Notes:</div>';
                    // Iterate in the order loaded by XML
                    for (var i = 0; i < termInfo.scopeNotes.length; i++ ) {
                        html += '<div class="ejp-uat-info-item">';
                        html += '<div class="ejp-uat-info-term">'+termInfo.scopeNotes[i]+'</div>';
                        html += '</div>';
                    }
                }
            }
            html += '</div>';
        }

        // Add the html to the div
        $(this.key+'_info').update(html);

        // Add js events
        var termClickFunc = this.infoDivTermClick.bind(this);
        for (var i = 0; i<clickIds.length; i++ ) {
            $(clickIds[i]).addEventListener('click', function(e){ termClickFunc(this); }, false);
        }
        return;
    },
    buildInfoDivLink: function(term, sectionKey, clickIds, type){
        var html, id, linkClass, contents;
        id = this.key+'_info_'+type+'_'+sectionKey+'_'+this.getExternalId(term);

       if ( type == 'add' ) {
            linkClass = 'ejp-uat-info-add';
            contents = this.options.infoDivAddIcon;
        } else {
            // case for children/parents/related
            linkClass = 'ejp-uat-info-term';
            contents = '<a href="javascript:void(0);">'+term+'</a>';
        }

        // Build contents
        html = '<div class="'+linkClass+'" id="'+id+'">'+contents+'</div>';
        clickIds.push(id);
        return html;
    },
    infoDivTermClick: function (termDiv) {
        var re = RegExp( this.key+'_info_(parent|child|related|add)_[a-zA-Z]+_(\\d+)' );
        var found = termDiv.id.match( re );
        if (!found) return;

        // Get term from external id
        var externalId = found[2];
        var term = this.getTermFromExternalId(externalId);

        if ( found[1] == 'add' ) {
            this.termAdd( term, externalId );

        } else {
            // Parent, child, or related term clicked, update the info div with the clicked term
            // re-populate info div with new term
            this.infoDivPopulate(term);

            // add this item to the search (new search will be executed onFocus)
            $(this.key+'_input').value = term;
            this.tokenBounds = null; // Re-compute token bounds
        }

        return;
    }
});

function ejpUatAutocompleterInit( key, opts ) {
    var acId = key+'_uatcompleter';

    //return if already created
    if ( $(acId) ) return;

    //create autocompleter obj
    new Uat.Autocompleter( key, acId, opts );

    return;
}

function ejpUatGetTerms(url, callback, callCnt) {
    // Setup global cache for this URL
    if ( !Uat['urls'][url] ) {
        Uat['urls'][url] = {};
        Uat['urls'][url]['status'] = '';
    }
    if ( !callCnt ) {
        callCnt = 0;
    } else {
        callCnt++;
    }
    if ( callCnt > 100 ) return; // Give up

    if ( Uat['urls'][url]['status'] == '' || Uat['urls'][url]['status'] == 'failed' ) {
        Uat['urls'][url]['status'] = 'loading';
        ejpUatHttpGetAsync( url, function (responseText, responseStatus) {
            if ( responseStatus == 200 ) {
                // Successfully got page
                // Mark as successful
                Uat['urls'][url]['status'] = 'success';

                // parsing function
                callback( url, responseText );

            } else {
                Uat['urls'][url]['status'] == 'failed';
                alert('Unable to load terms');
                return;
            }
        });

    } else if ( Uat['urls'][url]['status'] == 'loading' ) {
        // Another httpget is in progess
        if ( callCnt == 10 ) {
            // we've waited 10 seconds for another request to load, assume the other failed without resetting status, try again
            Uat['urls'][url]['status'] = 'failed';
            ejpUatGetTerms(url, callback, callCnt);
        } else {
            // Check again in a second
            setTimeout(function () {
                ejpUatGetTerms(url, callback, callCnt);
            }, 1000);
        }

    } else if ( Uat['urls'][url]['status'] == 'success' ) {
        // Already loaded the terms, nothing to do
    } else {
        console.log('Unknown state: '+Uat['urls'][url]['status']);
    }

    return;
}

function ejpUatParseXmlTerms(url, xmlString) {
    var parser, xmlDoc;
    parser = new DOMParser();

    xmlDoc = parser.parseFromString(xmlString,"text/xml");

    var terms = {};

    var termNodes = xmlDoc.getElementsByTagName("rdf:Description");
    var termId, termNode, termName, aboutLink, externalIdRe, externalId, tagName, tempId;
    externalIdRe = new RegExp( '.+\/(\\d+)$' ); // Links in format "http://astrothesaurus.org/uat/1266"

    for ( var i = 0; i < termNodes.length; i++ ) {
        termNode = termNodes[i];
        aboutLink = termNode.getAttribute('rdf:about');
        var found = aboutLink.match(externalIdRe);
        if ( !found ) continue; // Skip if we can't find externalid
        externalId = found[1];

        if ( !terms[externalId] ) {
            terms[externalId] = {};
            terms[externalId].name = '';
            terms[externalId].children = {};
            terms[externalId].parents = {};
            terms[externalId].related = {};
            terms[externalId].definitions = [];
            terms[externalId].scopeNotes = [];
            terms[externalId].altLabels = [];
            terms[externalId].externalId = externalId;
        }

        // Init this in the terms list
        for ( var j = 0; j < termNode.childNodes.length; j++ ) {
            tagName = termNode.childNodes[j].tagName;
            if ( tagName == 'prefLabel' ) {
                // Label for this term
                terms[externalId]['name'] = termNode.childNodes[j].textContent;
            } else if ( tagName == 'broader' ) {

                aboutLink = termNode.childNodes[j].getAttribute('rdf:resource');
                found = aboutLink.match(externalIdRe);
                if ( !found ) continue; // Skip if we can't find externalid
                tempId = found[1];

                // Add parent
                terms[externalId]['parents'][tempId] = 1;

            } else if ( tagName == 'narrower' ) {

                aboutLink = termNode.childNodes[j].getAttribute('rdf:resource');
                found = aboutLink.match(externalIdRe);
                if ( !found ) continue; // Skip if we can't find externalid
                tempId = found[1];

                // Add child
                terms[externalId]['children'][tempId] = 1;

            } else if ( tagName == 'related' ) {

                aboutLink = termNode.childNodes[j].getAttribute('rdf:resource');
                found = aboutLink.match(externalIdRe);
                if ( !found ) continue; // Skip if we can't find externalid
                tempId = found[1];

                // Add to list of related terms
                terms[externalId]['related'][tempId] = 1;

            } else if ( tagName == 'definition' ) {
                // Add definition
                terms[externalId]['definitions'].push(termNode.childNodes[j].textContent);

            } else if ( tagName == 'scopeNote' ) {
                // Add scope note
                terms[externalId]['scopeNotes'].push(termNode.childNodes[j].textContent);

            } else if ( tagName == 'altLabel' ) {
                // Add altLabel
                terms[externalId]['altLabels'].push(termNode.childNodes[j].textContent);
            }
        }
    }

    // Re-hash terms using names as keys
    Uat['urls'][url]['terms'] = {};
    Uat['urls'][url]['externalIds'] = {};
    Object.keys( terms ).each(function(externalId) {
        var term = terms[externalId];
        if ( !term.name || term.name == '' || term.name.length < 1 ) {
            return;
        }
        ejpUatParseTermsInitTerm(term.name, Uat['urls'][url]['terms']);
        Uat['urls'][url]['terms'][term.name].externalId = externalId;
        Uat['urls'][url]['terms'][term.name].definitions = term.definitions;
        Uat['urls'][url]['terms'][term.name].scopeNotes = term.scopeNotes;
        Uat['urls'][url]['terms'][term.name].altLabels = term.altLabels;
        Uat['urls'][url]['externalIds'][term.externalId] = term.name;

        Object.keys( term.children ).each(function(tempId){

            // Ensure this child exists
            if ( !terms[tempId] ) return;
            // Init the new hash
            ejpUatParseTermsInitTerm(terms[tempId].name, Uat['urls'][url]['terms']);
            // Add child
            Uat['urls'][url]['terms'][term.name].children[terms[tempId].name] = 1;
            // Add this parent to child
            Uat['urls'][url]['terms'][terms[tempId].name].parents[term.name] = 1;
        });

        Object.keys( term.parents ).each(function(tempId){

            // Ensure this parent exists
            if ( !terms[tempId] ) return;
            // Init the new hash
            ejpUatParseTermsInitTerm(terms[tempId].name, Uat['urls'][url]['terms']);
            // Add this child to parent
            Uat['urls'][url]['terms'][terms[tempId].name].children[term.name] = 1;
            // Add parent to child
            Uat['urls'][url]['terms'][term.name].parents[terms[tempId].name] = 1;
        });

        Object.keys( term.related ).each(function(tempId){

            // Ensure this parent exists
            if ( !terms[tempId] ) return;
            // Init the new hash
            ejpUatParseTermsInitTerm(terms[tempId].name, Uat['urls'][url]['terms']);

            // Add related, monodirectional?
            Uat['urls'][url]['terms'][term.name].related[terms[tempId].name] = 1;
        });
    });
}

function ejpUatParseTermsInitTerm(name, terms){
    if ( !terms[name] ) {
        terms[name] = {};
        terms[name].externalId = '';
        terms[name].children = {};
        terms[name].parents = {};
        terms[name].related = {};
        terms[name].name = name;
    }
}

function ejpUatHttpGetAsync( url, callback ) {
    var xmlHttp = new XMLHttpRequest();
    xmlHttp.onreadystatechange = function() {
        if (xmlHttp.readyState == 4 ) {
            callback(xmlHttp.responseText, xmlHttp.status);
        }
    }
    xmlHttp.open("GET", url, true);
    xmlHttp.send(null);
}
function ejpUatEscapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'); // $& means the whole matched string
}
