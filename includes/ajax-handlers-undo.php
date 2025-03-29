<?php
/**
 * AJAX Handlers for Undo Functionality
 * 
 * Handles AJAX requests for undoing operations
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Undo merge terms operation when source term was deleted
add_action('wp_ajax_ec_undo_merge_terms', 'ec_ajax_undo_merge_terms');
function ec_ajax_undo_merge_terms() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $source_term_id = isset($_POST['source_term_id']) ? intval($_POST['source_term_id']) : 0;
    $target_term_id = isset($_POST['target_term_id']) ? intval($_POST['target_term_id']) : 0;
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    $object_ids = isset($_POST['object_ids']) ? array_map('intval', (array)$_POST['object_ids']) : array();
    $source_term_name = isset($_POST['source_term_name']) ? sanitize_text_field($_POST['source_term_name']) : '';
    $original_parent_id = isset($_POST['original_parent_id']) ? intval($_POST['original_parent_id']) : 0; // Get original parent ID
    
    // Verify taxonomy exists and is hierarchical
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj || !$tax_obj->hierarchical) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Get target term
    $target_term = get_term($target_term_id, $taxonomy);
    if (is_wp_error($target_term) || !$target_term) {
        wp_send_json_error(array('message' => __('Categoria di destinazione non valida', 'editor-categorie')));
    }
    
    // Start transaction
    global $wpdb;
    $wpdb->query('START TRANSACTION');
    
    try {
        // 1. Recreate the source term if it doesn't exist
        $source_term = get_term($source_term_id, $taxonomy);
        
        if (is_wp_error($source_term) || !$source_term) {
            // Term doesn't exist, recreate it
            $result = wp_insert_term(
                $source_term_name,
                $taxonomy,
                array(
                    'term_id' => $source_term_id, // Attempt to reuse the original ID
                    'slug' => sanitize_title($source_term_name),
                    'parent' => $original_parent_id // Set the original parent
                )
            );
            
            if (is_wp_error($result)) {
                $wpdb->query('ROLLBACK');
                wp_send_json_error(array('message' => $result->get_error_message()));
                return;
            }
            
            // Get the newly created term
            $source_term = get_term($result['term_id'], $taxonomy);
        }
        
        // 2. Move objects from target term back to source term
        if (!empty($object_ids)) {
            foreach ($object_ids as $object_id) {
                // Remove the object from the target term
                wp_remove_object_terms($object_id, $target_term_id, $taxonomy);
                
                // Add the object to the source term
                wp_set_object_terms($object_id, $source_term_id, $taxonomy, true);
            }
        }
        
        // Commit the transaction
        $wpdb->query('COMMIT');
        
        wp_send_json_success(array(
            'message' => __('Operazione annullata con successo', 'editor-categorie'),
            'source_term' => array(
                'id' => $source_term->term_id,
                'name' => $source_term->name
            )
        ));
    } catch (Exception $e) {
        // If an exception occurred, rollback the transaction
        $wpdb->query('ROLLBACK');
        wp_send_json_error(array(
            'message' => __('Si è verificato un errore durante l\'annullamento dell\'operazione', 'editor-categorie'),
            'error' => $e->getMessage()
        ));
    }
}

// Undo merge terms operation when source term was kept
add_action('wp_ajax_ec_undo_merge_terms_kept', 'ec_ajax_undo_merge_terms_kept');
function ec_ajax_undo_merge_terms_kept() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $source_term_id = isset($_POST['source_term_id']) ? intval($_POST['source_term_id']) : 0;
    $target_term_id = isset($_POST['target_term_id']) ? intval($_POST['target_term_id']) : 0;
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    $object_ids = isset($_POST['object_ids']) ? array_map('intval', (array)$_POST['object_ids']) : array();
    
    // Verify taxonomy exists and is hierarchical
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj || !$tax_obj->hierarchical) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Get source and target terms
    $source_term = get_term($source_term_id, $taxonomy);
    $target_term = get_term($target_term_id, $taxonomy);
    
    if (is_wp_error($source_term) || !$source_term) {
        wp_send_json_error(array('message' => __('Categoria di origine non valida', 'editor-categorie')));
    }
    
    if (is_wp_error($target_term) || !$target_term) {
        wp_send_json_error(array('message' => __('Categoria di destinazione non valida', 'editor-categorie')));
    }
    
    // Start transaction
    global $wpdb;
    $wpdb->query('START TRANSACTION');
    
    try {
        // Move objects from target term back to source term only
        if (!empty($object_ids)) {
            foreach ($object_ids as $object_id) {
                // Remove the object from the target term
                wp_remove_object_terms($object_id, $target_term_id, $taxonomy);
            }
        }
        
        // Commit the transaction
        $wpdb->query('COMMIT');
        
        wp_send_json_success(array(
            'message' => __('Operazione annullata con successo', 'editor-categorie')
        ));
    } catch (Exception $e) {
        // If an exception occurred, rollback the transaction
        $wpdb->query('ROLLBACK');
        wp_send_json_error(array(
            'message' => __('Si è verificato un errore durante l\'annullamento dell\'operazione', 'editor-categorie'),
            'error' => $e->getMessage()
        ));
    }
}