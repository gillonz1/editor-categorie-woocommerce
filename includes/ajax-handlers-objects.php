<?php
/**
 * AJAX Handlers for Term Objects
 * 
 * Handles AJAX requests for getting objects associated with terms
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Get objects associated with a term
add_action('wp_ajax_ec_get_term_objects', 'ec_ajax_get_term_objects');
function ec_ajax_get_term_objects() {
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
    
    // Verify taxonomy exists and is hierarchical
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj || !$tax_obj->hierarchical) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Get term
    $term = get_term($term_id, $taxonomy);
    if (is_wp_error($term) || !$term) {
        wp_send_json_error(array('message' => __('Categoria non valida', 'editor-categorie')));
    }
    
    // Get all objects associated with the term
    $objects = get_objects_in_term($term_id, $taxonomy);
    
    if (is_wp_error($objects)) {
        wp_send_json_error(array('message' => $objects->get_error_message()));
    }
    
    wp_send_json_success(array(
        'object_ids' => $objects
    ));
}