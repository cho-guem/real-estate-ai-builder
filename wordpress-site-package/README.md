# WordPress 사이트 패키지 설치 안내

## 구성 파일

- elementor-template.json: Elementor Container 기반 랜딩페이지 템플릿
- ai-real-estate-property-manager.zip: 매물 관리, 검색, 목록, 지도 placeholder 플러그인
- README.md: 설치 안내

## 업로드 순서

1. WordPress 관리자에 로그인합니다.
2. 플러그인 > 새로 추가 > 플러그인 업로드에서 ai-real-estate-property-manager.zip을 업로드하고 활성화합니다.
3. 매물 관리 > 초기 설정에서 자동 생성 페이지와 샘플 매물을 확인합니다.
4. Elementor > Templates > Import Templates에서 elementor-template.json을 가져옵니다.
5. 새 페이지를 만들고 가져온 템플릿을 적용합니다.
6. Elementor 페이지 안의 쇼트코드 순서가 아래와 같은지 확인합니다.

```text
[property_search]
[property_list]
[property_location_search]
[property_map]
```

## 쇼트코드 역할

- [property_search]: 검색 폼만 출력
- [property_list]: 매물 카드 목록만 출력
- [property_location_search]: 지역 검색 폼만 출력
- [property_map]: 지도 placeholder와 좌표 목록 출력

## Elementor 구조

템플릿은 최신 Elementor에서 편집하기 쉬운 Container 기반 구조입니다.
섹션 순서는 Hero, Trust Points, Recommended Property Cards, Property Search & List, Location Map Review, Consultation CTA/Form, Footer입니다.
