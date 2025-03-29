<?php
/**
 * Admin Page Class
 * 
 * Handles the admin page for the taxonomy manager
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class EC_Admin_Page {
    
    /**
     * Initialize the class
     */
    public function init() {
        // Add menu items
        add_action('admin_menu', array($this, 'add_menu_items'));
    }
    
    /**
     * Add menu items
     */
    public function add_menu_items() {
        // Check if WooCommerce is active
        $woocommerce_active = class_exists('WooCommerce');
        
        if ($woocommerce_active) {
            // Add under WooCommerce Products menu
            add_submenu_page(
                'edit.php?post_type=product',
                __('Gestore Categorie Avanzato', 'editor-categorie'),
                __('Gestore Categorie', 'editor-categorie'),
                'manage_product_terms',
                'editor-categorie',
                array($this, 'render_admin_page')
            );
        }
        
        // Add under Posts menu for regular WordPress categories
        add_submenu_page(
            'edit.php',
            __('Gestore Categorie Avanzato', 'editor-categorie'),
            __('Gestore Categorie', 'editor-categorie'),
            'manage_categories',
            'editor-categorie-posts',
            array($this, 'render_admin_page')
        );
        
        // Add a main menu item for easier access
        add_menu_page(
            __('Gestore Categorie Avanzato', 'editor-categorie'),
            __('Gestore Categorie', 'editor-categorie'),
            'manage_categories',
            'editor-categorie-main',
            array($this, 'render_admin_page'),
            'dashicons-category',
            25
        );
    }
    
    /**
     * Render the admin page
     */
    public function render_admin_page() {
        // Get all hierarchical taxonomies
        $taxonomy_manager = new EC_Taxonomy_Manager();
        $taxonomies = $taxonomy_manager->get_hierarchical_taxonomies();
        
        // Default taxonomy
        $default_taxonomy = class_exists('WooCommerce') ? 'product_cat' : 'category';
        
        // Get current taxonomy from URL parameter or use default
        $current_taxonomy = isset($_GET['taxonomy']) ? sanitize_text_field($_GET['taxonomy']) : $default_taxonomy;
        
        // Ensure the taxonomy exists and is hierarchical
        if (!isset($taxonomies[$current_taxonomy])) {
            $current_taxonomy = $default_taxonomy;
        }
        
        // Get taxonomy object
        $taxonomy_obj = get_taxonomy($current_taxonomy);
        
        // Start output buffering
        ob_start();
        ?>
        <div class="wrap ec-taxonomy-manager-wrap">
            <h1><?php echo esc_html__('Gestore Categorie Avanzato', 'editor-categorie'); ?></h1>
            
            <div class="ec-taxonomy-controls">
                <form method="get" action="">
                    <input type="hidden" name="page" value="editor-categorie-main">
                    
                    <label for="ec-taxonomy-select"><?php echo esc_html__('Seleziona Tassonomia:', 'editor-categorie'); ?></label>
                    <select id="ec-taxonomy-select" name="taxonomy">
                        <?php foreach ($taxonomies as $tax_name => $tax_obj) : ?>
                            <option value="<?php echo esc_attr($tax_name); ?>" <?php selected($current_taxonomy, $tax_name); ?>>
                                <?php echo esc_html($tax_obj->label); ?>
                            </option>
                        <?php endforeach; ?>
                    </select>
                    
                    <button type="submit" class="button"><?php echo esc_html__('Cambia', 'editor-categorie'); ?></button>
                </form>
                
                <div class="ec-tree-controls">
                    <button id="ec-expand-all" class="button"><?php echo esc_html__('Espandi Tutto', 'editor-categorie'); ?></button>
                    <button id="ec-collapse-all" class="button"><?php echo esc_html__('Comprimi Tutto', 'editor-categorie'); ?></button>
                    <button id="ec-create-root" class="button button-primary"><?php echo esc_html__('Nuova Categoria', 'editor-categorie'); ?></button>
                </div>
                
                <div class="ec-search-box">
                    <label for="ec-search-input"><?php echo esc_html__('Cerca:', 'editor-categorie'); ?></label>
                    <input type="text" id="ec-search-input" placeholder="<?php echo esc_attr__('Filtra categorie...', 'editor-categorie'); ?>">
                    <button id="ec-search-clear" class="button"><?php echo esc_html__('Pulisci', 'editor-categorie'); ?></button>
                </div>
            </div>
            
            <div class="ec-taxonomy-tree-container">
                <div id="ec-taxonomy-tree" data-taxonomy="<?php echo esc_attr($current_taxonomy); ?>"></div>
                <div id="ec-loading" class="ec-loading">
                    <span class="spinner is-active"></span>
                    <?php echo esc_html__('Caricamento...', 'editor-categorie'); ?>
                </div>
            </div>
        </div>
        <?php
        // Get the buffered content
        $output = ob_get_clean();
        
        // Echo the output
        echo $output;
    }
}