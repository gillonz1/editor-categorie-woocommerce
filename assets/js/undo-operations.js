/**
 * Undo Operations JS
 * 
 * Handles the undo functionality for category operations
 */

jQuery(document).ready(function($) {
    // Initialize variables
    var operationsHistory = [];
    var maxHistoryLength = 10; // Maximum number of operations to store
    
    // Add undo button to the controls
    $('.ec-tree-controls').append('<button id="ec-undo-operation" class="button" disabled>Annulla</button>');
    
    // Handle undo button click
    $('#ec-undo-operation').click(function() {
        if (operationsHistory.length > 0) {
            var lastOperation = operationsHistory.pop();
            undoOperation(lastOperation);
            
            // Disable button if no more operations in history
            if (operationsHistory.length === 0) {
                $(this).prop('disabled', true);
            }
        }
    });
    
    // Function to add operation to history
    function addOperationToHistory(operation) {
        operationsHistory.push(operation);
        
        // Limit history length
        if (operationsHistory.length > maxHistoryLength) {
            operationsHistory.shift();
        }
        
        // Enable undo button
        $('#ec-undo-operation').prop('disabled', false);
    }
    
    // Function to undo an operation
    function undoOperation(operation) {
        var $loading = $('#ec-loading');
        $loading.show();
        
        switch (operation.type) {
            case 'merge':
                undoMergeOperation(operation, function() {
                    $loading.hide();
                    showNotification('Operazione di fusione annullata con successo', 'success');
                });
                break;
            // Add other operation types here as needed
            default:
                $loading.hide();
                showNotification('Impossibile annullare questa operazione', 'error');
                break;
        }
    }
    
    // Function to undo a merge operation
    function undoMergeOperation(operation, callback) {
        var processedCount = 0;
        var totalCount = operation.sourceTerms.length;
        var errors = [];
        
        // Process each source term
        operation.sourceTerms.forEach(function(sourceTerm) {
            // If source term was deleted, recreate it
            if (!operation.keepSource) {
                $.ajax({
                    url: ecData.ajaxurl,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: 'ec_undo_merge_terms',
                        source_term_id: sourceTerm.sourceTermId,
                        target_term_id: operation.targetTermId,
                        taxonomy: operation.taxonomy,
                        object_ids: sourceTerm.objectIds,
                        source_term_name: sourceTerm.sourceTermName,
                        original_parent_id: sourceTerm.originalParentId, // Send original parent ID
                        nonce: ecData.nonce
                    },
                    success: function(response) {
                        processedCount++;
                        
                        if (!response.success) {
                            errors.push(sourceTerm.sourceTermName + ': ' + response.data.message);
                        }
                        
                        // Check if all undos are complete
                        if (processedCount === totalCount) {
                            // Refresh the tree
                            $('#ec-taxonomy-tree').jstree('refresh');
                            
                            if (errors.length > 0) {
                                showNotification('Annullamento completato con alcuni errori: ' + errors.join('; '), 'error');
                            }
                            
                            if (callback) callback();
                        }
                    },
                    error: function() {
                        processedCount++;
                        errors.push(sourceTerm.sourceTermName + ': Errore durante l\'annullamento');
                        
                        // Check if all undos are complete
                        if (processedCount === totalCount) {
                            // Refresh the tree
                            $('#ec-taxonomy-tree').jstree('refresh');
                            
                            if (errors.length > 0) {
                                showNotification('Annullamento completato con alcuni errori: ' + errors.join('; '), 'error');
                            }
                            
                            if (callback) callback();
                        }
                    }
                });
            } else {
                // If source term was kept, just remove the objects from target term
                $.ajax({
                    url: ecData.ajaxurl,
                    type: 'POST',
                    dataType: 'json',
                    data: {
                        action: 'ec_undo_merge_terms_kept',
                        source_term_id: sourceTerm.sourceTermId,
                        target_term_id: operation.targetTermId,
                        taxonomy: operation.taxonomy,
                        object_ids: sourceTerm.objectIds,
                        nonce: ecData.nonce
                    },
                    success: function(response) {
                        processedCount++;
                        
                        if (!response.success) {
                            errors.push(sourceTerm.sourceTermName + ': ' + response.data.message);
                        }
                        
                        // Check if all undos are complete
                        if (processedCount === totalCount) {
                            // Refresh the tree
                            $('#ec-taxonomy-tree').jstree('refresh');
                            
                            if (errors.length > 0) {
                                showNotification('Annullamento completato con alcuni errori: ' + errors.join('; '), 'error');
                            }
                            
                            if (callback) callback();
                        }
                    },
                    error: function() {
                        processedCount++;
                        errors.push(sourceTerm.sourceTermName + ': Errore durante l\'annullamento');
                        
                        // Check if all undos are complete
                        if (processedCount === totalCount) {
                            // Refresh the tree
                            $('#ec-taxonomy-tree').jstree('refresh');
                            
                            if (errors.length > 0) {
                                showNotification('Annullamento completato con alcuni errori: ' + errors.join('; '), 'error');
                            }
                            
                            if (callback) callback();
                        }
                    }
                });
            }
        });
    }
    
    // Function to show notification (reusing from taxonomy-tree.js)
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
    
    // Expose functions to global scope for other scripts to use
    window.ecUndoOperations = {
        addOperationToHistory: addOperationToHistory
    };
    
    // Assicurati che il pulsante di annullamento sia visibile
    $('#ec-undo-operation').css('display', 'inline-block');
    $('#ec-undo-operation').css('opacity', '1');
});