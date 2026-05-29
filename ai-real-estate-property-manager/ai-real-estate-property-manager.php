<?php
/**
 * Plugin Name: AI Real Estate Property Manager
 * Description: AI 부동산 웹사이트를 위한 매물 관리, 검색, 목록 표시 시스템입니다.
 * Version: 1.2.1
 * Author: Dadasol
 * Text Domain: ai-real-estate-property-manager
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AIREPM_VERSION', '1.2.1');
define('AIREPM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('AIREPM_PLUGIN_URL', plugin_dir_url(__FILE__));

final class AI_Real_Estate_Property_Manager {
    private static $instance = null;
    private $saving_property_title = false;
    private $rendered_property_ids = array();

    public static function instance() {
        if (self::$instance === null) {
            self::$instance = new self();
        }
        return self::$instance;
    }

    private function __construct() {
        add_action('init', array($this, 'register_property_post_type'));
        add_action('init', array($this, 'register_property_meta_fields'));
        add_action('init', array($this, 'register_region_rewrite_rules'));
        add_action('acf/init', array($this, 'register_acf_field_group'));
        add_filter('query_vars', array($this, 'register_query_vars'));
        add_action('add_meta_boxes', array($this, 'add_property_meta_boxes'));
        add_action('admin_menu', array($this, 'register_setup_admin_page'));
        add_action('admin_post_airepm_run_initial_setup', array($this, 'handle_run_initial_setup'));
        add_action('save_post_property', array($this, 'save_property_meta'), 10, 2);
        add_action('wp_enqueue_scripts', array($this, 'enqueue_public_assets'));
        add_shortcode('property_search', array($this, 'render_property_search_shortcode'));
        add_shortcode('property_list', array($this, 'render_property_list_shortcode'));
        add_shortcode('property_location_search', array($this, 'render_property_location_search_shortcode'));
        add_shortcode('property_map', array($this, 'render_property_map_shortcode'));
        add_filter('template_include', array($this, 'load_plugin_templates'));
        add_action('elementor/query/airepm_properties', array($this, 'configure_elementor_property_query'));
        add_action('elementor/query/airepm_featured_properties', array($this, 'configure_elementor_featured_property_query'));
    }

    public function register_property_post_type() {
        $labels = array(
            'name' => '매물',
            'singular_name' => '매물',
            'menu_name' => '매물 관리',
            'add_new_item' => '새 매물 추가',
            'edit_item' => '매물 수정',
            'new_item' => '새 매물',
            'view_item' => '매물 보기',
            'search_items' => '매물 검색',
            'not_found' => '매물이 없습니다',
        );

        register_post_type('property', array(
            'labels' => $labels,
            'public' => true,
            'has_archive' => true,
            'publicly_queryable' => true,
            'show_ui' => true,
            'show_in_menu' => true,
            'rewrite' => array('slug' => 'properties'),
            'menu_icon' => 'dashicons-building',
            'supports' => array('title', 'editor', 'thumbnail', 'excerpt', 'custom-fields'),
            'show_in_rest' => true,
            'capability_type' => 'post',
        ));
    }

    public function register_property_meta_fields() {
        foreach ($this->get_field_definitions() as $key => $field) {
            $schema_type = 'string';
            if ($field['type'] === 'checkbox') {
                $schema_type = 'boolean';
            } elseif ($field['type'] === 'number') {
                $schema_type = 'number';
            }

            register_post_meta('property', $key, array(
                'single' => true,
                'type' => $schema_type,
                'show_in_rest' => true,
                'auth_callback' => function () {
                    return current_user_can('edit_posts');
                },
                'sanitize_callback' => array($this, 'sanitize_property_meta_value'),
            ));
        }
    }

    public function sanitize_property_meta_value($value, $meta_key) {
        $fields = $this->get_field_definitions();
        $type = isset($fields[$meta_key]) ? $fields[$meta_key]['type'] : 'text';

        if ($type === 'checkbox') {
            return $value ? true : false;
        }

        if ($type === 'number') {
            return is_numeric($value) ? (float) $value : 0;
        }

        if ($type === 'textarea') {
            return sanitize_textarea_field($value);
        }

        return sanitize_text_field($value);
    }

    public function register_region_rewrite_rules() {
        add_rewrite_rule('^region/([^/]+)/?$', 'index.php?airepm_region=$matches[1]', 'top');
    }

    public function register_setup_admin_page() {
        add_submenu_page(
            'edit.php?post_type=property',
            '초기 설정',
            '초기 설정',
            'manage_options',
            'airepm-initial-setup',
            array($this, 'render_setup_admin_page')
        );
    }

    public function render_setup_admin_page() {
        if (!current_user_can('manage_options')) {
            return;
        }

        $settings = $this->get_setup_settings();
        $setup_page_id = (int) get_option('airepm_setup_page_id', 0);
        $setup_page = $setup_page_id ? get_post($setup_page_id) : null;
        $homepage_id = (int) get_option('airepm_homepage_id', 0);
        $homepage = $homepage_id ? get_post($homepage_id) : null;
        $menu_id = (int) get_option('airepm_menu_id', 0);
        $sample_count = $this->count_sample_properties();
        $setup_ran = isset($_GET['airepm_setup']) && $_GET['airepm_setup'] === 'complete';
        ?>
        <div class="wrap">
            <h1>AI 부동산 사이트 설정 마법사</h1>
            <?php if ($setup_ran) : ?>
                <div class="notice notice-success is-dismissible">
                    <p>사이트 자동 설정을 완료했습니다. 기존 페이지, 메뉴, 샘플 콘텐츠는 중복 생성하지 않았습니다.</p>
                </div>
            <?php endif; ?>
            <p>사업 정보만 입력하면 홈페이지, 매물 페이지, 메뉴, SEO 제목, 샘플 글과 샘플 매물을 자동으로 구성합니다.</p>

            <form method="post" action="<?php echo esc_url(admin_url('admin-post.php')); ?>" class="airepm-wizard">
                <?php wp_nonce_field('airepm_run_initial_setup', 'airepm_setup_nonce'); ?>
                <input type="hidden" name="action" value="airepm_run_initial_setup">

                <section class="airepm-wizard-step">
                    <span>Step 1</span>
                    <h2>사업 유형</h2>
                    <select name="business_type">
                        <option value="factory" <?php selected($settings['business_type'], 'factory'); ?>>공장·창고 전문 부동산</option>
                        <option value="commercial" <?php selected($settings['business_type'], 'commercial'); ?>>상업용 부동산</option>
                        <option value="land" <?php selected($settings['business_type'], 'land'); ?>>토지·개발 부지</option>
                        <option value="local" <?php selected($settings['business_type'], 'local'); ?>>지역 종합 부동산</option>
                    </select>
                </section>

                <section class="airepm-wizard-step">
                    <span>Step 2</span>
                    <h2>회사명</h2>
                    <input type="text" name="company_name" value="<?php echo esc_attr($settings['company_name']); ?>" placeholder="예: 다다솔 부동산">
                </section>

                <section class="airepm-wizard-step">
                    <span>Step 3</span>
                    <h2>메인 컬러</h2>
                    <input type="color" name="main_color" value="<?php echo esc_attr($settings['main_color']); ?>">
                    <p>홈페이지 주요 버튼과 강조 영역에 사용됩니다.</p>
                </section>

                <section class="airepm-wizard-step">
                    <span>Step 4</span>
                    <h2>주요 지역</h2>
                    <input type="text" name="region" value="<?php echo esc_attr($settings['region']); ?>" placeholder="예: 창원·김해·부산">
                </section>

                <section class="airepm-wizard-step airepm-wizard-submit">
                    <span>Step 5</span>
                    <h2>사이트 자동 생성</h2>
                    <p>홈페이지, 매물 페이지, 메뉴, SEO 제목, 샘플 블로그 글, 샘플 매물을 자동으로 생성합니다.</p>
                    <button type="submit" class="button button-primary button-hero">사이트 자동 생성 / 다시 실행</button>
                </section>
            </form>

            <table class="widefat striped airepm-wizard-status">
                <tbody>
                    <tr>
                        <th scope="row">홈페이지</th>
                        <td><?php echo $homepage ? esc_html($homepage->post_title) . ' (#' . esc_html($homepage->ID) . ')' : '아직 생성되지 않음'; ?></td>
                    </tr>
                    <tr>
                        <th scope="row">매물 페이지</th>
                        <td><?php echo $setup_page ? esc_html($setup_page->post_title) . ' (#' . esc_html($setup_page->ID) . ')' : '아직 생성되지 않음'; ?></td>
                    </tr>
                    <tr>
                        <th scope="row">메뉴</th>
                        <td><?php echo $menu_id ? '생성됨 (#' . esc_html($menu_id) . ')' : '아직 생성되지 않음'; ?></td>
                    </tr>
                    <tr>
                        <th scope="row">샘플 매물</th>
                        <td><?php echo esc_html($sample_count); ?> / 3개</td>
                    </tr>
                </tbody>
            </table>

            <style>
                .airepm-wizard{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:16px;max-width:1200px;margin:24px 0}
                .airepm-wizard-step{display:flex;min-height:210px;flex-direction:column;gap:10px;padding:20px;border:1px solid #d8e3dc;border-radius:14px;background:#fff}
                .airepm-wizard-step span{color:#1f7a4d;font-weight:800}
                .airepm-wizard-step h2{margin:0;color:#17261f;font-size:18px}
                .airepm-wizard-step input,.airepm-wizard-step select{width:100%;min-height:42px}
                .airepm-wizard-step p{color:#5b6a62}
                .airepm-wizard-submit{background:#f2faf5}
                .airepm-wizard-status{max-width:760px;margin-top:16px}
                @media(max-width:1100px){.airepm-wizard{grid-template-columns:repeat(2,minmax(0,1fr))}}
                @media(max-width:680px){.airepm-wizard{grid-template-columns:1fr}.airepm-wizard-step{min-height:auto}}
            </style>
        </div>
        <?php
    }

    public function handle_run_initial_setup() {
        if (!current_user_can('manage_options')) {
            wp_die('권한이 없습니다.');
        }

        check_admin_referer('airepm_run_initial_setup', 'airepm_setup_nonce');
        $settings = $this->sanitize_setup_settings($_POST);
        update_option('airepm_setup_settings', $settings);
        $this->run_initial_setup($settings);
        wp_safe_redirect(add_query_arg('airepm_setup', 'complete', admin_url('edit.php?post_type=property&page=airepm-initial-setup')));
        exit;
    }

    public function run_initial_setup($settings = null) {
        $settings = is_array($settings) ? $settings : $this->get_setup_settings();
        $this->register_property_post_type();
        $homepage_id = $this->create_homepage($settings);
        $this->create_default_property_page();
        $this->create_main_menu($settings, $homepage_id);
        $this->create_sample_properties();
        $this->create_sample_blog_posts($settings);
        $this->generate_seo_settings($settings, $homepage_id);
        update_option('airepm_initial_setup_completed', current_time('mysql'));
    }

    private function get_setup_settings() {
        $defaults = array(
            'business_type' => 'factory',
            'company_name' => get_bloginfo('name') ? get_bloginfo('name') : 'AI 부동산',
            'main_color' => '#1f7a4d',
            'region' => '창원·김해·부산',
        );

        $saved = get_option('airepm_setup_settings', array());
        return wp_parse_args(is_array($saved) ? $saved : array(), $defaults);
    }

    private function sanitize_setup_settings($source) {
        $business_type = isset($source['business_type']) ? sanitize_key(wp_unslash($source['business_type'])) : 'factory';
        $allowed_types = array('factory', 'commercial', 'land', 'local');
        if (!in_array($business_type, $allowed_types, true)) {
            $business_type = 'factory';
        }

        $main_color = isset($source['main_color']) ? sanitize_hex_color(wp_unslash($source['main_color'])) : '#1f7a4d';
        if (!$main_color) {
            $main_color = '#1f7a4d';
        }

        return array(
            'business_type' => $business_type,
            'company_name' => isset($source['company_name']) ? sanitize_text_field(wp_unslash($source['company_name'])) : 'AI 부동산',
            'main_color' => $main_color,
            'region' => isset($source['region']) ? sanitize_text_field(wp_unslash($source['region'])) : '창원·김해·부산',
        );
    }

    private function get_business_type_label($business_type) {
        $labels = array(
            'factory' => '공장·창고 전문 부동산',
            'commercial' => '상업용 부동산',
            'land' => '토지·개발 부지',
            'local' => '지역 종합 부동산',
        );

        return isset($labels[$business_type]) ? $labels[$business_type] : $labels['factory'];
    }

    private function create_homepage($settings) {
        $existing_page_id = (int) get_option('airepm_homepage_id', 0);
        if ($existing_page_id && get_post($existing_page_id)) {
            return $existing_page_id;
        }

        $existing_page = $this->find_page_by_title('홈');
        if ($existing_page) {
            update_option('airepm_homepage_id', $existing_page->ID);
            update_option('page_on_front', $existing_page->ID);
            update_option('show_on_front', 'page');
            return $existing_page->ID;
        }

        $page_id = wp_insert_post(array(
            'post_type' => 'page',
            'post_status' => 'publish',
            'post_title' => '홈',
            'post_name' => 'home',
            'post_content' => $this->build_homepage_content($settings),
        ), true);

        if (!is_wp_error($page_id)) {
            update_option('airepm_homepage_id', (int) $page_id);
            update_option('page_on_front', (int) $page_id);
            update_option('show_on_front', 'page');
            update_post_meta($page_id, '_airepm_generated_page', 'homepage');
            return (int) $page_id;
        }

        return 0;
    }

    private function build_homepage_content($settings) {
        $company = $settings['company_name'];
        $region = $settings['region'];
        $business_label = $this->get_business_type_label($settings['business_type']);
        $color = $settings['main_color'];

        return '<!-- AI Real Estate Elementor-ready homepage -->'
            . '<section class="airepm-site-section airepm-site-hero" style="--airepm-main-color:' . esc_attr($color) . ';">'
            . '<div><span class="airepm-site-eyebrow">' . esc_html($region) . ' 부동산 파트너</span><h1>' . esc_html($company) . '</h1><p>' . esc_html($business_label) . '를 위한 맞춤 매물 상담과 빠른 현장 연결을 제공합니다.</p><a class="airepm-site-button" href="#property-inquiry">상담 문의하기</a></div>'
            . '<div class="airepm-site-panel"><strong>추천 매물 검색</strong><p>조건에 맞는 매물을 바로 확인하세요.</p>[property_search]</div>'
            . '</section>'
            . '<section class="airepm-site-section"><h2>추천 매물</h2>[property_list]</section>'
            . '<section class="airepm-site-section airepm-site-columns"><div><h2>지역 기반 매물 분석</h2><p>' . esc_html($region) . ' 주요 권역의 입지, 접근성, 업종 적합도를 함께 검토합니다.</p></div><div>[property_map]</div></section>'
            . '<section id="property-inquiry" class="airepm-site-section airepm-site-cta"><h2>원하는 조건을 알려주세요</h2><p>예산, 면적, 지역, 입주 가능일을 남겨주시면 적합한 매물을 선별해 안내드립니다.</p></section>';
    }

    private function create_main_menu($settings, $homepage_id) {
        $menu_id = (int) get_option('airepm_menu_id', 0);
        $menu = $menu_id ? wp_get_nav_menu_object($menu_id) : null;

        if (!$menu) {
            $existing_menu = wp_get_nav_menu_object('AI 부동산 기본 메뉴');
            if ($existing_menu) {
                $menu_id = (int) $existing_menu->term_id;
            } else {
                $created_menu = wp_create_nav_menu('AI 부동산 기본 메뉴');
                $menu_id = is_wp_error($created_menu) ? 0 : (int) $created_menu;
            }

            if ($menu_id) {
                update_option('airepm_menu_id', $menu_id);
            }
        }

        if (!$menu_id) {
            return 0;
        }

        $property_page_id = $this->create_default_property_page();
        $items = wp_get_nav_menu_items($menu_id);
        if (empty($items)) {
            if ($homepage_id) {
                wp_update_nav_menu_item($menu_id, 0, array(
                    'menu-item-title' => '홈',
                    'menu-item-object-id' => $homepage_id,
                    'menu-item-object' => 'page',
                    'menu-item-type' => 'post_type',
                    'menu-item-status' => 'publish',
                ));
            }

            if ($property_page_id) {
                wp_update_nav_menu_item($menu_id, 0, array(
                    'menu-item-title' => '매물 검색',
                    'menu-item-object-id' => $property_page_id,
                    'menu-item-object' => 'page',
                    'menu-item-type' => 'post_type',
                    'menu-item-status' => 'publish',
                ));
            }

            wp_update_nav_menu_item($menu_id, 0, array(
                'menu-item-title' => '지역 정보',
                'menu-item-url' => home_url('/region/' . rawurlencode($settings['region']) . '/'),
                'menu-item-status' => 'publish',
            ));

            wp_update_nav_menu_item($menu_id, 0, array(
                'menu-item-title' => '상담 문의',
                'menu-item-url' => home_url('/#property-inquiry'),
                'menu-item-status' => 'publish',
            ));
        }

        $locations = get_theme_mod('nav_menu_locations');
        if (is_array($locations)) {
            foreach (array('primary', 'menu-1', 'main', 'header') as $location_key) {
                if (array_key_exists($location_key, $locations) && empty($locations[$location_key])) {
                    $locations[$location_key] = $menu_id;
                    set_theme_mod('nav_menu_locations', $locations);
                    break;
                }
            }
        }

        return $menu_id;
    }

    private function generate_seo_settings($settings, $homepage_id) {
        $seo_title = sprintf('%s | %s %s 매물 전문', $settings['company_name'], $settings['region'], $this->get_business_type_label($settings['business_type']));
        update_option('airepm_seo_title', $seo_title);

        if ($homepage_id) {
            update_post_meta($homepage_id, '_airepm_seo_title', $seo_title);
            update_post_meta($homepage_id, '_yoast_wpseo_title', $seo_title);
            update_post_meta($homepage_id, 'rank_math_title', $seo_title);
        }

        return $seo_title;
    }

    private function create_sample_blog_posts($settings) {
        $posts = array(
            array(
                'key' => 'region-guide',
                'title' => $settings['region'] . ' 공장·창고 입지 선택 가이드',
                'content' => '사업장 이전이나 확장을 준비할 때는 도로 접근성, 전력 용량, 주차와 하역 동선을 함께 확인해야 합니다. ' . $settings['region'] . ' 권역은 업종별로 적합한 입지가 다르므로 예산과 사용 목적을 먼저 정리하는 것이 좋습니다.',
            ),
            array(
                'key' => 'lease-checklist',
                'title' => '상업용 부동산 임대 전 확인해야 할 조건',
                'content' => '임대 계약 전에는 보증금과 월세뿐 아니라 관리비, 원상복구 범위, 용도 제한, 입주 가능일을 확인해야 합니다. 현장 방문 시 차량 진입로와 주변 민원 가능성도 함께 점검하세요.',
            ),
            array(
                'key' => 'factory-power',
                'title' => '공장 매물에서 전력 용량이 중요한 이유',
                'content' => '제조 설비를 운영하는 공장은 전력 용량이 생산성과 직결됩니다. 계약 전 기존 전력 용량, 증설 가능성, 전기 인입 위치를 확인하면 입주 후 추가 비용을 줄일 수 있습니다.',
            ),
        );

        foreach ($posts as $post) {
            if ($this->sample_blog_post_exists($post['key'])) {
                continue;
            }

            $post_id = wp_insert_post(array(
                'post_type' => 'post',
                'post_status' => 'publish',
                'post_title' => $post['title'],
                'post_content' => $post['content'],
                'post_excerpt' => wp_trim_words($post['content'], 24),
            ), true);

            if (!is_wp_error($post_id)) {
                update_post_meta($post_id, '_airepm_sample_blog', '1');
                update_post_meta($post_id, '_airepm_sample_blog_key', $post['key']);
            }
        }
    }

    private function sample_blog_post_exists($sample_key) {
        $query = new WP_Query(array(
            'post_type' => 'post',
            'post_status' => 'any',
            'posts_per_page' => 1,
            'fields' => 'ids',
            'meta_query' => array(
                array(
                    'key' => '_airepm_sample_blog_key',
                    'value' => $sample_key,
                    'compare' => '=',
                ),
            ),
        ));

        $exists = $query->have_posts();
        wp_reset_postdata();

        return $exists;
    }

    private function create_default_property_page() {
        $existing_page_id = (int) get_option('airepm_setup_page_id', 0);
        if ($existing_page_id && get_post($existing_page_id)) {
            return $existing_page_id;
        }

        $existing_page = $this->find_page_by_title('매물 상세');
        if ($existing_page) {
            update_option('airepm_setup_page_id', $existing_page->ID);
            return $existing_page->ID;
        }

        $page_id = wp_insert_post(array(
            'post_type' => 'page',
            'post_status' => 'publish',
            'post_title' => '매물 상세',
            'post_content' => "[property_search]\n\n[property_list]\n\n[property_map]",
            'post_name' => 'property-search',
        ), true);

        if (!is_wp_error($page_id)) {
            update_option('airepm_setup_page_id', (int) $page_id);
            return (int) $page_id;
        }

        return 0;
    }

    private function find_page_by_title($title) {
        $query = new WP_Query(array(
            'post_type' => 'page',
            'post_status' => array('publish', 'draft', 'private'),
            'title' => $title,
            'posts_per_page' => 1,
            'no_found_rows' => true,
        ));

        if ($query->have_posts()) {
            $page = $query->posts[0];
            wp_reset_postdata();
            return $page;
        }

        wp_reset_postdata();
        return null;
    }

    private function count_sample_properties() {
        $query = new WP_Query(array(
            'post_type' => 'property',
            'post_status' => 'any',
            'posts_per_page' => -1,
            'fields' => 'ids',
            'meta_query' => array(
                array(
                    'key' => '_airepm_sample_property',
                    'value' => '1',
                    'compare' => '=',
                ),
            ),
        ));

        $count = (int) $query->post_count;
        wp_reset_postdata();

        return $count;
    }

    private function create_sample_properties() {
        $samples = array(
            array(
                'sample_key' => 'changwon-factory',
                'property_title' => '창원 성산구 즉시 입주 공장',
                'province' => '경남',
                'city' => '창원시',
                'district' => '성산구',
                'town' => '상남동',
                'transaction_type' => 'rent',
                'property_type' => 'factory',
                'area' => '420',
                'price' => '3500000',
                'description' => '창원 국가산단 접근성이 좋은 공장 매물입니다. 전력 사용량이 안정적이고 물류 차량 진입이 편리해 제조업, 조립업, 보관업에 적합합니다.',
            ),
            array(
                'sample_key' => 'gimhae-warehouse',
                'property_title' => '김해 진영읍 물류 창고',
                'province' => '경남',
                'city' => '김해시',
                'district' => '',
                'town' => '진영읍',
                'transaction_type' => 'rent',
                'property_type' => 'warehouse',
                'area' => '680',
                'price' => '4800000',
                'description' => '고속도로 접근이 편리한 창고형 매물입니다. 넓은 진입로와 적재 공간을 갖춰 물류, 유통, 보관 목적에 적합합니다.',
            ),
            array(
                'sample_key' => 'busan-commercial',
                'property_title' => '부산 강서구 상업용 부지',
                'province' => '부산',
                'city' => '부산시',
                'district' => '강서구',
                'town' => '명지동',
                'transaction_type' => 'sale',
                'property_type' => 'commercial',
                'area' => '920',
                'price' => '1250000000',
                'description' => '신도시 배후 수요와 도로 접근성을 함께 갖춘 상업용 부지입니다. 근린생활시설, 전시장, 업무시설 검토에 적합합니다.',
            ),
        );

        foreach ($samples as $sample) {
            if ($this->sample_property_exists($sample['sample_key'])) {
                continue;
            }

            $post_id = wp_insert_post(array(
                'post_type' => 'property',
                'post_status' => 'publish',
                'post_title' => $sample['property_title'],
                'post_content' => $sample['description'],
                'post_excerpt' => wp_trim_words($sample['description'], 24),
            ), true);

            if (is_wp_error($post_id)) {
                continue;
            }

            foreach ($sample as $key => $value) {
                if ($key === 'sample_key') {
                    continue;
                }
                update_post_meta($post_id, $key, $value);
            }

            update_post_meta($post_id, '_airepm_sample_property', '1');
            update_post_meta($post_id, '_airepm_sample_key', $sample['sample_key']);
            update_post_meta($post_id, 'region', trim($sample['city'] . ' ' . $sample['district'] . ' ' . $sample['town']));
            update_post_meta($post_id, 'featured_image', '');
        }
    }

    private function sample_property_exists($sample_key) {
        $query = new WP_Query(array(
            'post_type' => 'property',
            'post_status' => 'any',
            'posts_per_page' => 1,
            'fields' => 'ids',
            'meta_query' => array(
                array(
                    'key' => '_airepm_sample_key',
                    'value' => $sample_key,
                    'compare' => '=',
                ),
            ),
        ));

        $exists = $query->have_posts();
        wp_reset_postdata();

        return $exists;
    }

    public function register_query_vars($vars) {
        $vars[] = 'airepm_region';
        return $vars;
    }

    public function add_property_meta_boxes() {
        if (function_exists('acf_add_local_field_group')) {
            return;
        }

        add_meta_box(
            'airepm_property_details',
            '매물 정보',
            array($this, 'render_property_details_meta_box'),
            'property',
            'normal',
            'high'
        );
    }

    public function register_acf_field_group() {
        if (!function_exists('acf_add_local_field_group')) {
            return;
        }

        $fields = array();
        foreach ($this->get_field_definitions() as $key => $field) {
            $acf_field = array(
                'key' => 'field_airepm_' . $key,
                'label' => $field['label'],
                'name' => $key,
                'type' => $this->map_field_type_to_acf($field['type']),
                'required' => in_array($key, array('property_title', 'transaction_type', 'property_type'), true) ? 1 : 0,
                'wrapper' => array('width' => '50'),
            );

            if ($field['type'] === 'select' && isset($field['options'])) {
                $acf_field['choices'] = $field['options'];
                $acf_field['allow_null'] = 1;
                $acf_field['ui'] = 1;
            }

            if ($field['type'] === 'textarea') {
                $acf_field['rows'] = 4;
                $acf_field['wrapper'] = array('width' => '100');
            }

            if ($field['type'] === 'date') {
                $acf_field['display_format'] = 'Y-m-d';
                $acf_field['return_format'] = 'Y-m-d';
            }

            if ($field['type'] === 'checkbox') {
                $acf_field['message'] = '예';
                $acf_field['ui'] = 1;
            }

            if (in_array($key, array('latitude', 'longitude'), true)) {
                $acf_field['instructions'] = $key === 'latitude'
                    ? '지도 표시용 위도(lat)를 입력하세요.'
                    : '지도 표시용 경도(lng)를 입력하세요.';
            }

            $fields[] = $acf_field;
        }

        acf_add_local_field_group(array(
            'key' => 'group_airepm_property_fields',
            'title' => '매물 표준 필드',
            'fields' => $fields,
            'location' => array(
                array(
                    array(
                        'param' => 'post_type',
                        'operator' => '==',
                        'value' => 'property',
                    ),
                ),
            ),
            'position' => 'normal',
            'style' => 'default',
            'label_placement' => 'top',
            'instruction_placement' => 'label',
            'active' => true,
            'description' => 'AI 부동산 빌더 표준 매물 필드입니다. ACF가 없는 경우 플러그인 기본 메타박스가 동일한 meta key로 저장합니다.',
        ));
    }

    private function map_field_type_to_acf($type) {
        if ($type === 'number') return 'number';
        if ($type === 'textarea') return 'textarea';
        if ($type === 'select') return 'select';
        if ($type === 'checkbox') return 'true_false';
        if ($type === 'date') return 'date_picker';
        return 'text';
    }

    private function get_field_definitions() {
        return array(
            'property_title' => array('label' => '제목', 'type' => 'text'),
            'transaction_type' => array(
                'label' => '거래유형',
                'type' => 'select',
                'options' => array('sale' => '매매', 'rent' => '임대'),
            ),
            'property_type' => array(
                'label' => '매물유형',
                'type' => 'select',
                'options' => array('factory' => '공장', 'warehouse' => '창고', 'land' => '토지', 'commercial' => '상업용'),
            ),
            'province' => array('label' => '도·광역시', 'type' => 'text'),
            'city' => array('label' => '시', 'type' => 'text'),
            'district' => array('label' => '구·군', 'type' => 'text'),
            'town' => array('label' => '읍·면·동', 'type' => 'text'),
            'region' => array('label' => '기존 지역', 'type' => 'text'),
            'address' => array('label' => '주소', 'type' => 'text'),
            'price' => array('label' => '가격', 'type' => 'number'),
            'area' => array('label' => '면적', 'type' => 'number'),
            'land_area' => array('label' => '대지면적', 'type' => 'number'),
            'building_area' => array('label' => '건축면적', 'type' => 'number'),
            'power_capacity' => array('label' => '전력 용량', 'type' => 'text'),
            'ceiling_height' => array('label' => '층고', 'type' => 'text'),
            'parking' => array('label' => '주차', 'type' => 'text'),
            'road_width' => array('label' => '도로 폭', 'type' => 'text'),
            'available_date' => array('label' => '입주/사용 가능일', 'type' => 'date'),
            'move_in_date' => array('label' => '기존 입주 가능일', 'type' => 'date'),
            'description' => array('label' => '설명', 'type' => 'textarea'),
            'latitude' => array('label' => '위도', 'type' => 'text'),
            'longitude' => array('label' => '경도', 'type' => 'text'),
            'featured_image' => array('label' => '대표 이미지 URL 또는 첨부파일 ID', 'type' => 'text'),
            'gallery_images' => array('label' => '갤러리 이미지 URL 또는 ID (쉼표로 구분)', 'type' => 'textarea'),
            'is_featured' => array('label' => '추천 매물', 'type' => 'checkbox'),
        );
    }

    public function render_property_details_meta_box($post) {
        wp_nonce_field('airepm_save_property_meta', 'airepm_property_nonce');
        $fields = $this->get_field_definitions();
        echo '<div class="airepm-admin-grid">';
        foreach ($fields as $key => $field) {
            $value = get_post_meta($post->ID, $key, true);
            echo '<p class="airepm-admin-field">';
            echo '<label for="' . esc_attr($key) . '"><strong>' . esc_html($field['label']) . '</strong></label>';
            if ($field['type'] === 'select') {
                echo '<select id="' . esc_attr($key) . '" name="' . esc_attr($key) . '">';
                echo '<option value="">선택</option>';
                foreach ($field['options'] as $option_value => $option_label) {
                    echo '<option value="' . esc_attr($option_value) . '"' . selected($value, $option_value, false) . '>' . esc_html($option_label) . '</option>';
                }
                echo '</select>';
            } elseif ($field['type'] === 'textarea') {
                echo '<textarea id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" rows="4">' . esc_textarea($value) . '</textarea>';
            } elseif ($field['type'] === 'checkbox') {
                echo '<label class="airepm-checkbox"><input type="checkbox" id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" value="1"' . checked($value, '1', false) . '> 예</label>';
            } else {
                echo '<input id="' . esc_attr($key) . '" name="' . esc_attr($key) . '" type="' . esc_attr($field['type']) . '" value="' . esc_attr($value) . '">';
            }
            echo '</p>';
        }
        echo '</div>';
        echo '<p><em>안내: 도·광역시, 시, 구·군, 읍·면·동을 입력하면 한국형 계층 지역 검색에 사용할 수 있습니다. 기존 매물과의 호환을 위해 기존 지역 필드도 계속 지원됩니다.</em></p>';
        echo '<style>
            .airepm-admin-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px 20px}
            .airepm-admin-field label{display:block;margin-bottom:6px}
            .airepm-admin-field input:not([type=checkbox]),.airepm-admin-field select,.airepm-admin-field textarea{width:100%;max-width:100%}
            .airepm-admin-field textarea{min-height:90px}
            @media(max-width:900px){.airepm-admin-grid{grid-template-columns:1fr}}
        </style>';
    }

    public function save_property_meta($post_id, $post) {
        if ($this->saving_property_title) {
            return;
        }
        if (!isset($_POST['airepm_property_nonce']) || !wp_verify_nonce(sanitize_text_field(wp_unslash($_POST['airepm_property_nonce'])), 'airepm_save_property_meta')) {
            return;
        }
        if (defined('DOING_AUTOSAVE') && DOING_AUTOSAVE) {
            return;
        }
        if (!current_user_can('edit_post', $post_id)) {
            return;
        }

        $fields = $this->get_field_definitions();
        foreach ($fields as $key => $field) {
            if ($field['type'] === 'checkbox') {
                $value = isset($_POST[$key]) ? '1' : '0';
            } elseif (isset($_POST[$key])) {
                $raw_value = wp_unslash($_POST[$key]);
                if ($field['type'] === 'textarea') {
                    $value = sanitize_textarea_field($raw_value);
                } elseif ($field['type'] === 'number') {
                    $value = is_numeric($raw_value) ? (string) $raw_value : '';
                } else {
                    $value = sanitize_text_field($raw_value);
                }
            } else {
                $value = '';
            }
            update_post_meta($post_id, $key, $value);
        }

        $property_title = isset($_POST['property_title']) ? sanitize_text_field(wp_unslash($_POST['property_title'])) : '';
        $available_date = isset($_POST['available_date']) ? sanitize_text_field(wp_unslash($_POST['available_date'])) : '';
        $move_in_date = isset($_POST['move_in_date']) ? sanitize_text_field(wp_unslash($_POST['move_in_date'])) : '';

        if ($available_date && !$move_in_date) {
            update_post_meta($post_id, 'move_in_date', $available_date);
        } elseif ($move_in_date && !$available_date) {
            update_post_meta($post_id, 'available_date', $move_in_date);
        }

        if ($property_title && $post->post_title !== $property_title) {
            $this->saving_property_title = true;
            wp_update_post(array('ID' => $post_id, 'post_title' => $property_title));
            $this->saving_property_title = false;
        }
    }

    public function enqueue_public_assets() {
        wp_enqueue_style('airepm-public', AIREPM_PLUGIN_URL . 'assets/css/public.css', array(), AIREPM_VERSION);
    }

    public function render_property_search_shortcode($atts = array()) {
        ob_start();
        echo $this->render_search_form();
        return ob_get_clean();
    }

    public function render_property_list_shortcode($atts = array()) {
        return $this->render_property_list();
    }

    public function render_property_location_search_shortcode($atts = array()) {
        ob_start();
        echo $this->render_location_search_form();
        return ob_get_clean();
    }

    public function render_property_map_shortcode($atts = array()) {
        $filters = $this->get_current_filters();
        $query = new WP_Query(array(
            'post_type' => 'property',
            'post_status' => 'publish',
            'posts_per_page' => 50,
            'meta_query' => $this->build_meta_query($filters),
        ));

        $markers = array();
        while ($query->have_posts()) {
            $query->the_post();
            $post_id = get_the_ID();
            $latitude = get_post_meta($post_id, 'latitude', true);
            $longitude = get_post_meta($post_id, 'longitude', true);
            if ($latitude !== '' && $longitude !== '') {
                $markers[] = array(
                    'title' => get_post_meta($post_id, 'property_title', true) ?: get_the_title($post_id),
                    'location' => $this->get_full_location($post_id),
                    'latitude' => $latitude,
                    'longitude' => $longitude,
                );
            }
        }
        wp_reset_postdata();

        ob_start();
        ?>
        <div class="airepm-map">
            <div class="airepm-map-header">
                <strong>매물 지도</strong>
                <span><?php echo esc_html(count($markers)); ?>개 위치</span>
            </div>
            <div class="airepm-map-placeholder">
                <p>지도 API 설정 후 이 영역에 매물 위치가 표시됩니다.</p>
                <small>Google Maps, Kakao Maps, Naver Maps 스크립트와 아래 좌표 데이터를 연결하세요.</small>
            </div>
            <?php if (!empty($markers)) : ?>
                <ul class="airepm-map-list">
                    <?php foreach ($markers as $marker) : ?>
                        <li>
                            <strong><?php echo esc_html($marker['title']); ?></strong>
                            <span><?php echo esc_html($marker['location']); ?></span>
                            <small><?php echo esc_html($marker['latitude'] . ', ' . $marker['longitude']); ?></small>
                        </li>
                    <?php endforeach; ?>
                </ul>
            <?php endif; ?>
        </div>
        <?php
        return ob_get_clean();
    }

    public function render_region_archive() {
        $region = $this->get_region_query_value();
        ob_start();
        echo '<div class="airepm-region-archive">';
        echo '<h1>' . esc_html($region) . ' 매물</h1>';
        echo $this->render_search_form();
        echo do_shortcode('[property_list]');
        echo '</div>';
        return ob_get_clean();
    }

    public function configure_elementor_property_query($query) {
        $query->set('post_type', 'property');
        $query->set('post_status', 'publish');
        $query->set('posts_per_page', 12);
    }

    public function configure_elementor_featured_property_query($query) {
        $query->set('post_type', 'property');
        $query->set('post_status', 'publish');
        $query->set('posts_per_page', 6);
        $query->set('meta_query', array(
            array(
                'key' => 'is_featured',
                'value' => '1',
                'compare' => '=',
            ),
        ));
    }

    private function render_search_form() {
        $filters = $this->get_current_filters();
        $province_options = $this->get_location_options('province', array());
        $city_options = $this->get_location_options('city', array('province' => $filters['province']));
        $district_options = $this->get_location_options('district', array('province' => $filters['province'], 'city' => $filters['city']));
        $town_options = $this->get_location_options('town', array('province' => $filters['province'], 'city' => $filters['city'], 'district' => $filters['district']));

        ob_start();
        ?>
        <form class="airepm-search" method="get">
            <div>
                <label>도·광역시</label>
                <?php echo $this->render_select('province', $filters['province'], $province_options, '전체 도·광역시'); ?>
            </div>
            <div>
                <label>시</label>
                <?php echo $this->render_select('city', $filters['city'], $city_options, '전체 시'); ?>
            </div>
            <div>
                <label>구·군</label>
                <?php echo $this->render_select('district', $filters['district'], $district_options, '전체 구·군'); ?>
            </div>
            <div>
                <label>읍·면·동</label>
                <?php echo $this->render_select('town', $filters['town'], $town_options, '전체 읍·면·동'); ?>
            </div>
            <div>
                <label>기존 지역</label>
                <input type="text" name="region" value="<?php echo esc_attr($filters['region']); ?>" placeholder="지역">
            </div>
            <div>
                <label>거래유형</label>
                <select name="transaction_type">
                    <option value="">전체</option>
                    <option value="sale" <?php selected($filters['transaction_type'], 'sale'); ?>>매매</option>
                    <option value="rent" <?php selected($filters['transaction_type'], 'rent'); ?>>임대</option>
                </select>
            </div>
            <div>
                <label>매물유형</label>
                <select name="property_type">
                    <option value="">전체</option>
                    <option value="factory" <?php selected($filters['property_type'], 'factory'); ?>>공장</option>
                    <option value="warehouse" <?php selected($filters['property_type'], 'warehouse'); ?>>창고</option>
                    <option value="land" <?php selected($filters['property_type'], 'land'); ?>>토지</option>
                    <option value="commercial" <?php selected($filters['property_type'], 'commercial'); ?>>상업용</option>
                </select>
            </div>
            <div>
                <label>최저 가격</label>
                <input type="number" name="min_price" value="<?php echo esc_attr($filters['min_price']); ?>">
            </div>
            <div>
                <label>최고 가격</label>
                <input type="number" name="max_price" value="<?php echo esc_attr($filters['max_price']); ?>">
            </div>
            <div>
                <label>최소 면적</label>
                <input type="number" name="min_area" value="<?php echo esc_attr($filters['min_area']); ?>">
            </div>
            <div>
                <label>최대 면적</label>
                <input type="number" name="max_area" value="<?php echo esc_attr($filters['max_area']); ?>">
            </div>
            <div class="airepm-search-actions">
                <button type="submit">검색</button>
                <a href="<?php echo esc_url($this->get_reset_url($filters)); ?>">초기화</a>
            </div>
        </form>
        <?php
        return ob_get_clean();
    }

    private function render_location_search_form() {
        $filters = $this->get_current_filters();
        $province_options = $this->get_location_options('province', array());
        $city_options = $this->get_location_options('city', array('province' => $filters['province']));
        $district_options = $this->get_location_options('district', array('province' => $filters['province'], 'city' => $filters['city']));
        $town_options = $this->get_location_options('town', array('province' => $filters['province'], 'city' => $filters['city'], 'district' => $filters['district']));

        ob_start();
        ?>
        <form class="airepm-search airepm-location-search" method="get">
            <div>
                <label>도·광역시</label>
                <?php echo $this->render_select('province', $filters['province'], $province_options, '전체 도·광역시'); ?>
            </div>
            <div>
                <label>시</label>
                <?php echo $this->render_select('city', $filters['city'], $city_options, '전체 시'); ?>
            </div>
            <div>
                <label>구·군</label>
                <?php echo $this->render_select('district', $filters['district'], $district_options, '전체 구·군'); ?>
            </div>
            <div>
                <label>읍·면·동</label>
                <?php echo $this->render_select('town', $filters['town'], $town_options, '전체 읍·면·동'); ?>
            </div>
            <div class="airepm-search-actions">
                <button type="submit">검색</button>
                <a href="<?php echo esc_url($this->get_reset_url($filters)); ?>">초기화</a>
            </div>
        </form>
        <?php
        return ob_get_clean();
    }

    private function render_select($name, $current_value, $options, $placeholder) {
        ob_start();
        echo '<select name="' . esc_attr($name) . '" onchange="this.form.submit()">';
        echo '<option value="">' . esc_html($placeholder) . '</option>';
        foreach ($options as $option) {
            echo '<option value="' . esc_attr($option) . '"' . selected($current_value, $option, false) . '>' . esc_html($option) . '</option>';
        }
        echo '</select>';
        return ob_get_clean();
    }

    private function get_reset_url($filters) {
        $keys = array_merge(array_keys($filters), array('airepm_region'));
        return remove_query_arg($keys);
    }

    private function get_region_query_value() {
        $region = get_query_var('airepm_region');
        if ($region) {
            return sanitize_text_field(rawurldecode($region));
        }
        return '';
    }

    private function get_current_filters() {
        $keys = array('province', 'city', 'district', 'town', 'region', 'transaction_type', 'property_type', 'min_price', 'max_price', 'min_area', 'max_area');
        $filters = array();
        foreach ($keys as $key) {
            $filters[$key] = isset($_GET[$key]) ? sanitize_text_field(wp_unslash($_GET[$key])) : '';
        }
        $filters['region_url'] = $this->get_region_query_value();
        return $filters;
    }

    private function get_location_options($target_key, $base_filters) {
        global $wpdb;

        $join = "INNER JOIN {$wpdb->posts} p ON p.ID = target.post_id";
        $where = array("target.meta_key = %s", "target.meta_value <> ''", "p.post_type = 'property'", "p.post_status = 'publish'");
        $params = array($target_key);
        $index = 0;

        foreach ($base_filters as $key => $value) {
            if ($value === '') {
                continue;
            }
            $alias = 'filter_' . $index;
            $join .= " INNER JOIN {$wpdb->postmeta} {$alias} ON {$alias}.post_id = p.ID";
            $where[] = "{$alias}.meta_key = %s";
            $where[] = "{$alias}.meta_value = %s";
            $params[] = $key;
            $params[] = $value;
            $index++;
        }

        $sql = "
            SELECT DISTINCT target.meta_value
            FROM {$wpdb->postmeta} target
            {$join}
            WHERE " . implode(' AND ', $where) . "
            ORDER BY target.meta_value ASC
        ";

        return $wpdb->get_col($wpdb->prepare($sql, $params));
    }

    private function build_meta_query($filters) {
        $meta_query = array('relation' => 'AND');

        foreach (array('province', 'city', 'district', 'town') as $key) {
            if (!empty($filters[$key])) {
                $meta_query[] = array(
                    'key' => $key,
                    'value' => $filters[$key],
                    'compare' => '=',
                );
            }
        }

        if (!empty($filters['region'])) {
            $meta_query[] = array(
                'key' => 'region',
                'value' => $filters['region'],
                'compare' => 'LIKE',
            );
        }

        if (!empty($filters['region_url'])) {
            $meta_query[] = array(
                'relation' => 'OR',
                array('key' => 'province', 'value' => $filters['region_url'], 'compare' => '='),
                array('key' => 'city', 'value' => $filters['region_url'], 'compare' => '='),
                array('key' => 'district', 'value' => $filters['region_url'], 'compare' => '='),
                array('key' => 'town', 'value' => $filters['region_url'], 'compare' => '='),
                array('key' => 'region', 'value' => $filters['region_url'], 'compare' => 'LIKE'),
            );
        }

        foreach (array('transaction_type', 'property_type') as $key) {
            if (!empty($filters[$key])) {
                $meta_query[] = array(
                    'key' => $key,
                    'value' => $filters[$key],
                    'compare' => '=',
                );
            }
        }

        if ($filters['min_price'] !== '') {
            $meta_query[] = array('key' => 'price', 'value' => (float) $filters['min_price'], 'compare' => '>=', 'type' => 'NUMERIC');
        }
        if ($filters['max_price'] !== '') {
            $meta_query[] = array('key' => 'price', 'value' => (float) $filters['max_price'], 'compare' => '<=', 'type' => 'NUMERIC');
        }
        if ($filters['min_area'] !== '') {
            $meta_query[] = array('key' => 'area', 'value' => (float) $filters['min_area'], 'compare' => '>=', 'type' => 'NUMERIC');
        }
        if ($filters['max_area'] !== '') {
            $meta_query[] = array('key' => 'area', 'value' => (float) $filters['max_area'], 'compare' => '<=', 'type' => 'NUMERIC');
        }
        return count($meta_query) > 1 ? $meta_query : array();
    }

    private function render_property_list() {
        $filters = $this->get_current_filters();
        $query_args = array(
            'post_type' => 'property',
            'post_status' => 'publish',
            'posts_per_page' => 6,
            'meta_query' => $this->build_meta_query($filters),
        );
        $query = new WP_Query($query_args);
        ob_start();
        echo '<div class="airepm-property-list">';
        $rendered_count = 0;
        $query_had_posts = $query->post_count > 0;
        if ($query->have_posts()) {
            echo '<div class="airepm-property-grid">';
            while ($query->have_posts()) {
                $query->the_post();
                $post_id = get_the_ID();
                if (get_post_status($post_id) !== 'publish') {
                    continue;
                }
                if (in_array($post_id, $this->rendered_property_ids, true)) {
                    continue;
                }
                $this->rendered_property_ids[] = $post_id;
                $rendered_count++;
                echo $this->render_property_card($post_id);
            }
            echo '</div>';
        }
        if ($rendered_count === 0 && !$query_had_posts) {
            echo '<div class="airepm-empty">등록된 매물이 없습니다.</div>';
        }
        echo '</div>';
        wp_reset_postdata();
        return ob_get_clean();
    }

    private function get_property_image($post_id) {
        if (has_post_thumbnail($post_id)) {
            return get_the_post_thumbnail($post_id, 'medium_large', array('class' => 'airepm-card-image'));
        }
        $featured = get_post_meta($post_id, 'featured_image', true);
        if ($featured) {
            if (is_numeric($featured)) {
                return wp_get_attachment_image((int) $featured, 'medium_large', false, array('class' => 'airepm-card-image'));
            }
            return '<img class="airepm-card-image" src="' . esc_url($featured) . '" alt="">';
        }
        return '<div class="airepm-card-placeholder">매물 이미지</div>';
    }

    private function get_full_location($post_id) {
        $parts = array();
        foreach (array('province', 'city', 'district', 'town') as $key) {
            $value = get_post_meta($post_id, $key, true);
            if ($value !== '') {
                $parts[] = $value;
            }
        }
        if (!empty($parts)) {
            return implode(' / ', $parts);
        }
        return get_post_meta($post_id, 'region', true);
    }

    private function render_property_card($post_id) {
        $title = get_post_meta($post_id, 'property_title', true);
        $title = $title ? $title : get_the_title($post_id);
        $location = $this->get_full_location($post_id);
        $transaction_type = get_post_meta($post_id, 'transaction_type', true);
        $property_type = get_post_meta($post_id, 'property_type', true);
        $price = get_post_meta($post_id, 'price', true);
        $area = get_post_meta($post_id, 'area', true);
        $transaction_labels = array('sale' => '매매', 'rent' => '임대');
        $property_type_labels = array('factory' => '공장', 'warehouse' => '창고', 'land' => '토지', 'commercial' => '상업용');

        ob_start();
        ?>
        <article class="airepm-property-card">
            <a href="<?php echo esc_url(get_permalink($post_id)); ?>" class="airepm-card-media">
                <?php echo wp_kses_post($this->get_property_image($post_id)); ?>
            </a>
            <div class="airepm-card-body">
                <div class="airepm-card-meta">
                    <?php if ($location) : ?><span><?php echo esc_html($location); ?></span><?php endif; ?>
                    <?php if ($transaction_type) : ?><span><?php echo esc_html($transaction_labels[$transaction_type] ?? $transaction_type); ?></span><?php endif; ?>
                    <?php if ($property_type) : ?><span><?php echo esc_html($property_type_labels[$property_type] ?? $property_type); ?></span><?php endif; ?>
                </div>
                <h3><?php echo esc_html($title); ?></h3>
                <div class="airepm-card-facts">
                    <?php if ($price !== '') : ?><strong><?php echo esc_html(number_format((float) $price)); ?></strong><?php endif; ?>
                    <?php if ($area !== '') : ?><span><?php echo esc_html($area); ?> m²</span><?php endif; ?>
                </div>
                <a class="airepm-detail-button" href="<?php echo esc_url(get_permalink($post_id)); ?>">자세히 보기</a>
            </div>
        </article>
        <?php
        return ob_get_clean();
    }

    public function load_plugin_templates($template) {
        if (is_singular('property')) {
            $plugin_template = AIREPM_PLUGIN_DIR . 'templates/single-property.php';
            if (file_exists($plugin_template)) {
                return $plugin_template;
            }
        }

        if ($this->get_region_query_value()) {
            $plugin_template = AIREPM_PLUGIN_DIR . 'templates/region-property.php';
            if (file_exists($plugin_template)) {
                global $wp_query;
                if ($wp_query) {
                    $wp_query->is_404 = false;
                }
                status_header(200);
                return $plugin_template;
            }
        }

        return $template;
    }
}

AI_Real_Estate_Property_Manager::instance();

register_activation_hook(__FILE__, function () {
    AI_Real_Estate_Property_Manager::instance()->register_property_post_type();
    AI_Real_Estate_Property_Manager::instance()->register_region_rewrite_rules();
    AI_Real_Estate_Property_Manager::instance()->run_initial_setup();
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () {
    flush_rewrite_rules();
});
