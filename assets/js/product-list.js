/**
 * Product List JS
 * 
 * Handles the product list functionality within categories
 */

jQuery(document).ready(function($) {
    // Initialize variables
    var $tree = $('#ec-taxonomy-tree');
    var taxonomy = $tree.data('taxonomy');
    var $loading = $('#ec-loading');
    var selectedNode = null;
    var $productContainer = $('<div class="ec-product-list-container"></div>');
    var $productList = $('<div class="ec-product-list"></div>');
    var $productTitle = $('<h3 class="ec-product-list-title"></h3>');
    var $productLoading = $('<div class="ec-product-loading"><span class="spinner is-active"></span>' + (ecData.messages.loadingProducts || 'Caricamento prodotti...') + '</div>');
    var $productEmpty = $('<div class="ec-product-empty">' + (ecData.messages.noProductsFound || 'Nessun prodotto trovato in questa categoria') + '</div>');
    var $productDropIndicator = $('<div class="ec-product-drop-indicator">' + (ecData.messages.dropProductHere || 'Trascina qui i prodotti per spostarli in questa categoria') + '</div>');
    
    // Append product container to the page
    $('.ec-taxonomy-tree-container').after($productContainer);
    $productContainer.append($productTitle, $productDropIndicator, $productList);
    $productContainer.hide();
    
    // Listen for node selection in the tree
    $tree.on('select_node.jstree', function(e, data) {
        selectedNode = data.node;
        loadProductsForCategory(selectedNode.id);
    });
    
    // Listen for node deselection in the tree
    $tree.on('deselect_node.jstree', function() {
        selectedNode = null;
        $productContainer.hide();
    });
    
    // Load products for a category
    function loadProductsForCategory(termId) {
        // Show loading
        $productList.empty();
        $productContainer.show();
        $productTitle.text(ecData.messages.loadingProducts);
        $productList.append($productLoading);
        
        // Get the node text (category name)
        var nodeName = $tree.jstree(true).get_node(termId).text;
        nodeName = nodeName.replace(/ \(\d+\)$/, ''); // Remove count from display name
        
        // Send AJAX request to get products
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_get_category_products',
                term_id: termId,
                taxonomy: taxonomy,
                nonce: ecData.nonce
            },
            success: function(response) {
                $productLoading.remove();
                
                if (response.success) {
                    var products = response.data.products;
                    $productTitle.text(nodeName + ' - ' + ecData.messages.products + ' (' + products.length + ')');
                    
                    if (products.length > 0) {
                        // Render products
                        renderProducts(products);
                    } else {
                        // Show empty state
                        $productList.append($productEmpty);
                    }
                } else {
                    showNotification(response.data.message, 'error');
                    $productList.append($productEmpty);
                }
            },
            error: function() {
                $productLoading.remove();
                showNotification(ecData.messages.loadProductsError, 'error');
                $productList.append($productEmpty);
            }
        });
    }
    
    // Render products in the list
    function renderProducts(products) {
        $productList.empty();
        
        $.each(products, function(index, product) {
            var $product = $('<div class="ec-product-item" data-product-id="' + product.id + '"></div>');
            var $thumbnail = $('<div class="ec-product-thumbnail"></div>');
            var $info = $('<div class="ec-product-info"></div>');
            var $actions = $('<div class="ec-product-actions"></div>');
            
            // Set thumbnail background
            $thumbnail.css('background-image', 'url(' + product.data.thumbnail + ')');
            
            // Add product info
            $info.append('<div class="ec-product-name">' + product.data.name + '</div>');
            if (product.data.sku) {
                $info.append('<div class="ec-product-sku">SKU: ' + product.data.sku + '</div>');
            }
            if (product.data.price) {
                $info.append('<div class="ec-product-price">' + ecData.messages.price + ': ' + product.data.price + '</div>');
            }
            
            // Add actions
            $actions.append('<a href="' + product.data.edit_link + '" target="_blank">' + ecData.messages.edit + '</a>');
            $actions.append('<a href="' + product.data.view_link + '" target="_blank">' + ecData.messages.view + '</a>');
            
            // Assemble product item
            $product.append($thumbnail, $info, $actions);
            $productList.append($product);
            
            // Initialize draggable
            $product.draggable({
                helper: 'clone',
                revert: 'invalid',
                zIndex: 100,
                start: function() {
                    // Show drop indicators in all categories except current one
                    showDropIndicators();
                },
                stop: function() {
                    // Hide all drop indicators
                    hideDropIndicators();
                }
            });
        });
    }
    
    // Make tree nodes droppable for products
    function initDroppableNodes() {
        // Make all tree nodes droppable
        $(document).on('dnd_start.vakata', function() {
            var $dragging = $('.ui-draggable-dragging');
            
            // Only proceed if we're dragging a product
            if ($dragging.hasClass('ec-product-item')) {
                // Make all tree nodes droppable
                $('.jstree-node').droppable({
                    accept: '.ec-product-item',
                    hoverClass: 'jstree-hovered',
                    tolerance: 'pointer',
                    drop: function(event, ui) {
                        var $node = $(this);
                        var nodeId = $node.attr('id');
                        var productId = ui.draggable.data('product-id');
                        
                        // Don't allow dropping on the same category
                        if (nodeId === selectedNode.id) {
                            return false;
                        }
                        
                        // Move the product to the new category
                        moveProduct(productId, selectedNode.id, nodeId);
                    }
                });
            }
        });
    }
    
    // Show drop indicators in all categories
    function showDropIndicators() {
        // Add a drop indicator to each category in the tree
        $('.jstree-node').each(function() {
            var $node = $(this);
            var nodeId = $node.attr('id');
            
            // Don't show indicator for the current category
            if (nodeId !== selectedNode.id) {
                $node.addClass('ec-product-drop-target');
            }
        });
    }
    
    // Hide all drop indicators
    function hideDropIndicators() {
        $('.jstree-node').removeClass('ec-product-drop-target');
    }
    
    // Move a product to a different category
    function moveProduct(productId, sourceTermId, targetTermId) {
        $loading.show();
        
        // Send AJAX request to move the product
        $.ajax({
            url: ecData.ajaxurl,
            type: 'POST',
            dataType: 'json',
            data: {
                action: 'ec_move_product',
                product_id: productId,
                source_term_id: sourceTermId,
                target_term_id: targetTermId,
                taxonomy: taxonomy,
                nonce: ecData.nonce
            },
            success: function(response) {
                if (response.success) {
                    // Reload products for the current category
                    loadProductsForCategory(selectedNode.id);
                    
                    // Update the product counts in the tree
                    updateCategoryCounts(sourceTermId, targetTermId);
                    
                    showNotification(response.data.message, 'success');
                } else {
                    showNotification(response.data.message, 'error');
                }
                $loading.hide();
            },
            error: function() {
                showNotification(ecData.messages.moveProductError, 'error');
                $loading.hide();
            }
        });
    }
    
    // Update the product counts in the tree after moving a product
    function updateCategoryCounts(sourceTermId, targetTermId) {
        // Get the nodes
        var sourceNode = $tree.jstree(true).get_node(sourceTermId);
        var targetNode = $tree.jstree(true).get_node(targetTermId);
        
        if (sourceNode && targetNode) {
            // Extract current counts
            var sourceCount = parseInt(sourceNode.text.match(/\((\d+)\)$/)[1]);
            var targetCount = parseInt(targetNode.text.match(/\((\d+)\)$/)[1]);
            
            // Update counts
            sourceCount = Math.max(0, sourceCount - 1);
            targetCount = targetCount + 1;
            
            // Update node text
            var sourceText = sourceNode.text.replace(/\(\d+\)$/, '(' + sourceCount + ')');
            var targetText = targetNode.text.replace(/\(\d+\)$/, '(' + targetCount + ')');
            
            $tree.jstree('rename_node', sourceTermId, sourceText);
            $tree.jstree('rename_node', targetTermId, targetText);
        }
    }
    
    // Initialize droppable functionality
    initDroppableNodes();
    
    // Add messages to ecData if not already present
    if (!ecData.messages.products) {
        ecData.messages.products = 'Prodotti';
    }
    if (!ecData.messages.loadingProducts) {
        ecData.messages.loadingProducts = 'Caricamento prodotti...';
    }
    if (!ecData.messages.noProductsFound) {
        ecData.messages.noProductsFound = 'Nessun prodotto trovato in questa categoria';
    }
    if (!ecData.messages.dropProductHere) {
        ecData.messages.dropProductHere = 'Trascina qui i prodotti per spostarli in questa categoria';
    }
    if (!ecData.messages.price) {
        ecData.messages.price = 'Prezzo';
    }
    if (!ecData.messages.edit) {
        ecData.messages.edit = 'Modifica';
    }
    if (!ecData.messages.view) {
        ecData.messages.view = 'Visualizza';
    }
});