/**
 * Taxonomy Tree JS
 * 
 * Handles the jsTree initialization and AJAX interactions
 */

jQuery(document).ready(function($) {
    // Initialize variables
    var $tree = $('#ec-taxonomy-tree');
    var taxonomy = $tree.data('taxonomy');
    var $loading = $('#ec-loading');
    var selectedNode = null; // Variabile per tenere traccia del nodo selezionato
    var contextMenuActions = {
        copiedTerm: null
    };
    
    // Initialize jsTree
    function initTree() {
        $loading.show();
        
        $tree.jstree({
            'core': {
                'multiple': true, // Abilita la selezione multipla
                'themes': {
                    'responsive': true,
                    'variant': 'large'
                },
                'check_callback': function(operation, node, node_parent, node_position, more) {
                    // Operations: create_node, rename_node, delete_node, move_node, copy_node
                    if (operation === 'move_node') {
                        // Prevent moving a node to its own descendant
                        if (more && more.dnd && node_parent.id !== '#') {
                            var node_id = parseInt(node.id);
                            var parent_id = parseInt(node_parent.id);
                            
                            // Get all ancestors of the target parent
                            var ancestors = $tree.jstree(true).get_path(node_parent, false, true);
                            
                            // If the node is in the ancestors, prevent the move
                            if (ancestors.indexOf(node_id) !== -1) {
                                return false;
                            }
                        }
                    }
                    return true;
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
                                if (response.success && response.data && response.data.length > 0) {
                                    callback(response.data);
                                } else if (response.success && (!response.data || response.data.length === 0)) {
                                    console.log('Nessuna categoria trovata');
                                    showNotification('Nessuna categoria trovata. Prova a crearne una nuova.', 'error');
                                    callback([]);
                                } else {
                                    showNotification(response.data.message, 'error');
                                    callback([]);
                                }
                                $loading.hide();
                            },
                            error: function(xhr, status, error) {
                                console.error('Errore AJAX:', status, error);
                                showNotification(ecData.messages.updateError, 'error');
                                callback([]);
                                $loading.hide();
                            }
                        });
                    } else {
                        // Children are already included in the initial data
                        callback([]);
                    }
                }
            },
            'plugins': ['dnd', 'search', 'contextmenu', 'wholerow', 'state'],
            'dnd': {
                'is_draggable': function() {
                    return true; // Allow all nodes to be dragged
                }
            },
            'contextmenu': {
                'items': getContextMenuItems
            },
            'search': {
                'show_only_matches': true,
                'show_only_matches_children': true
            },
            'state': {
                'key': 'ec_jstree_state_' + taxonomy
            }
        });
    }
    
    // Context menu items
    function getContextMenuItems(node) {
        var items = {
            'create': {
                'label': 'Nuova Categoria Figlio',
                'action': function() {
                    createTerm(node);
                },
                'icon': 'dashicons dashicons-plus'
            },
            'rename': {
                'label': 'Rinomina',
                'action': function() {
                    renameTerm(node);
                },
                'icon': 'dashicons dashicons-edit'
            },
            'delete': {
                'label': 'Elimina',
                'action': function() {
                    deleteTerm(node);
                },
                'icon': 'dashicons dashicons-trash'
            },
            'copy': {
                'label': 'Copia',
                'action': function() {
                    copyTerm(node);
                },
                'icon': 'dashicons dashicons-admin-page'
            },
            'paste': {
                'label': 'Incolla',
                'action': function() {
                    pasteTerm(node);
                },
                'icon': 'dashicons dashicons-clipboard',
                '_disabled': !contextMenuActions.copiedTerm
            },
            'separator1': '-',
            'edit': {
                'label': 'Modifica',
                'action': function() {
                    var editLink = node.data.edit_link;
                    if (editLink) {
                        window.location.href = editLink;
                    }
                },
                'icon': 'dashicons dashicons-admin-generic'
            },
            'view': {
                'label': 'Visualizza',
                'action': function() {
                    var viewLink = node.data.view_link;
                    if (viewLink) {
                        window.open(viewLink, '_blank');
                    }
                },
                'icon': 'dashicons dashicons-visibility'
            }
        };
        
        // Root node can't be renamed or deleted
        if (node.id === '#') {
            delete items.rename;
            delete items.delete;
            delete items.edit;
            delete items.view;
        }
        
        return items;
    }
    
    // Create new term
    function createTerm(node) {
        var parentId = node.id === '#' ? 0 : node.id;
        var nodeName = node.id === '#' ? 'Root' : node.text;
        
        // Create dialog for new term name
        var termName = prompt('Inserisci il nome per la nuova categoria sotto "' + nodeName + '"');
        
        if (termName === null || termName.trim() === '') {
            return; // User cancelled or empty name
        }
        
        $loading.show();
        
        // Send AJAX request to create term
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_create_term',
                parent_id: parentId,
                name: termName,
                taxonomy: taxonomy,
                nonce: ecData.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Add the new node to the tree
                    var newNode = response.data.term;
                    $tree.jstree('create_node', node.id === '#' ? '#' : node.id, newNode);
                    showNotification(response.data.message, 'success');
                } else {
                    showNotification(response.data.message, 'error');
                }
                $loading.hide();
            },
            error: function() {
                showNotification(ecData.messages.createError, 'error');
                $loading.hide();
            }
        });
    }
    
    // Rename term
    function renameTerm(node) {
        var currentName = node.text.replace(/ \(\d+\)$/, ''); // Remove count from display name
        
        // Create dialog for new term name
        var newName = prompt('Rinomina categoria:', currentName);
        
        if (newName === null || newName.trim() === '') {
            return; // User cancelled or empty name
        }
        
        if (newName === currentName) {
            return; // No change
        }
        
        $loading.show();
        
        // Send AJAX request to rename term
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_rename_term',
                term_id: node.id,
                name: newName,
                taxonomy: taxonomy,
                nonce: ecData.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Update the node text
                    var count = node.text.match(/\((\d+)\)$/);
                    var newText = newName + (count ? ' ' + count[0] : ' (0)');
                    $tree.jstree('rename_node', node.id, newText);
                    showNotification(response.data.message, 'success');
                } else {
                    showNotification(response.data.message, 'error');
                }
                $loading.hide();
            },
            error: function() {
                showNotification(ecData.messages.renameError, 'error');
                $loading.hide();
            }
        });
    }
    
    // Delete term
    function deleteTerm(node) {
        if (!confirm(ecData.messages.deleteConfirm)) {
            return; // User cancelled
        }
        
        $loading.show();
        
        // Send AJAX request to delete term
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_delete_term',
                term_id: node.id,
                taxonomy: taxonomy,
                nonce: ecData.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Remove the node from the tree
                    $tree.jstree('delete_node', node.id);
                    showNotification(response.data.message, 'success');
                } else {
                    showNotification(response.data.message, 'error');
                }
                $loading.hide();
            },
            error: function() {
                showNotification(ecData.messages.deleteError, 'error');
                $loading.hide();
            }
        });
    }
    
    // Handle node move (drag and drop)
    $tree.on('move_node.jstree', function(e, data) {
        var nodeId = data.node.id;
        var newParentId = data.parent === '#' ? 0 : data.parent;
        
        $loading.show();
        
        // Send AJAX request to update term parent
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_move_term',
                term_id: nodeId,
                parent_id: newParentId,
                taxonomy: taxonomy,
                nonce: ecData.nonce
            },
            success: function(response) {
                if (response.success) {
                    showNotification(response.data.message, 'success');
                } else {
                    // Revert the move if there was an error
                    $tree.jstree('refresh');
                    showNotification(response.data.message, 'error');
                }
                $loading.hide();
            },
            error: function() {
                // Revert the move if there was an error
                $tree.jstree('refresh');
                showNotification(ecData.messages.updateError, 'error');
                $loading.hide();
            }
        });
    });
    
    // Initialize search functionality
    var searchTimeout = false;
    $('#ec-search-input').keyup(function() {
        if (searchTimeout) {
            clearTimeout(searchTimeout);
        }
        searchTimeout = setTimeout(function() {
            var searchString = $('#ec-search-input').val();
            $tree.jstree('search', searchString);
        }, 250);
    });
    
    // Clear search
    $('#ec-search-clear').click(function() {
        $('#ec-search-input').val('');
        $tree.jstree('search', '');
    });
    
    // Expand all nodes
    $('#ec-expand-all').click(function() {
        $tree.jstree('open_all');
    });
    
    // Collapse all nodes
    $('#ec-collapse-all').click(function() {
        $tree.jstree('close_all');
    });
    
    // Create root category
    $('#ec-create-root').click(function() {
        // Se c'è un nodo selezionato, usa quello come genitore, altrimenti usa la root
        if (selectedNode) {
            createTerm(selectedNode);
        } else {
            createTerm({ id: '#', text: 'Root' });
        }
    });
    
    // Copy term
    function copyTerm(node) {
        if (node.id === '#') {
            return; // Can't copy root
        }
        
        // Store the copied term
        contextMenuActions.copiedTerm = {
            id: node.id,
            text: node.text,
            data: node.data
        };
        
        showNotification('Categoria copiata. Usa "Incolla" per duplicarla in un\'altra posizione.', 'success');
    }
    
    // Paste term
    function pasteTerm(node) {
        if (!contextMenuActions.copiedTerm) {
            return; // Nothing to paste
        }
        
        var parentId = node.id === '#' ? 0 : node.id;
        var nodeName = node.id === '#' ? 'Root' : node.text;
        var sourceTerm = contextMenuActions.copiedTerm;
        
        // Confirm paste operation
        if (!confirm('Vuoi duplicare la categoria "' + sourceTerm.data.name + '" sotto "' + nodeName + '"?')) {
            return; // User cancelled
        }
        
        $loading.show();
        
        // Send AJAX request to duplicate term
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_duplicate_term',
                source_term_id: sourceTerm.id,
                parent_id: parentId,
                taxonomy: taxonomy,
                nonce: ecData.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Add the new node to the tree
                    var newNode = response.data.term;
                    $tree.jstree('create_node', node.id === '#' ? '#' : node.id, newNode);
                    showNotification(response.data.message, 'success');
                } else {
                    showNotification(response.data.message, 'error');
                }
                $loading.hide();
            },
            error: function() {
                showNotification('Errore durante la duplicazione della categoria', 'error');
                $loading.hide();
            }
        });
    }
    
    // Show notification
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
    
    // Initialize the tree
    initTree();
    
    // Ctrl+Click is handled natively by jsTree when core.multiple is true and checkbox plugin is not active.
    // Shift+Click handler will be added below.
    
    // The 'model.jstree' handler previously here was likely redundant or incorrect for standard multi-selection.
    // Standard multi-selection behavior is controlled by core.multiple and the absence/presence of the checkbox plugin.
    
    // Variabile per tenere traccia dell'ultimo nodo selezionato per Shift+Click
    var lastSelectedNodeId = null;

    // Gestione della selezione con Shift+click
    $(document).on('click', '.jstree-anchor', function(e) {
        var treeInstance = $tree.jstree(true);
        if (!treeInstance) return; // Assicura che l'istanza esista

        // Funziona solo se la modalità multiselezione esplicita NON è attiva
        // e se il tasto Shift è premuto
        var multiSelectCheckbox = $('#ec-multiselect-mode'); // Trova la checkbox
        // Verifica che la checkbox esista prima di controllarne lo stato
        if (multiSelectCheckbox.length > 0 && !multiSelectCheckbox.is(':checked') && e.shiftKey) {
            e.preventDefault();
            var currentClickedNodeId = $(this).closest('.jstree-node').attr('id');

            if (lastSelectedNodeId && currentClickedNodeId !== lastSelectedNodeId) {
                var $allVisibleNodes = $tree.find('.jstree-node:visible');
                var nodeIdsToSelect = [];
                var startIndex = -1;
                var endIndex = -1;

                // Trova gli indici dei nodi nell'elenco dei nodi visibili
                $allVisibleNodes.each(function(index) {
                    var nodeId = $(this).attr('id');
                    if (nodeId === lastSelectedNodeId) {
                        startIndex = index;
                    }
                    if (nodeId === currentClickedNodeId) {
                        endIndex = index;
                    }
                });

                // Se entrambi i nodi sono stati trovati
                if (startIndex !== -1 && endIndex !== -1) {
                    // Determina l'intervallo corretto
                    var start = Math.min(startIndex, endIndex);
                    var end = Math.max(startIndex, endIndex);

                    // Deseleziona tutto prima di selezionare l'intervallo
                    treeInstance.deselect_all(true); // true per non triggerare eventi

                    // Seleziona tutti i nodi nell'intervallo
                    for (var i = start; i <= end; i++) {
                        var nodeId = $allVisibleNodes.eq(i).attr('id');
                        nodeIdsToSelect.push(nodeId);
                    }
                    // Seleziona i nodi senza triggerare eventi singoli, ma triggera l'evento alla fine
                    treeInstance.select_node(nodeIdsToSelect, false, false);
                    // Aggiorna manualmente selectedNode all'ultimo nodo dell'intervallo selezionato
                    selectedNode = treeInstance.get_node(currentClickedNodeId);

                } else {
                     // Se uno dei nodi non è visibile o non trovato, seleziona solo quello corrente
                     treeInstance.deselect_all(true);
                     treeInstance.select_node(currentClickedNodeId, false, false);
                     selectedNode = treeInstance.get_node(currentClickedNodeId); // Aggiorna selectedNode
                     lastSelectedNodeId = currentClickedNodeId; // Aggiorna lastSelectedNodeId
                }

            } else if (!lastSelectedNodeId) {
                 // Se è il primo click con Shift, trattalo come un click normale.
                 // jsTree gestirà la selezione singola. L'evento 'select_node' aggiornerà lastSelectedNodeId.
            }
            // Non aggiornare lastSelectedNodeId qui se si clicca sullo stesso nodo,
            // lascia che l'evento select_node lo gestisca.
        }
        // Se non è Shift+Click (o se la checkbox è attiva), lascia che jsTree gestisca la selezione (singola, Ctrl+Click, o checkbox)
    });

    // Add event handler for node selection
    $tree.on('select_node.jstree', function(e, data) {
        var treeInstance = $tree.jstree(true);
        if (!treeInstance) return;

        // Aggiorna lastSelectedNodeId solo se non è stata una selezione di intervallo con Shift
        // e se la modalità checkbox non è attiva
        var multiSelectCheckbox = $('#ec-multiselect-mode');
        // Verifica che la checkbox esista prima di controllarne lo stato
        if (!e.shiftKey && !(multiSelectCheckbox.length > 0 && multiSelectCheckbox.is(':checked'))) {
             lastSelectedNodeId = data.node.id;
        }
        // Aggiorna sempre il riferimento al nodo "principale" selezionato (utile per azioni singole come context menu)
        // Prendiamo l'ultimo nodo selezionato nell'array data.selected se disponibile, altrimenti il nodo dell'evento
        var currentSelected = treeInstance.get_selected(true);
        selectedNode = currentSelected.length > 0 ? currentSelected[currentSelected.length - 1] : data.node;
    });

     // Resetta lastSelectedNodeId se tutti i nodi vengono deselezionati
    $tree.on('deselect_all.jstree', function() {
        lastSelectedNodeId = null;
        selectedNode = null;
    });

    // Add event handler for deselection
    $tree.on('deselect_node.jstree', function(e, data) {
        var treeInstance = $tree.jstree(true);
        if (!treeInstance) return;

        // Aggiorna lastSelectedNodeId se il nodo deselezionato era l'ultimo selezionato
        // e se la modalità checkbox non è attiva
        var multiSelectCheckbox = $('#ec-multiselect-mode');
        // Verifica che la checkbox esista prima di controllarne lo stato
        if (data.node.id === lastSelectedNodeId && !(multiSelectCheckbox.length > 0 && multiSelectCheckbox.is(':checked'))) {
            var selectedNodes = treeInstance.get_selected();
            if (selectedNodes.length > 0) {
                // Imposta l'ultimo nodo ancora selezionato come 'lastSelected' per Shift+Click
                lastSelectedNodeId = selectedNodes[selectedNodes.length - 1];
            } else {
                lastSelectedNodeId = null;
            }
        }
        // Aggiorna il riferimento al nodo "principale" selezionato
        var currentSelected = treeInstance.get_selected(true);
        selectedNode = currentSelected.length > 0 ? currentSelected[currentSelected.length - 1] : null;
    });
});