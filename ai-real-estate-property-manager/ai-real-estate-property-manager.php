<?php
/**
 * Plugin Name: AI Real Estate Property Manager
 * Description: AI 부동산 웹사이트를 위한 매물 관리, 검색, 목록 표시 시스템입니다.
 * Version: 1.1.0
 * Author: Dadasol
 * Text Domain: ai-real-estate-property-manager
 */

if (!defined('ABSPATH')) {
    exit;
}

define('AIREPM_VERSION', '1.1.0');
define('AIREPM_PLUGIN_DIR', plugin_dir_path(__FILE__));
define('AIREPM_PLUGIN_URL', plugin_dir_url(__FILE__));

final class AI_Real_Estate_Property_Manager {
    private static $instance = null;
    private $saving_property_title = false;

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
                'sanitize_callback' => $field['type'] === 'textarea'
                    ? 'sanitize_textarea_field'
                    : 'sanitize_text_field',
            ));
        }
    }

    public function register_region_rewrite_rules() {
        add_rewrite_rule('^region/([^/]+)/?$', 'index.php?airepm_region=$matches[1]', 'top');
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
            'property_title' => array('label' => '매물명', 'type' => 'text'),
            'transaction_type' => array(
                'label' => '거래유형',
                'type' => 'select',
                'options' => array('sale' => '매매', 'rent' => '임대'),
            ),
            'property_type' => array(
                'label' => '매물유형',
                'type' => 'select',
                'options' => array('factory' => '공장', 'warehouse' => '창고', 'land' => '토지'),
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
            'move_in_date' => array('label' => '입주 가능일', 'type' => 'date'),
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
        echo $this->render_property_list();
        return ob_get_clean();
    }

    public function render_property_list_shortcode($atts = array()) {
        return $this->render_property_list();
    }

    public function render_property_location_search_shortcode($atts = array()) {
        ob_start();
        echo $this->render_location_search_form();
        echo $this->render_property_list();
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
        echo $this->render_property_list();
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
            'posts_per_page' => 12,
            'meta_query' => $this->build_meta_query($filters),
        );
        $query = new WP_Query($query_args);
        ob_start();
        if ($query->have_posts()) {
            echo '<div class="airepm-property-grid">';
            while ($query->have_posts()) {
                $query->the_post();
                echo $this->render_property_card(get_the_ID());
            }
            echo '</div>';
        } else {
            echo '<div class="airepm-empty">등록된 매물이 없습니다.</div>';
        }
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
        $property_type_labels = array('factory' => '공장', 'warehouse' => '창고', 'land' => '토지');

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
    flush_rewrite_rules();
});

register_deactivation_hook(__FILE__, function () {
    flush_rewrite_rules();
});
