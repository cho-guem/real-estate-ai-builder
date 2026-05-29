# AI Real Estate Property Manager

AI로 생성한 부동산 웹사이트를 위한 워드프레스 매물 관리 플러그인입니다. 고객은 ACF를 설치하거나 커스텀 필드를 직접 만들 필요 없이 워드프레스 관리자에서 공장, 창고, 토지, 상업용 매물을 바로 등록하고 관리할 수 있습니다.

## 주요 기능

- `property` 커스텀 포스트 타입 등록
- ACF가 설치되어 있으면 매물 표준 필드 그룹 자동 등록
- ACF가 없어도 동작하는 워드프레스 기본 관리자 입력 UI 제공
- 모든 매물 정보를 기본 post meta로 저장
- `[property_search]`, `[property_list]` 숏코드 제공
- 지역 전용 검색을 위한 `[property_location_search]` 숏코드 제공
- 지도 영역을 위한 `[property_map]` 숏코드 제공
- 한국형 계층 지역 검색, 거래유형, 매물유형, 가격 범위, 면적 범위 필터 지원
- `/region/창원시/`, `/region/성산구/`, `/region/상남동/` 같은 SEO 친화적 지역 URL 지원
- 카드형 매물 목록과 플러그인 기본 매물 상세 템플릿 제공
- Elementor Loop Grid에서 `property` post type 선택 가능
- Elementor Query ID `airepm_properties`, `airepm_featured_properties` 지원
- 테마에 종속되지 않는 플러그인 방식

## 설치 방법

1. 워드프레스 관리자 > 플러그인 > 새로 추가 > 플러그인 업로드에서 `ai-real-estate-property-manager.zip`을 업로드합니다.
2. 플러그인을 활성화합니다.
3. 플러그인 활성화 시 `매물 상세` 페이지와 샘플 매물 3개가 자동으로 생성됩니다.
4. 매물 관리 > 새 매물 추가로 이동해 실제 매물을 추가하거나 샘플 매물을 수정합니다.
5. 생성된 `매물 상세` 페이지를 확인합니다.

ACF가 설치된 사이트에서는 `매물 표준 필드` 그룹이 자동으로 표시됩니다. ACF가 없는 사이트에서는 플러그인 기본 메타박스가 표시되므로 별도 필드 생성 작업 없이 바로 사용할 수 있습니다.

## 관리자 설정 마법사

플러그인은 활성화 시 기본 자동 설정을 실행하며, 관리자에서 `매물 관리 > 초기 설정` 마법사를 통해 다시 실행할 수 있습니다.

설정 단계:

1. 사업 유형
2. 회사명
3. 메인 컬러
4. 주요 지역
5. 사이트 자동 생성

설정값은 `wp_options`에 저장됩니다.

자동 생성 항목:

- `매물 상세` 페이지 생성
- 페이지 본문에 `[property_search]`, `[property_list]`, `[property_map]` 자동 삽입
- 홈페이지 생성 및 Front Page 설정
- 기본 메뉴 생성
- SEO 제목 자동 생성
- Elementor-ready HTML 섹션 생성
- 샘플 블로그 글 3개 생성
- 샘플 매물 3개 생성
- 샘플 매물의 지역, 거래유형, 매물유형, 면적, 가격, 설명 meta 자동 저장

설정 마법사는 idempotent 방식으로 동작합니다. 같은 페이지, 메뉴, 샘플 글, 샘플 매물이 이미 있으면 중복 생성하지 않고 기존 데이터를 덮어쓰지 않습니다.

초기 설정을 다시 실행하려면 워드프레스 관리자에서 `매물 관리 > 초기 설정`으로 이동한 뒤 `사이트 자동 생성 / 다시 실행` 버튼을 클릭하세요.

## 매물 필드

플러그인은 아래 필드를 워드프레스 기본 post meta로 저장합니다.

- 워드프레스 기본 제목: 매물 상세/목록의 기본 title
- `property_title`
- `transaction_type`: `sale` 또는 `rent`
- `property_type`: `factory`, `warehouse`, `land`, `commercial`
- `province`, 예: `경남`
- `city`, 예: `창원시`
- `district`, 예: `성산구`
- `town`, 예: `상남동`
- `region`
- `address`
- `price`
- `area`
- `land_area`
- `building_area`
- `power_capacity`
- `ceiling_height`
- `parking`
- `road_width`
- `available_date`
- `move_in_date` 기존 데이터 호환용
- `description`
- `latitude`
- `longitude`
- `featured_image`
- `gallery_images`
- `is_featured`

## 숏코드

### 검색 폼만 표시

필터 검색 폼만 표시하려면 페이지에 아래 숏코드를 추가합니다. 매물 카드는 출력하지 않습니다.

```text
[property_search]
```

### 매물 목록만 표시

검색 폼 없이 매물 카드만 표시하려면 아래 숏코드를 사용합니다.

```text
[property_list]
```

### 지역 검색만 표시

도·광역시, 시, 구·군, 읍·면·동 필터만 표시하려면 아래 숏코드를 사용합니다. 매물 카드는 출력하지 않습니다.

```text
[property_location_search]
```

### 지도 영역 표시

좌표가 입력된 매물을 지도 영역에 연결하려면 아래 숏코드를 사용합니다.

```text
[property_map]
```

현재 기본 출력은 지도 API 연결 전 placeholder와 좌표 목록입니다. Google Maps, Kakao Maps, Naver Maps 중 사용하는 API 스크립트를 테마나 별도 플러그인에서 연결하면 실제 지도 렌더링으로 확장할 수 있습니다.

## AI 생성 WordPress 패키지 업로드 순서

1. AI Website Builder에서 받은 `wordpress-site-package-fixed.zip` 압축을 로컬에서 풉니다.
2. WordPress 관리자 > 플러그인 > 새로 추가 > 플러그인 업로드에서 `ai-real-estate-property-manager-fixed.zip`을 업로드하고 활성화합니다.
3. 플러그인 활성화 후 `매물 관리 > 초기 설정`에서 자동 생성 결과를 확인합니다.
4. Elementor > Templates > Import Templates에서 `elementor-template-fixed.json`을 가져옵니다.
5. 새 페이지를 만들고 가져온 Elementor 템플릿을 적용합니다.
6. 페이지 안의 쇼트코드 구조가 아래 순서인지 확인합니다.

```text
[property_search]
[property_list]
[property_location_search]
[property_map]
```

`[property_search]`와 `[property_location_search]`는 폼만 출력하고, 매물 카드 HTML은 `[property_list]`에서만 출력됩니다.

## Elementor Loop Grid 호환

Elementor Pro Loop Grid 또는 Posts 위젯에서 Source/Post Type을 `property`로 선택하면 매물 CPT를 바로 사용할 수 있습니다.

추천 설정:

- Post Type: `property`
- 정렬: 최신순 또는 가격순 커스텀 쿼리
- Featured Image: 워드프레스 특성 이미지
- Title: 매물 제목
- Excerpt 또는 Dynamic Tag: 매물 설명

Elementor Query ID를 사용하는 경우:

```text
airepm_properties
```

전체 매물을 최신순으로 불러옵니다.

```text
airepm_featured_properties
```

`is_featured = 1`로 저장된 추천 매물만 불러옵니다.

## 검색 필터

`[property_search]` 숏코드는 아래 필터를 지원합니다.

- 도·광역시
- 시
- 구·군
- 읍·면·동
- 기존 지역
- 거래유형
- 매물유형
- 최저 가격
- 최고 가격
- 최소 면적
- 최대 면적

지역 드롭다운은 저장된 매물 meta를 기준으로 함께 작동합니다. 예를 들어 `창원시`를 선택하면 `city = 창원시`로 저장된 매물만 표시되고, `성산구`를 선택하면 `district = 성산구`, `상남동`을 선택하면 `town = 상남동` 매물만 표시됩니다.

거래유형은 `sale`, `rent`, 매물유형은 `factory`, `warehouse`, `land`, `commercial` 값을 기준으로 필터링됩니다. 가격과 면적은 숫자 meta 값으로 저장되어 범위 검색에 사용됩니다.

## SEO 친화적 지역 URL

플러그인은 지역별 매물 목록 URL을 제공합니다.

```text
/region/{location}/
```

예시:

```text
/region/창원시/
/region/성산구/
/region/상남동/
```

이 URL은 하위 호환성을 위해 `province`, `city`, `district`, `town`, 기존 `region` 필드를 함께 검색합니다.

플러그인을 활성화하거나 업그레이드한 뒤 `/region/` URL이 바로 열리지 않으면 워드프레스 관리자 > 설정 > 고유주소에서 변경사항 저장을 한 번 클릭하세요.

## 이미지

대표 이미지는 워드프레스 기본 특성 이미지를 사용할 수 있습니다. `featured_image` 필드에는 외부 이미지 URL 또는 첨부파일 ID를 저장할 수 있고, `gallery_images` 필드는 쉼표로 구분한 이미지 URL 또는 첨부파일 ID를 지원합니다.

## 매물 상세 페이지

플러그인은 `templates/single-property.php` 매물 상세 템플릿을 포함합니다. 테마 개발자는 활성 테마에 `single-property.php`를 추가해 이 템플릿을 덮어쓸 수 있습니다.

기본 상세 페이지에는 아래 정보가 표시됩니다.

- 대표 이미지
- 가격
- 면적
- 주소
- 설명
- 주요 제원
- 문의 버튼 영역

## 참고

- ACF 설정이 필요 없습니다.
- 데이터는 워드프레스 기본 post meta에 저장되어 이전과 관리가 쉽습니다.
- 활성화 시 `/properties/` URL을 위해 워드프레스 rewrite rule을 자동으로 갱신합니다.
