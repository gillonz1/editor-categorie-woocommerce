<?php
/**
 * Plugin Name: Editor Categorie
 * Description: Gestore avanzato delle gerarchie di tassonomie con interfaccia drag-and-drop.
 * Version: 1.0.0
 * Author: Trae AI
 * Text Domain: editor-categorie
 * Domain Path: /languages
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

// Define plugin constants
define('EC_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('EC_PLUGIN_URL', plugin_dir_url(__FILE__));
define('EC_VERSION', '1.0.0');

// Include required files
require_once EC_PLUGIN_DIR . 'includes/class-taxonomy-manager.php';
require_once EC_PLUGIN_DIR . 'includes/ajax-handlers.php';
require_once EC_PLUGIN_DIR . 'includes/ajax-handlers-duplicate.php';
require_once EC_PLUGIN_DIR . 'includes/ajax-handlers-merge.php';
require_once EC_PLUGIN_DIR . 'includes/ajax-handlers-products.php';
require_once EC_PLUGIN_DIR . 'includes/ajax-handlers-objects.php';
require_once EC_PLUGIN_DIR . 'includes/ajax-handlers-undo.php';
require_once EC_PLUGIN_DIR . 'admin/class-admin-page.php';

// Initialize the plugin
function ec_initialize_plugin() {
    // Create instances of our classes
    $admin_page = new EC_Admin_Page();
    $taxonomy_manager = new EC_Taxonomy_Manager();
    
    // Initialize components
    $admin_page->init();
    $taxonomy_manager->init();
}
add_action('plugins_loaded', 'ec_initialize_plugin');

// Activation hook
register_activation_hook(__FILE__, 'ec_plugin_activation');
function ec_plugin_activation() {
    // Activation tasks if needed
    flush_rewrite_rules();
}

// Deactivation hook
register_deactivation_hook(__FILE__, 'ec_plugin_deactivation');
function ec_plugin_deactivation() {
    // Cleanup if needed
    flush_rewrite_rules();
}