<?php
/**
 * AJAX Handlers for Merge Term Functionality
 * 
 * Handles AJAX requests for merging taxonomy terms
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Merge terms
add_action('wp_ajax_ec_merge_terms', 'ec_ajax_merge_terms');
function ec_ajax_merge_terms() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $source_term_ids = isset($_POST['source_term_ids']) ? $_POST['source_term_ids'] : array();
    $target_term_id = isset($_POST['target_term_id']) ? intval($_POST['target_term_id']) : 0;
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    $keep_source = isset($_POST['keep_source']) ? filter_var($_POST['keep_source'], FILTER_VALIDATE_BOOLEAN) : false;
    $move_products = isset($_POST['move_products']) ? filter_var($_POST['move_products'], FILTER_VALIDATE_BOOLEAN) : true;
    $products_destination = isset($_POST['products_destination']) ? sanitize_text_field($_POST['products_destination']) : 'target'; // 'target', 'source', 'new'
    
    // Ensure source_term_ids is an array
    if (!is_array($source_term_ids)) {
        $source_term_ids = array($source_term_ids);
    }
    
    // Convert all source term IDs to integers
    $source_term_ids = array_map('intval', $source_term_ids);
    
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
    
    // Validate all source terms
    $source_terms = array();
    foreach ($source_term_ids as $source_term_id) {
        $source_term = get_term($source_term_id, $taxonomy);
        if (is_wp_error($source_term) || !$source_term) {
            wp_send_json_error(array('message' => __('Una delle categorie di origine non è valida', 'editor-categorie')));
        }
        $source_terms[] = $source_term;
    }
    
    if (is_wp_error($target_term) || !$target_term) {
        wp_send_json_error(array('message' => __('Categoria di destinazione non valida', 'editor-categorie')));
    }
    
    // Prevent merging a term with itself
    if (in_array($target_term_id, $source_term_ids)) {
        wp_send_json_error(array('message' => __('Non puoi fondere una categoria con se stessa', 'editor-categorie')));
    }
    
    // Prevent merging a term with its descendant
    $ancestors = get_ancestors($target_term_id, $taxonomy);
    foreach ($source_term_ids as $source_term_id) {
        if (in_array($source_term_id, $ancestors)) {
            wp_send_json_error(array('message' => __('Non puoi fondere una categoria con uno dei suoi discendenti', 'editor-categorie')));
        }
    }
    
    // Start transaction
    global $wpdb;
    $wpdb->query('START TRANSACTION');
    
    try {
        $processed_terms = 0;
        $total_terms = count($source_term_ids);
        $error_messages = array();
        
        // Handle products destination
        $new_products_category_id = 0;
        $new_products_category_name = isset($_POST['new_products_category_name']) ? sanitize_text_field($_POST['new_products_category_name']) : '';
        
        // If we need to create a new category for products
        if ($products_destination === 'new' && !empty($new_products_category_name)) {
            $new_category_result = wp_insert_term($new_products_category_name, $taxonomy);
            if (is_wp_error($new_category_result)) {
                wp_send_json_error(array('message' => sprintf(__('Errore durante la creazione della nuova categoria per i prodotti: %s', 'editor-categorie'), $new_category_result->get_error_message())));
                return;
            }
            $new_products_category_id = $new_category_result['term_id'];
        }
        
        // Collect all objects from source terms
        $all_objects = array();
        foreach ($source_term_ids as $source_term_id) {
            $objects = get_objects_in_term($source_term_id, $taxonomy);
            if (!empty($objects) && !is_wp_error($objects)) {
                $all_objects = array_merge($all_objects, $objects);
            }
        }
        
        // Remove duplicates
        $all_objects = array_unique($all_objects);
        
        // Process each source term
        foreach ($source_term_ids as $source_term_id) {
            // Get all objects (posts) associated with the source term
            $objects = get_objects_in_term($source_term_id, $taxonomy);
            
            // Handle products based on destination option
            if (!empty($objects) && !is_wp_error($objects)) {
                foreach ($objects as $object_id) {
                    $term_to_set = null;
                    if ($products_destination === 'target') {
                        $term_to_set = $target_term_id;
                    } elseif ($products_destination === 'new' && $new_products_category_id > 0) {
                        $term_to_set = $new_products_category_id;
                    }

                    if ($term_to_set !== null) {
                        // Assign the new term (target or newly created)
                        wp_set_object_terms($object_id, $term_to_set, $taxonomy, true);
                        // Remove the source term to complete the "move"
                        wp_remove_object_terms($object_id, $source_term_id, $taxonomy);
                    }
                    // If 'source' is selected, do nothing (keep products in source categories)
                }
            }
            
            // If we don't want to keep the source term, delete it
            if (!$keep_source) {
                // Delete the source term
                $result = wp_delete_term($source_term_id, $taxonomy);
                
                if (is_wp_error($result)) {
                    $error_messages[] = sprintf(__('Errore durante l\'eliminazione della categoria %d: %s', 'editor-categorie'), 
                        $source_term_id, $result->get_error_message());
                }
            }
            
            $processed_terms++;
        }
        
        // If there were any errors during deletion
        if (!empty($error_messages)) {
            $wpdb->query('ROLLBACK');
            wp_send_json_error(array('message' => implode('; ', $error_messages)));
            return;
        }
        
        // Commit the transaction
        $wpdb->query('COMMIT');
        
        // Prepare success message
        $message = $keep_source ? 
            __('Categorie fuse con successo. La categoria di origine è stata mantenuta.', 'editor-categorie') : 
            __('Categorie fuse con successo. La categoria di origine è stata eliminata.', 'editor-categorie');
            
        // Add information about products destination
        if ($products_destination === 'target') {
            $message .= ' ' . __('I prodotti sono stati spostati nella categoria di destinazione.', 'editor-categorie');
        } elseif ($products_destination === 'source') {
            $message .= ' ' . __('I prodotti sono stati mantenuti nelle categorie di origine.', 'editor-categorie');
        } elseif ($products_destination === 'new') {
            $message .= ' ' . sprintf(__('I prodotti sono stati spostati nella nuova categoria "%s".', 'editor-categorie'), $new_products_category_name);
        }
        
        wp_send_json_success(array(
            'message' => $message,
            'target_term' => array(
                'id' => $target_term_id,
                'name' => $target_term->name
            ),
            'products_destination' => $products_destination,
            'new_products_category_id' => $new_products_category_id,
            'new_products_category_name' => $new_products_category_name
        ));
    } catch (Exception $e) {
        // If an exception occurred, rollback the transaction
        $wpdb->query('ROLLBACK');
        wp_send_json_error(array(
            'message' => __('Si è verificato un errore durante la fusione delle categorie', 'editor-categorie'),
            'error' => $e->getMessage()
        ));
    }
}