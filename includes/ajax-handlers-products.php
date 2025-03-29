<?php
/**
 * AJAX Handlers for Products
 * 
 * Handles all AJAX requests for product management within categories
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Get products for a specific category
add_action('wp_ajax_ec_get_category_products', 'ec_ajax_get_category_products');
function ec_ajax_get_category_products() {
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
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'product_cat';
    
    // Verify taxonomy exists and is valid
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Check if WooCommerce is active
    if (!class_exists('WooCommerce')) {
        wp_send_json_error(array('message' => __('WooCommerce non è attivo', 'editor-categorie')));
    }
    
    // Get products in this category
    $args = array(
        'post_type' => 'product',
        'posts_per_page' => -1,
        'tax_query' => array(
            array(
                'taxonomy' => $taxonomy,
                'field' => 'term_id',
                'terms' => $term_id
            )
        )
    );
    
    $products = get_posts($args);
    
    if (empty($products)) {
        wp_send_json_success(array('products' => array()));
        return;
    }
    
    $product_data = array();
    
    foreach ($products as $product) {
        $product_obj = wc_get_product($product->ID);
        
        if (!$product_obj) {
            continue;
        }
        
        $product_data[] = array(
            'id' => $product->ID,
            'text' => $product_obj->get_name(),
            'data' => array(
                'product_id' => $product->ID,
                'name' => $product_obj->get_name(),
                'sku' => $product_obj->get_sku(),
                'price' => $product_obj->get_price(),
                'edit_link' => get_edit_post_link($product->ID),
                'view_link' => get_permalink($product->ID),
                'thumbnail' => get_the_post_thumbnail_url($product->ID, 'thumbnail') ?: wc_placeholder_img_src('thumbnail')
            ),
            'type' => 'product'
        );
    }
    
    wp_send_json_success(array('products' => $product_data));
}

// Move product to a different category
add_action('wp_ajax_ec_move_product', 'ec_ajax_move_product');
function ec_ajax_move_product() {
    // Check nonce
    if (!isset($_POST['nonce']) || !wp_verify_nonce($_POST['nonce'], 'ec_taxonomy_nonce')) {
        wp_send_json_error(array('message' => __('Errore di sicurezza', 'editor-categorie')));
    }
    
    // Check permissions
    if (!current_user_can('manage_categories') && !current_user_can('manage_product_terms')) {
        wp_send_json_error(array('message' => __('Permessi insufficienti', 'editor-categorie')));
    }
    
    // Get parameters
    $product_id = isset($_POST['product_id']) ? intval($_POST['product_id']) : 0;
    $source_term_id = isset($_POST['source_term_id']) ? intval($_POST['source_term_id']) : 0;
    $target_term_id = isset($_POST['target_term_id']) ? intval($_POST['target_term_id']) : 0;
    $taxonomy = isset($_POST['taxonomy']) ? sanitize_text_field($_POST['taxonomy']) : 'product_cat';
    
    // Verify product exists
    $product = wc_get_product($product_id);
    if (!$product) {
        wp_send_json_error(array('message' => __('Prodotto non valido', 'editor-categorie')));
    }
    
    // Verify taxonomy exists
    $tax_obj = get_taxonomy($taxonomy);
    if (!$tax_obj) {
        wp_send_json_error(array('message' => __('Tassonomia non valida', 'editor-categorie')));
    }
    
    // Remove from source category if specified
    if ($source_term_id > 0) {
        wp_remove_object_terms($product_id, $source_term_id, $taxonomy);
    }
    
    // Add to target category
    $result = wp_set_object_terms($product_id, $target_term_id, $taxonomy, true);
    
    if (is_wp_error($result)) {
        wp_send_json_error(array('message' => $result->get_error_message()));
    } else {
        wp_send_json_success(array('message' => __('Prodotto spostato con successo', 'editor-categorie')));
    }
}