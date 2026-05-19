<?php
/**
 * SEO-friendly region listing template for /region/{location}/ URLs.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();
?>

<main class="airepm-single">
    <?php echo AI_Real_Estate_Property_Manager::instance()->render_region_archive(); ?>
</main>

<?php
get_footer();
