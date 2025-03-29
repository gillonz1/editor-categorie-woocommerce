<?php
/**
 * AJAX Handlers for Duplicate Term Functionality
 * 
 * Handles AJAX requests for duplicating taxonomy terms
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Duplicate term
add_action('wp_ajax_ec_duplicate_term', 'ec_ajax_duplicate_term');
function ec_ajax_duplicate_term() {
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
    $parent_id = isset($_POST['parent_id']) ? intval($_POST['parent_id']) : 0;
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'category';
    
    // Verify taxonomy exists and is hierarchical
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj || !$tax_obj->hierarchical) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Get source term
    $source_term = get_term($source_term_id, $taxonomy);
    if (is_wp_error($source_term) || !$source_term) {
        wp_send_json_error(array('message' => __('Categoria di origine non valida', 'editor-categorie')));
    }
    
    // Create new term name (append 'copia' to the original name)
    $new_name = $source_term->name . ' ' . __('(copia)', 'editor-categorie');
    
    // Create new term
    $args = array(
        'description' => $source_term->description,
        'slug' => '',  // Let WordPress generate a unique slug
        'parent' => $parent_id
    );
    
    $result = wp_insert_term($new_name, $taxonomy, $args);
    
    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()));
    } else {
        $new_term_id = $result['term_id'];
        
        // Copy term meta if any
        $term_meta = get_term_meta($source_term_id);
        if (!empty($term_meta)) {
            foreach ($term_meta as $meta_key => $meta_values) {
                foreach ($meta_values as $meta_value) {
                    add_term_meta($new_term_id, $meta_key, $meta_value);
                }
            }
        }
        
        // Get the new term
        $new_term = get_term($new_term_id, $taxonomy);
        
        wp_send_json_success(array(
            'message' => __('Categoria duplicata con successo', 'editor-categorie'),
            'term' => array(
                'id' => $new_term_id,
                'text' => $new_name . ' (0)',
                'data' => array(
                    'term_id' => $new_term_id,
                    'name' => $new_name,
                    'slug' => $new_term->slug,
                    'count' => 0,
                    'edit_link' => get_edit_term_link($new_term_id, $taxonomy),
                    'view_link' => get_term_link($new_term_id, $taxonomy)
                )
            )
        ));
    }
}