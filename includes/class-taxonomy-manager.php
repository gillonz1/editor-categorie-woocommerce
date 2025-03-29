<?php
/**
 * Taxonomy Manager Class
 * 
 * Handles the core functionality for managing taxonomies
 */

// Exit if accessed directly
if (!defined('ABSPATH')) {
    exit;
}

class EC_Taxonomy_Manager {
    
    /**
     * Initialize the class
     */
    public function init() {
        // Register scripts and styles
        add_action('admin_enqueue_scripts', array($this, 'register_assets'));
    }
    
    /**
     * Register and enqueue scripts and styles
     */
    public function register_assets($hook) {
        // Only load on our plugin page
        if (strpos($hook, 'editor-categorie') === false && strpos($hook, 'page=editor-categorie') === false) {
            return;
        }
        
        // Register jstree from CDN
        wp_register_script('jstree', 'https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/jstree.min.js', array('jquery'), '3.3.12', true);
        wp_register_style('jstree', 'https://cdnjs.cloudflare.com/ajax/libs/jstree/3.3.12/themes/default/style.min.css', array(), '3.3.12');
        
        // Register our custom scripts and styles
        wp_register_script('ec-taxonomy-tree', EC_PLUGIN_URL . 'assets/js/taxonomy-tree.js', array('jquery', 'jstree'), EC_VERSION, true);
        wp_register_script('ec-product-list', EC_PLUGIN_URL . 'assets/js/product-list.js', array('jquery', 'jquery-ui-draggable', 'jquery-ui-droppable'), EC_VERSION, true);
        wp_register_script('ec-merge-categories', EC_PLUGIN_URL . 'assets/js/merge-categories.js', array('jquery', 'jquery-ui-dialog'), EC_VERSION, true);
        wp_register_script('ec-undo-operations', EC_PLUGIN_URL . 'assets/js/undo-operations.js', array('jquery'), EC_VERSION, true);
        wp_register_style('ec-taxonomy-tree', EC_PLUGIN_URL . 'assets/css/taxonomy-tree.css', array('jstree'), EC_VERSION);
        wp_register_style('ec-product-list', EC_PLUGIN_URL . 'assets/css/product-list.css', array(), EC_VERSION);
        wp_register_style('ec-merge-categories', EC_PLUGIN_URL . 'assets/css/merge-categories.css', array(), EC_VERSION);
        
        // Enqueue scripts and styles
        wp_enqueue_script('jstree');
        wp_enqueue_script('ec-taxonomy-tree');
        wp_enqueue_script('ec-product-list');
        wp_enqueue_script('ec-merge-categories');
        wp_enqueue_script('ec-undo-operations');
        wp_enqueue_style('jstree');
        wp_enqueue_style('ec-taxonomy-tree');
        wp_enqueue_style('ec-product-list');
        wp_enqueue_style('ec-merge-categories');
        
        // Enqueue WordPress jQuery UI styles
        wp_enqueue_style('wp-jquery-ui-dialog');
        
        // Localize script with necessary data
        wp_localize_script('ec-taxonomy-tree', 'ecData', array(
            'ajaxurl' => admin_url('admin-ajax.php'),
            'nonce' => wp_create_nonce('ec_taxonomy_nonce'),
            'messages' => array(
                'updateSuccess' => __('Aggiornamento riuscito', 'editor-categorie'),
                'updateError' => __('Errore durante l\'aggiornamento', 'editor-categorie'),
                'deleteConfirm' => __('Sei sicuro di voler eliminare questa categoria? Questa azione non può essere annullata.', 'editor-categorie'),
                'deleteSuccess' => __('Categoria eliminata con successo', 'editor-categorie'),
                'deleteError' => __('Errore durante l\'eliminazione della categoria', 'editor-categorie'),
                'createSuccess' => __('Nuova categoria creata con successo', 'editor-categorie'),
                'createError' => __('Errore durante la creazione della categoria', 'editor-categorie'),
                'renameSuccess' => __('Categoria rinominata con successo', 'editor-categorie'),
                'renameError' => __('Errore durante la ridenominazione della categoria', 'editor-categorie'),
                'duplicateSuccess' => __('Categoria duplicata con successo', 'editor-categorie'),
                'duplicateError' => __('Errore durante la duplicazione della categoria', 'editor-categorie'),
                'loadProductsSuccess' => __('Prodotti caricati con successo', 'editor-categorie'),
                'loadProductsError' => __('Errore durante il caricamento dei prodotti', 'editor-categorie'),
                'moveProductSuccess' => __('Prodotto spostato con successo', 'editor-categorie'),
                'moveProductError' => __('Errore durante lo spostamento del prodotto', 'editor-categorie'),
                'products' => __('Prodotti', 'editor-categorie'),
                'loadingProducts' => __('Caricamento prodotti...', 'editor-categorie'),
                'noProductsFound' => __('Nessun prodotto trovato in questa categoria', 'editor-categorie'),
                'dropProductHere' => __('Trascina qui i prodotti per spostarli in questa categoria', 'editor-categorie'),
                'price' => __('Prezzo', 'editor-categorie'),
                'edit' => __('Modifica', 'editor-categorie'),
                'view' => __('Visualizza', 'editor-categorie'),
                'mergeSuccess' => __('Categorie fuse con successo', 'editor-categorie'),
                'mergeError' => __('Errore durante la fusione delle categorie', 'editor-categorie'),
                'selectTargetCategory' => __('Seleziona una categoria di destinazione', 'editor-categorie'),
                'selectSourceCategory' => __('Seleziona prima una categoria da fondere', 'editor-categorie')
            )
        ));
    }
    
    /**
     * Get all hierarchical taxonomies
     * 
     * @return array Array of taxonomy objects
     */
    public function get_hierarchical_taxonomies() {
        $taxonomies = get_taxonomies(array(
            'public' => true,
            'hierarchical' => true
        ), 'objects');
        
        return $taxonomies;
    }
    
    /**
     * Get terms for a specific taxonomy in a format suitable for jsTree
     * 
     * @param string $taxonomy Taxonomy name
     * @return array Array of terms formatted for jsTree
     */
    public function get_taxonomy_terms_tree($taxonomy) {
        $terms = get_terms(array(
            'taxonomy' => $taxonomy,
            'hide_empty' => false
        ));
        
        if (is_wp_error($terms) || empty($terms)) {
            return array();
        }
        
        $tree = array();
        $term_children = array();
        
        // First pass: organize terms by parent
        foreach ($terms as $term) {
            if (!isset($term_children[$term->parent])) {
                $term_children[$term->parent] = array();
            }
            $term_children[$term->parent][] = $term;
        }
        
        // Second pass: build the tree recursively
        $this->build_term_tree($tree, $term_children, 0, $taxonomy);
        
        return $tree;
    }
    
    /**
     * Recursively build the term tree
     * 
     * @param array &$tree Reference to the tree being built
     * @param array $term_children Terms organized by parent
     * @param int $parent_id Current parent ID
     * @param string $taxonomy Taxonomy name
     */
    private function build_term_tree(&$tree, $term_children, $parent_id, $taxonomy) {
        if (!isset($term_children[$parent_id])) {
            return;
        }
        
        foreach ($term_children[$parent_id] as $term) {
            $count = $term->count;
            $term_id = $term->term_id;
            
            $node = array(
                'id' => $term_id,
                'text' => $term->name . ' (' . $count . ')',
                'data' => array(
                    'term_id' => $term_id,
                    'name' => $term->name,
                    'slug' => $term->slug,
                    'count' => $count,
                    'edit_link' => get_edit_term_link($term_id, $taxonomy),
                    'view_link' => get_term_link($term_id, $taxonomy)
                ),
                'children' => array()
            );
            
            if (isset($term_children[$term_id])) {
                $this->build_term_tree($node['children'], $term_children, $term_id, $taxonomy);
            }
            
            $tree[] = $node;
        }
    }
}