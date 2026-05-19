<?php
/**
 * Single property template supplied by the plugin.
 *
 * Theme developers can override this by adding their own single-property.php
 * template. The plugin keeps the display theme-friendly while ensuring the
 * generated site works even when the active theme has no property template.
 */

if (!defined('ABSPATH')) {
    exit;
}

get_header();

while (have_posts()) :
    the_post();

    $post_id = get_the_ID();
    $meta = function ($key) use ($post_id) {
        return get_post_meta($post_id, $key, true);
    };

    $title = $meta('property_title') ? $meta('property_title') : get_the_title();
    $price = $meta('price');
    $area = $meta('area');
    $transaction_type = $meta('transaction_type');
    $property_type = $meta('property_type');
    $province = $meta('province');
    $city = $meta('city');
    $district = $meta('district');
    $town = $meta('town');
    $legacy_region = $meta('region');
    $location_parts = array_filter(array($province, $city, $district, $town));
    $full_location = !empty($location_parts) ? implode(' / ', $location_parts) : $legacy_region;
    $address = $meta('address');
    $description = $meta('description') ? $meta('description') : get_the_content();
    $latitude = $meta('latitude');
    $longitude = $meta('longitude');
    $featured_image = $meta('featured_image');
    $gallery_images = array_filter(array_map('trim', explode(',', (string) $meta('gallery_images'))));

    $image_html = '';
    if (has_post_thumbnail($post_id)) {
        $image_html = get_the_post_thumbnail($post_id, 'large');
    } elseif ($featured_image) {
        if (is_numeric($featured_image)) {
            $image_html = wp_get_attachment_image((int) $featured_image, 'large');
        } else {
            $image_html = '<img src="' . esc_url($featured_image) . '" alt="">';
        }
    }

    $labels = array(
        'sale' => '매매',
        'rent' => '임대',
        'factory' => '공장',
        'warehouse' => '창고',
        'land' => '토지',
    );

    $facts = array(
        '면적' => $area ? $area . ' m²' : '',
        '대지면적' => $meta('land_area') ? $meta('land_area') . ' m²' : '',
        '건축면적' => $meta('building_area') ? $meta('building_area') . ' m²' : '',
        '전력 용량' => $meta('power_capacity'),
        '층고' => $meta('ceiling_height'),
        '주차' => $meta('parking'),
        '도로 폭' => $meta('road_width'),
        '입주 가능일' => $meta('move_in_date'),
    );
    ?>

    <main class="airepm-single">
        <section class="airepm-single-hero">
            <div class="airepm-single-image">
                <?php
                if ($image_html) {
                    echo wp_kses_post($image_html);
                } else {
                    echo '<div class="airepm-card-placeholder">매물 이미지</div>';
                }
                ?>
            </div>

            <aside class="airepm-single-summary">
                <div class="airepm-single-meta">
                    <?php if ($full_location) : ?><span><?php echo esc_html($full_location); ?></span><?php endif; ?>
                    <?php if ($transaction_type) : ?><span><?php echo esc_html($labels[$transaction_type] ?? ucfirst($transaction_type)); ?></span><?php endif; ?>
                    <?php if ($property_type) : ?><span><?php echo esc_html($labels[$property_type] ?? ucfirst($property_type)); ?></span><?php endif; ?>
                </div>

                <h1><?php echo esc_html($title); ?></h1>

                <?php if ($address) : ?>
                    <p class="airepm-single-address"><?php echo esc_html($address); ?></p>
                <?php endif; ?>

                <?php if ($price !== '') : ?>
                    <p class="airepm-single-price"><?php echo esc_html(number_format((float) $price)); ?></p>
                <?php endif; ?>

                <a class="airepm-single-button" href="#property-inquiry">상세 문의하기</a>
            </aside>
        </section>

        <section class="airepm-single-section">
            <h2>매물 상세 정보</h2>
            <div class="airepm-single-facts">
                <?php if ($full_location) : ?>
                    <div class="airepm-single-fact">
                        <span>위치</span>
                        <strong><?php echo esc_html($full_location); ?></strong>
                    </div>
                <?php endif; ?>
                <?php foreach ($facts as $label => $value) : ?>
                    <?php if ($value !== '') : ?>
                        <div class="airepm-single-fact">
                            <span><?php echo esc_html($label); ?></span>
                            <strong><?php echo esc_html($value); ?></strong>
                        </div>
                    <?php endif; ?>
                <?php endforeach; ?>
            </div>
        </section>

        <?php if ($description) : ?>
            <section class="airepm-single-section">
                <h2>설명</h2>
                <div><?php echo wp_kses_post(wpautop($description)); ?></div>
            </section>
        <?php endif; ?>

        <?php if (!empty($gallery_images)) : ?>
            <section class="airepm-single-section">
                <h2>갤러리</h2>
                <div class="airepm-gallery">
                    <?php foreach ($gallery_images as $gallery_image) : ?>
                        <?php
                        if (is_numeric($gallery_image)) {
                            echo wp_kses_post(wp_get_attachment_image((int) $gallery_image, 'medium_large'));
                        } else {
                            echo '<img src="' . esc_url($gallery_image) . '" alt="">';
                        }
                        ?>
                    <?php endforeach; ?>
                </div>
            </section>
        <?php endif; ?>

        <?php if ($latitude || $longitude) : ?>
            <section class="airepm-single-section">
                <h2>위치</h2>
                <div class="airepm-map-box">
                    <strong>좌표</strong>
                    <p><?php echo esc_html(trim($latitude . ', ' . $longitude, ', ')); ?></p>
                </div>
            </section>
        <?php endif; ?>

        <section id="property-inquiry" class="airepm-single-section">
            <h2>문의</h2>
            <p>이 영역에 문의 폼 플러그인 또는 테마의 상담 신청 폼을 추가할 수 있습니다. 매물 상세 페이지는 문의 폼 블록이나 숏코드를 바로 넣을 수 있도록 준비되어 있습니다.</p>
        </section>
    </main>

<?php
endwhile;

get_footer();
