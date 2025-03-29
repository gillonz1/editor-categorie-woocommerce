/**
 * Merge Categories JS
 * 
 * Handles the merge categories functionality
 */

jQuery(document).ready(function($) {
    // Initialize variables
    var $tree = $('#ec-taxonomy-tree');
    var taxonomy = $tree.data('taxonomy');
    var $loading = $('#ec-loading');
    var selectedNodes = [];
    var targetNode = null;
    var parentNode = null; // Variabile per la categoria genitore
    
    // Add merge button to the controls
    $('.ec-tree-controls').append('<button id="ec-merge-categories" class="button">Fondi Categorie</button>');
    
    // Add multi-select mode toggle
    $('.ec-tree-controls').append('<label id="ec-multiselect-label" style="margin-left: 15px;"><input type="checkbox" id="ec-multiselect-mode"> Selezione multipla</label>');
    
    // Create merge dialog
    var $mergeDialog = $('<div id="ec-merge-dialog" title="Fondi Categorie" style="display:none;">' +
        '<p>Seleziona la categoria di destinazione in cui fondere le categorie selezionate:</p>' +
        '<div id="ec-merge-target-selector"></div>' +
        '<div id="ec-merge-options">' +
        '<p>Opzioni di destinazione:</p>' +
        '<div class="ec-merge-option">' +
        '<label><input type="radio" name="ec-target-option" value="existing" checked> Usa categoria esistente</label>' +
        '</div>' +
        '<div class="ec-merge-option">' +
        '<label><input type="radio" name="ec-target-option" value="new"> Crea nuova categoria</label>' +
        '<div id="ec-new-category-container" style="margin-left: 20px; display: none;">' +
        '<label>Nome: <input type="text" id="ec-new-category-name"></label>' +
        '<div style="margin-top: 10px;">' +
        '<label><input type="checkbox" id="ec-new-category-as-child"> Crea come sottocategoria</label>' +
        '</div>' +
        '<div id="ec-parent-category-container" style="margin-top: 10px; display: none;">' +
        '<p>Seleziona la categoria genitore:</p>' +
        '<div id="ec-parent-category-selector"></div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '<p>Opzioni di fusione:</p>' +
        '<label><input type="checkbox" id="ec-keep-source"> Mantieni le categorie di origine (deseleziona per eliminarle)</label><br>' +
        '<div id="ec-products-destination-container">' +
        '<p>Destinazione dei prodotti:</p>' +
        '<div class="ec-products-destination-option">' +
        '<label><input type="radio" name="ec-products-destination" value="target" checked> Sposta nella categoria di destinazione</label>' +
        '</div>' +
        '<div class="ec-products-destination-option">' +
        '<label><input type="radio" name="ec-products-destination" value="source"> Mantieni nelle categorie di origine</label>' +
        '</div>' +
        '<div class="ec-products-destination-option">' +
        '<label><input type="radio" name="ec-products-destination" value="new"> Sposta in una nuova categoria</label>' +
        '<div id="ec-new-products-category-container" style="margin-left: 20px; display: none;">' +
        '<label>Nome: <input type="text" id="ec-new-products-category-name"></label>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>' +
        '</div>');
    
    // Append dialog to the page
    $('.ec-taxonomy-manager-wrap').append($mergeDialog);
    
    // Initialize dialog
    $mergeDialog.dialog({
        autoOpen: false,
        modal: true,
        width: 400,
        buttons: {
            'Fondi': function() {
                mergeCategoriesConfirm();
            },
            'Annulla': function() {
                $(this).dialog('close');
            }
        }
    });
    
    // Toggle multi-select mode (Restore the logic to destroy/recreate tree with/without checkbox plugin)
    $('#ec-multiselect-mode').change(function() {
        var treeInstance = $tree.jstree(true);
        var originalState = treeInstance ? treeInstance.get_state() : null; // Preserve state if possible

        if ($(this).is(':checked')) {
            // Enable checkbox multi-select
            if(treeInstance) $tree.jstree('destroy');
            $tree.jstree({
                'core': {
                    'multiple': true, // Checkbox plugin requires multiple: true
                    'themes': { 'responsive': true, 'variant': 'large' }, // Simplified for example, ensure these match taxonomy-tree.js init
                    'check_callback': true, // Ensure this matches taxonomy-tree.js init
                    'data': function(node, callback) { // Ensure this matches taxonomy-tree.js init
                        if (node.id === '#') {
                            $.ajax({
                                url: ecData.ajaxurl, type: 'POST', dataType: 'json',
                                data: { action: 'ec_get_taxonomy_terms', taxonomy: taxonomy, nonce: ecData.nonce },
                                success: function(response) { callback(response.success ? response.data : []); },
                                error: function() { callback([]); }
                            });
                        } else { callback([]); }
                    },
                    'state': originalState ? originalState.core : undefined // Restore core state
                },
                'plugins': ['dnd', 'search', 'contextmenu', 'wholerow', 'state', 'checkbox'], // Add checkbox plugin
                'checkbox': {
                    'three_state': false,
                    'cascade': ''
                },
                 // Restore other plugin states if needed (e.g., search)
                'search': originalState && originalState.search ? originalState.search : undefined,
                'state': { 'key': 'ec_jstree_state_' + taxonomy } // Keep state key consistent
            });
        } else {
            // Disable checkbox, enable standard multi-select (Ctrl/Shift)
            selectedNodes = []; // Clear selection when switching mode
            if(treeInstance) $tree.jstree('destroy');
            $tree.jstree({
                 'core': {
                    'multiple': true, // Standard multi-select requires multiple: true
                    'themes': { 'responsive': true, 'variant': 'large' }, // Ensure these match taxonomy-tree.js init
                    'check_callback': true, // Ensure this matches taxonomy-tree.js init
                    'data': function(node, callback) { // Ensure this matches taxonomy-tree.js init
                         if (node.id === '#') {
                            $.ajax({
                                url: ecData.ajaxurl, type: 'POST', dataType: 'json',
                                data: { action: 'ec_get_taxonomy_terms', taxonomy: taxonomy, nonce: ecData.nonce },
                                success: function(response) { callback(response.success ? response.data : []); },
                                error: function() { callback([]); }
                            });
                        } else { callback([]); }
                    },
                    'state': originalState ? originalState.core : undefined // Restore core state
                },
                'plugins': ['dnd', 'search', 'contextmenu', 'wholerow', 'state'], // Remove checkbox plugin
                 // Restore other plugin states if needed (e.g., search)
                'search': originalState && originalState.search ? originalState.search : undefined,
                'state': { 'key': 'ec_jstree_state_' + taxonomy } // Keep state key consistent
            });
        }
    });
    
    // Handle merge button click
    $('#ec-merge-categories').click(function() {
        // Check if nodes are selected
        if ($('#ec-multiselect-mode').is(':checked')) {
            // Ottieni tutti i nodi selezionati, inclusi quelli non adiacenti
            selectedNodes = $tree.jstree('get_selected', true);
            if (selectedNodes.length === 0) {
                showNotification('Seleziona almeno una categoria da fondere', 'error');
                return;
            }
        } else {
            var selectedNode = $tree.jstree('get_selected', true)[0];
            if (!selectedNode) {
                showNotification('Seleziona prima una categoria da fondere', 'error');
                return;
            }
            selectedNodes = [selectedNode];
        }
        
        // Open merge dialog
        openMergeDialog();
    });
    
    // Toggle new category input visibility
    $('input[name="ec-target-option"]').change(function() {
        if ($(this).val() === 'new') {
            $('#ec-merge-target-selector').hide();
            $('#ec-new-category-container').show();
        } else {
            $('#ec-merge-target-selector').show();
            $('#ec-new-category-container').hide();
            // Nascondi anche il selettore della categoria genitore
            $('#ec-parent-category-container').hide();
        }
    });
    
    // Toggle new products category input visibility
    $('input[name="ec-products-destination"]').change(function() {
        if ($(this).val() === 'new') {
            $('#ec-new-products-category-container').show();
        } else {
            $('#ec-new-products-category-container').hide();
        }
    });
    
    // Toggle parent category selector visibility
    $('#ec-new-category-as-child').change(function() {
        if ($(this).is(':checked')) {
            $('#ec-parent-category-container').show();
            
            // Inizializza il selettore della categoria genitore se non è già stato fatto
            if ($('#ec-parent-category-selector').children().length === 0) {
                initializeParentCategorySelector();
            }
        } else {
            $('#ec-parent-category-container').hide();
        }
    });
    
    // Initialize parent category selector
    function initializeParentCategorySelector() {
        var $parentSelector = $('#ec-parent-category-selector');
        $parentSelector.empty();
        
        // Create a new tree for parent selection
        $parentSelector.append('<div id="ec-parent-tree"></div>');
        
        // Initialize the parent tree
        $('#ec-parent-tree').jstree({
            'core': {
                'themes': {
                    'responsive': true,
                    'variant': 'small'
                },
                'data': function(node, callback) {
                    if (node.id === '#') {
                        // Load all nodes
                        $.ajax({
                            url: ecData.ajaxurl,
                            type: 'POST',
                            dataType: 'json',
                            data: {
                                action: 'ec_get_taxonomy_terms',
                                taxonomy: taxonomy,
                                nonce: ecData.nonce
                            },
                            success: function(response) {
                                if (response.success && response.data) {
                                    callback(response.data);
                                } else {
                                    callback([]);
                                }
                            },
                            error: function() {
                                callback([]);
                            }
                        });
                    } else {
                        // Children are already included in the initial data
                        callback([]);
                    }
                }
            },
            'plugins': ['search', 'wholerow']
        });
        
        // Handle parent selection
        $('#ec-parent-tree').on('select_node.jstree', function(e, data) {
            parentNode = data.node;
        });
    }
    
    // Open merge dialog
    function openMergeDialog() {
        // Reset target options
        $('input[name="ec-target-option"][value="existing"]').prop('checked', true).trigger('change');
        $('#ec-new-category-name').val('');
        $('#ec-new-category-as-child').prop('checked', false);
        parentNode = null; // Reset parent node selection
        
        // Reset products destination options
        $('input[name="ec-products-destination"][value="target"]').prop('checked', true).trigger('change');
        $('#ec-new-products-category-name').val('');
        $('#ec-new-products-category-container').hide();
        
        // Clone the tree for target selection
        var $targetSelector = $('#ec-merge-target-selector');
        $targetSelector.empty();
        
        // Create a new tree for target selection
        $targetSelector.append('<div id="ec-merge-tree"></div>');
        
        // Get all selected node IDs to filter out
        var selectedNodeIds = selectedNodes.map(function(node) {
            return node.id;
        });
        
        // Initialize the target tree
        $('#ec-merge-tree').jstree({
            'core': {
                'themes': {
                    'responsive': true,
                    'variant': 'small'
                },
                'data': function(node, callback) {
                    if (node.id === '#') {
                        // Load root nodes
                        $.ajax({
                            url: ecData.ajaxurl,
                            type: 'POST',
                            dataType: 'json',
                            data: {
                                action: 'ec_get_taxonomy_terms',
                                taxonomy: taxonomy,
                                nonce: ecData.nonce
                            },
                            success: function(response) {
                                if (response.success && response.data) {
                                    // Filter out all selected nodes and their descendants
                                    var filteredData = response.data;
                                    for (var i = 0; i < selectedNodeIds.length; i++) {
                                        filteredData = filterNodes(filteredData, selectedNodeIds[i]);
                                    }
                                    callback(filteredData);
                                } else {
                                    callback([]);
                                }
                            },
                            error: function() {
                                callback([]);
                            }
                        });
                    } else {
                        // Children are already included in the initial data
                        callback([]);
                    }
                }
            },
            'plugins': ['search', 'wholerow']
        });
        
        // Handle target selection
        $('#ec-merge-tree').on('select_node.jstree', function(e, data) {
            targetNode = data.node;
        });
        
        // Open the dialog
        $mergeDialog.dialog('open');
    }
    
    // Filter out a node and its descendants from the tree data
    function filterNodes(nodes, nodeIdToFilter) {
        // Modifica: non filtrare più le categorie, mostra tutte le categorie disponibili
        // come possibili destinazioni per la fusione
        return nodes;
        
        /* Codice originale commentato
        return nodes.filter(function(node) {
            if (node.id == nodeIdToFilter) {
                return false;
            }
            
            if (node.children && node.children.length > 0) {
                node.children = filterNodes(node.children, nodeIdToFilter);
            }
            
            return true;
        });
        */
    }
    
    // Merge categories confirmation
    function mergeCategoriesConfirm() {
        var targetOption = $('input[name="ec-target-option"]:checked').val();
        var keepSource = $('#ec-keep-source').is(':checked');
        var productsDestination = $('input[name="ec-products-destination"]:checked').val();
        var targetTermId = null;
        var newCategoryName = '';
        var parentId = 0;
        var newProductsCategoryName = '';
        
        // Validate products destination
        if (productsDestination === 'new') {
            newProductsCategoryName = $('#ec-new-products-category-name').val().trim();
            if (newProductsCategoryName === '') {
                showNotification('Inserisci un nome per la nuova categoria dei prodotti', 'error');
                return;
            }
        }
        
        if (targetOption === 'existing') {
            // Check if target is selected
            if (!targetNode) {
                showNotification('Seleziona una categoria di destinazione', 'error');
                return;
            }
            targetTermId = targetNode.id;
        } else {
            // Check if new category name is provided
            newCategoryName = $('#ec-new-category-name').val().trim();
            if (newCategoryName === '') {
                showNotification('Inserisci un nome per la nuova categoria', 'error');
                return;
            }
            
            // Check if it should be created as a child category
            if ($('#ec-new-category-as-child').is(':checked')) {
                if (!parentNode) {
                    showNotification('Seleziona una categoria genitore', 'error');
                    return;
                }
                parentId = parentNode.id;
            }
        }
        
        // Create confirmation message
        var sourceNames = selectedNodes.map(function(node) {
            return '"' + node.text.replace(/ \(\d+\)$/, '') + '"';
        }).join(', ');
        
        var targetName = '';
        if (targetOption === 'existing') {
            targetName = '"' + targetNode.text.replace(/ \(\d+\)$/, '') + '"';
        } else {
            targetName = '"' + newCategoryName + '"';
            if (parentId > 0) {
                targetName += ' (nuova sottocategoria di "' + parentNode.text.replace(/ \(\d+\)$/, '') + '")';
            } else {
                targetName += ' (nuova categoria)';
            }
        }
        
        // Confirm merge
        if (!confirm('Sei sicuro di voler fondere le categorie ' + sourceNames + ' in ' + targetName + '?')) {
            return;
        }
        
        // Close dialog
        $mergeDialog.dialog('close');
        
        // Show loading
        $loading.show();
        
        // If we need to create a new category first
        if (targetOption === 'new') {
            $.ajax({
                url: ecData.ajaxurl,
                type: 'POST',
                dataType: 'json',
                data: {
                    action: 'ec_create_term',
                    parent_id: parentId,
                    name: newCategoryName,
                    taxonomy: taxonomy,
                    nonce: ecData.nonce
                },
                success: function(response) {
                    if (response.success) {
                        // Now merge with the newly created category
                        mergeWithTarget(response.data.term.id, keepSource);
                    } else {
                        showNotification(response.data.message, 'error');
                        $loading.hide();
                    }
                },
                error: function() {
                    showNotification('Errore durante la creazione della nuova categoria', 'error');
                    $loading.hide();
                }
            });
        } else {
            // Merge with existing target
            mergeWithTarget(targetTermId, keepSource);
        }
    }
    
    // Function to merge with target
    function mergeWithTarget(targetTermId, keepSource) {
        // Collect all source term IDs
        var sourceTermIds = selectedNodes.map(function(node) {
            return node.id;
        });
        
        // Get all objects (posts) associated with the source terms before merging
        var mergedObjects = [];
        var errors = [];
        
        // Store information about source nodes for undo operation
        selectedNodes.forEach(function(sourceNode) {
            mergedObjects.push({
                sourceTermId: sourceNode.id,
                sourceTermName: sourceNode.text.replace(/ \(\d+\)$/, ''),
                originalParentId: sourceNode.parent === '#' ? 0 : sourceNode.parent, // Store original parent ID
                objectIds: [] // Will be populated after merge
            });
        });
        
        // Get products destination option
        var productsDestination = $('input[name="ec-products-destination"]:checked').val();
        var newProductsCategoryName = '';
        
        // If we need to create a new category for products
        if (productsDestination === 'new') {
            newProductsCategoryName = $('#ec-new-products-category-name').val().trim();
            if (newProductsCategoryName === '') {
                showNotification('Inserisci un nome per la nuova categoria dei prodotti', 'error');
                $loading.hide();
                return;
            }
        }
        
        // Show loading
        $loading.show();
        
        // Perform the merge operation with all source terms at once
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_merge_terms',
                source_term_ids: sourceTermIds,
                target_term_id: targetTermId,
                taxonomy: taxonomy,
                keep_source: keepSource,
                products_destination: productsDestination,
                new_products_category_name: newProductsCategoryName,
                nonce: ecData.nonce
            },
            success: function(response) {
                if (response.success) {
                    // After successful merge, get the objects for each source term for undo operation
                    var objectsProcessed = 0;
                    
                    // If we don't need object IDs for undo (e.g., no undo functionality)
                    // we can skip this step
                    if (!window.ecUndoOperations) {
                        completeMerge(errors, mergedObjects, targetTermId, keepSource, productsDestination); // Pass productsDestination
                        return;
                    }
                    
                    // Get objects for each source term (for undo operation)
                    mergedObjects.forEach(function(mergedObj, index) {
                        $.ajax({
                            url: ecData.ajaxurl,
                            type: 'POST',
                            dataType: 'json',
                            data: {
                                action: 'ec_get_term_objects',
                                term_id: mergedObj.sourceTermId,
                                taxonomy: taxonomy,
                                nonce: ecData.nonce
                            },
                            success: function(objectsResponse) {
                                objectsProcessed++;
                                if (objectsResponse.success) {
                                    mergedObjects[index].objectIds = objectsResponse.data.object_ids;
                                }
                                
                                if (objectsProcessed === mergedObjects.length) {
                                    completeMerge(errors, mergedObjects, targetTermId, keepSource, productsDestination); // Pass productsDestination
                                }
                            },
                            error: function() {
                                objectsProcessed++;
                                if (objectsProcessed === mergedObjects.length) {
                                    completeMerge(errors, mergedObjects, targetTermId, keepSource, productsDestination); // Pass productsDestination
                                }
                            }
                        });
                    });
                } else {
                    errors.push(response.data.message);
                    completeMerge(errors, mergedObjects, targetTermId, keepSource, productsDestination); // Pass productsDestination
                }
            },
            error: function() {
                errors.push('Errore durante la fusione delle categorie');
                completeMerge(errors, mergedObjects, targetTermId, keepSource);
            }
        });
    }
    
    // Function to complete merge process
    function completeMerge(errors, mergedObjects, targetTermId, keepSource, productsDestination) { // Added productsDestination
        // Refresh the tree
        $tree.jstree('refresh');
        
        if (errors.length > 0) {
            showNotification('Fusione completata con alcuni errori: ' + errors.join('; '), 'error');
        } else {
            showNotification('Categorie fuse con successo', 'success');
            
            // Add operation to undo history if we have the undo functionality available
            if (window.ecUndoOperations && mergedObjects.length > 0) {
                window.ecUndoOperations.addOperationToHistory({
                    type: 'merge',
                    sourceTerms: mergedObjects,
                    targetTermId: targetTermId,
                    taxonomy: taxonomy,
                    keepSource: keepSource,
                    productsDestination: productsDestination // Use the passed parameter
                });
            }
        }
        
        $loading.hide();
        
        // Reset selected nodes
        selectedNodes = [];
    }
    
    // Listen for node selection in the main tree
    $tree.on('select_node.jstree', function(e, data) {
        if (!$('#ec-multiselect-mode').is(':checked')) {
            selectedNodes = [data.node];
        }
    });
    
    // Listen for node deselection in the main tree
    $tree.on('deselect_node.jstree', function(e, data) {
        if (!$('#ec-multiselect-mode').is(':checked')) {
            selectedNodes = [];
        }
    });
    
    // Show notification (reusing the function from taxonomy-tree.js)
    function showNotification(message, type) {
        var notificationClass = 'notice notice-' + (type === 'error' ? 'error' : 'success');
        var $notification = $('<div class="' + notificationClass + ' is-dismissible"><p>' + message + '</p></div>');
        
        // Remove any existing notifications
        $('.ec-notification').remove();
        
        // Add the notification to the page
        $('.ec-taxonomy-manager-wrap h1').after($notification);
        
        // Add dismiss button
        $notification.append('<button type="button" class="notice-dismiss"><span class="screen-reader-text">Dismiss this notice.</span></button>');
        
        // Handle dismiss button click
        $notification.find('.notice-dismiss').click(function() {
            $notification.fadeOut(300, function() {
                $(this).remove();
            });
        });
        
        // Auto-dismiss after 5 seconds
        setTimeout(function() {
            $notification.fadeOut(300, function() {
                $(this).remove();
            });
        }, 5000);
    }
});