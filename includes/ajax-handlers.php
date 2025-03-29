<?php
/**
 * AJAX Handlers
 * 
 * Handles all AJAX requests for the taxonomy manager
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Get taxonomy terms for jsTree
add_action('wp_ajax_ec_get_taxonomy_terms', 'ec_ajax_get_taxonomy_terms');
function ec_ajax_get_taxonomy_terms() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get taxonomy from request
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    
    // Verify taxonomy exists and is hierarchical
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj || !$tax_obj->hierarchical) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Get terms tree
    $taxonomy_manager = new EC_Taxonomy_Manager();
    $terms_tree = $taxonomy_manager->get_taxonomy_terms_tree($taxonomy);
    
    wp_send_json_success($terms_tree);
}

// Move term (update parent)
add_action('wp_ajax_ec_move_term', 'ec_ajax_move_term');
function ec_ajax_move_term() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $term_id = isset($_POST['term_id']) ? intval($_POST['term_id']) : 0;
    $parent_id = isset($_POST['parent_id']) ? intval($_POST['parent_id']) : 0;
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    
    // Verify taxonomy exists and is hierarchical
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj || !$tax_obj->hierarchical) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Prevent moving a term to its own descendant
    if ($parent_id > 0) {
        $ancestors = get_ancestors($parent_id, $taxonomy);
        if (in_array($term_id, $ancestors)) {
            wp_send_json_error(array('message' => __('Non puoi spostare una categoria sotto uno dei suoi discendenti', 'editor-categorie')));
        }
    }
    
    // Update term parent
    $result = wp_update_term($term_id, $taxonomy, array('parent' => $parent_id));
    
    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()));
    } else {
        wp_send_json_success(array('message' => __('Categoria spostata con successo', 'editor-categorie')));
    }
}

// Rename term
add_action('wp_ajax_ec_rename_term', 'ec_ajax_rename_term');
function ec_ajax_rename_term() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $term_id = isset($_POST['term_id']) ? intval($_POST['term_id']) : 0;
    $new_name = isset($_POST['name']) ? sanitize_text_field($_POST['name']) : '';
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    
    if (empty($new_name)) {
        wp_send_json_error(array('message' => __('Il nome non può essere vuoto', 'editor-categorie')));
    }
    
    // Update term name
    $result = wp_update_term($term_id, $taxonomy, array('name' => $new_name));
    
    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()));
    } else {
        wp_send_json_success(array(
            'message' => __('Categoria rinominata con successo', 'editor-categorie'),
            'new_name' => $new_name
        ));
    }
}

// Create new term
add_action('wp_ajax_ec_create_term', 'ec_ajax_create_term');
function ec_ajax_create_term() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $parent_id = isset($_POST['parent_id']) ? intval($_POST['parent_id']) : 0;
    $name = isset($_POST['name']) ? sanitize_text_field($_POST['name']) : '';
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    
    if (empty($name)) {
        wp_send_json_error(array('message' => __('Il nome non può essere vuoto', 'editor-categorie')));
    }
    
    // Create new term
    $args = array();
    if ($parent_id > 0) {
        $args['parent'] = $parent_id;
    }
    
    $result = wp_insert_term($name, $taxonomy, $args);
    
    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()));
    } else {
        $term_id = $result['term_id'];
        $term = get_term($term_id, $taxonomy);
        
        wp_send_json_success(array(
            'message' => __('Categoria creata con successo', 'editor-categorie'),
            'term' => array(
                'id' => $term_id,
                'text' => $name . ' (0)',
                'data' => array(
                    'term_id' => $term_id,
                    'name' => $name,
                    'slug' => $term->slug,
                    'count' => 0,
                    'edit_link' => get_edit_term_link($term_id, $taxonomy),
                    'view_link' => get_term_link($term_id, $taxonomy)
                )
            )
        ));
    }
}

// Delete term
add_action('wp_ajax_ec_delete_term', 'ec_ajax_delete_term');
function ec_ajax_delete_term() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $term_id = isset($_POST['term_id']) ? intval($_POST['term_id']) : 0;
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    
    // Delete the term
    $result = wp_delete_term($term_id, $taxonomy);
    
    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()));
    } elseif ($result === false) {
        wp_send_json_error(array('message' => __('Impossibile eliminare la categoria', 'editor-categorie')));
    } else {
        wp_send_json_success(array('message' => __('Categoria eliminata con successo', 'editor-categorie')));
    }
}

// Get all hierarchical taxonomies
add_action('wp_ajax_ec_get_taxonomies', 'ec_ajax_get_taxonomies');
function ec_ajax_get_taxonomies() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    $taxonomy_manager = new EC_Taxonomy_Manager();
    $taxonomies = $taxonomy_manager->get_hierarchical_taxonomies();
    
    $formatted_taxonomies = array();
    foreach ($taxonomies as $tax_name => $tax_obj) {
        $formatted_taxonomies[] = array(
            'name' => $tax_name,
            'label' => $tax_obj->label,
            'singular_label' => $tax_obj->labels->singular_name
        );
    }
    
    wp_send_json_success($formatted_taxonomies);
}

// Bulk update terms
add_action('wp_ajax_ec_bulk_update_terms', 'ec_ajax_bulk_update_terms');
function ec_ajax_bulk_update_terms() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $terms = isset($_POST['terms']) ? json_decode(stripslashes($_POST['terms']), true) : array();
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    
    if (empty($terms) || !is_array($terms)) {
        wp_send_json_error(array('message' => __('Nessun termine da aggiornare', 'editor-categorie')));
    }
    
    // Verify taxonomy exists and is hierarchical
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj || !$tax_obj->hierarchical) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    $success_count = 0;
    $error_count = 0;
    $errors = array();
    
    // Start transaction
    global $wpdb;
    $wpdb->query('START TRANSACTION');
    
    try {
        foreach ($terms as $term) {
            $term_id = isset($term['term_id']) ? intval($term['term_id']) : 0;
            $parent_id = isset($term['parent_id']) ? intval($term['parent_id']) : 0;
            
            if ($term_id <= 0) {
                $error_count++;
                $errors[] = __('ID termine non valido', 'editor-categorie');
                continue;
            }
            
            // Prevent moving a term to its own descendant
            if ($parent_id > 0) {
                $ancestors = get_ancestors($parent_id, $taxonomy);
                if (in_array($term_id, $ancestors)) {
                    $error_count++;
                    $errors[] = sprintf(__('Non puoi spostare il termine %d sotto uno dei suoi discendenti', 'editor-categorie'), $term_id);
                    continue;
                }
            }
            
            // Update term parent
            $result = wp_update_term($term_id, $taxonomy, array('parent' => $parent_id));
            
            if (is_wp_error($result)) {
                $error_count++;
                $errors[] = $result->get_error_message();
            } else {
                $success_count++;
            }
        }
        
        // If there were any errors, rollback the transaction
        if ($error_count > 0) {
            $wpdb->query('ROLLBACK');
            wp_send_json_error(array(
                'message' => sprintf(__('Si sono verificati %d errori durante l\'aggiornamento dei termini', 'editor-categorie'), $error_count),
                'errors' => $errors
            ));
        } else {
            // Otherwise commit the transaction
            $wpdb->query('COMMIT');
            wp_send_json_success(array(
                'message' => sprintf(__('%d termini aggiornati con successo', 'editor-categorie'), $success_count)
            ));
        }
    } catch (Exception $e) {
        // If an exception occurred, rollback the transaction
        $wpdb->query('ROLLBACK');
        wp_send_json_error(array(
            'message' => __('Si è verificato un errore durante l\'aggiornamento dei termini', 'editor-categorie'),
            'error' => $e->getMessage()
        ));
    }
}