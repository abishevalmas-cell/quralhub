# 17VIN API: что известно

Сводка на 20.10.2026. Официальная документация (en.17vin.com/doc.html) из среды разработки не открывалась; методы собраны по фрагментам официального указателя, сторонним клиентам и собственному тесту Tetix 12.10.2026. Статус: confirmed — видели в цитируемом источнике или в нашем тесте; likely — косвенно.

Подпись каждого запроса: `token = md5(md5(user) + md5(password) + путь_с_запросом)`, затем `&user=...&token=...`. Хосты: `https://api.17vin.com:8443` (HTTPS), `http://api.17vin.com:8080`. Ответ всегда `{code, msg, data}`.

| Метод | Назначение | Запрос | Статус |
|---|---|---|---|
| 1001 / 1002 / 1003 (doc sections) | Account: 1001 account opening, 1002 balance check (action=myapicount), 1003 login and token instructions | `GET /?action=myapicount&user={user}&token={token}. Token for every call = md5( md5(user) + md5(password) + <path+query before &user=> ). Hosts: http://api.17vin.com:8080 or https://api.17vin.com:8443` | confirmed |
| 2001-2004 (doc sections) | Interaction rules: 2001 request port and method, 2002 global status codes, 2003 JSON upgrade compatibility, 2004 image URL description | `Mostly GET; OCR methods use POST. Ports 8080 (HTTP) and 8443 (HTTPS)` | confirmed |
| 3001 | VIN decode (VIN码查车型) | `GET /?vin={VIN}[&gonggao_no=...]&user=&token=  (Tetix: path17('',[['vin',VIN]]))` | confirmed |
| 3002 / 3003 | VIN OCR from an image / OCR plus decode | `POST with a base64+urlencoded image (4MB max, 15-4096px, jpg/png/bmp)` | confirmed |
| 4001 | Part search by OE or brand part number across all EPCs (action=search_epc). No VIN needed | `GET /?action=search_epc&query_part_number={pn}&query_match_type=exact\|inexact\|smart(default)` | confirmed |
| 4002 | Search Part EPC Illustration via OE Number (action=search_illustration) | `GET /{epc}?action=search_illustration&query_part_number={pn}` | confirmed |
| 40031 | Applicable vehicles for a part number, full-vehicle parts (通过配件号获取适用车型【全车件】). This is the OE-to-vehicle fitment method | `GET /?action=get_modellist_from_part_number_and_group_id&part_number={pn}&group_id={Group_id from 4001}` | confirmed |
| 40032 | Applicable vehicles for a part number, wear and aftermarket parts (【易损件】) | `GET /?action=get_modellist_from_part_number_and_group_id_for_aftermarket&part_number=&group_id=&based_on=engine\|transmission` | confirmed |
| 4004 | Retrieve replacement and interchange numbers via brand or OE number | `GET /?action=get_interchange_from_part_number_and_group_id_plus_zh&part_number=&group_id=` | confirmed |
| 4005 | Get Part List for Illustration in EPC (action=illustration) | `GET /{epc}?action=illustration&cata_code={cata_code from 4002}` | confirmed |
| 4006 | Get 4S Store Price via OE Number (action=price) | `GET /?action=price&partnumber={pn}` | confirmed |
| 40071 / 40072 / 40073 | Private endpoints for brand owners and authorized dealers. 40071 aftermarket_private_part_search; 40072 applicable vehicles by part number (private); 40073 part info plus applicable vehicles | `40071: GET /?action=aftermarket_private_part_search&manufacturer_brand=&query_part_number=&query_match_type=` | confirmed |
| 5101 | Get Primary Category List via VIN (action=cata1) | `GET /{epc}?action=cata1&vin={VIN}[&is_vin_filter_open=1\|0][&epc_id=][&js_id=]. epc comes from 3001/3002/3003. epc_id and js_id are optional, so a trim does not have to be chosen` | confirmed |
| 5102 | Get Secondary Category List via VIN (action=cata2) | `GET\|POST /{epc}?action=cata2&vin={VIN}&cata1_code={from 5101}[&is_vin_filter_open][&epc_id][&js_id]` | confirmed |
| 5103 | Third-level category list via VIN (action=cata3) | `GET /{epc}?action=cata3&vin={VIN}&cata2_code={from 5102}` | confirmed |
| 5104 | Fourth-level category list via VIN (action=cata4) | `GET /{epc}?action=cata4&vin={VIN}&cata3_code={from 5103}` | likely |
| 5105 | Get Part List via VIN (action=part) | `GET /{epc}?action=part&vin={VIN}&last_cata_code={code}&last_cata_code_level={1\|2\|3}[&epc_id]` | confirmed |
| 5106 | Search part number within one VIN's catalog (action=search_part_number) | `GET /{epc}?action=search_part_number&vin={VIN}&query_match_type=exact&query_part_number={pn}` | confirmed |
| 5107 / 5108 | Search OE part name / 17VIN standard part name via VIN | `GET /{epc}?action=search_epc_part_name\|search_std_part_name&vin=&query_match_type=&query_part_name={base64 if non-ASCII}` | confirmed |
| 5109 | Get All OE Part Numbers via VIN (action=all_part_number) | `GET /{epc}?action=all_part_number&vin={VIN} (a third party uses a 60 s timeout)` | confirmed |
| 5110 / 5111 / 5112 | All OEM part names via VIN / all 17VIN standard part names via VIN / search suggestions via VIN | `GET /{epc}?action=all_epc_part_name\|all_std_part_name&vin= ; /{epc}?action=search_suggest&vin=&suggest_key=` | confirmed |
| 6001-6005, 6101-6106 | Full-vehicle parts by vehicle model, no VIN (车型查全车件). 6001 brand list, 6002 series list, 6003 model list, 6004 model detail, 6005 fuzzy model search, 6101/6102... category levels, 6105 part list, 6106 part-number search | `Not found` | likely |
| 7001 | Maintenance and aftermarket parts by VIN (VIN码查保养件, action=aftermarket_vin). Takes only a VIN, no EPC path | `GET\|POST /?action=aftermarket_vin&vin={VIN}&manufacturer_brand={e.g. 博世 (Bosch)}[&category={滤清器 (filters)\|刹车片 (brake pads)}]. Sources disagree on whether manufacturer_brand is required` | confirmed |
| 7002 | VIN OCR plus maintenance parts (action=vin_ocr_and_aftermarket_vin_decode) | `POST action=vin_ocr_and_aftermarket_vin_decode&manufacturer_brand=&base64_urlencode_imagestring=[&category=]` | confirmed |
| 8001-8003 | Maintenance parts by vehicle model (车型查保养件): brand list, series list, model list | `Not found` | likely |

## Коды ответа

Global status codes (doc section 2002). The table below comes from two independent transcriptions of the docs: the rouge2203/endpointsApisRemusa 17VIN_API_ANALYSIS.md status table, and Tetix app/provider17.ts normalize17(), which was written 'по документации' (from the docs). I could not open the official 2002 page. Mark: confirmed via quoted sources.
- 1 = success, data returned.
- 0 = 'No data / Unknown error'. Tetix: cata1 returned 0 for all 5 Li Auto VINs (e.g. HLX…6449, HLX…1453). Their 3001 decode had epc='lixiang', epc_id='0', matching_mode='in_exact_match'. A third party also got code 0 'No Standardize vehicle results found' on 3001 for an undecodable VIN. In practice: the method ran, but no catalog data exists for this vehicle in that EPC. For lixiang this fits the supplier's note that Li Auto data is still to launch (November, models up to 2024).
- 1001 = invalid request (parameters).
- 1002 = authentication required.
- 1003 = 'Unsupported brand'. Tetix: cata1 returned 1003 for both Zeekr VINs (L6T…9969, L6T…8792), with epc='zeekr' and epc_id='0'. The EPC methods do not support this brand key at all. This matches the supplier's 'по Zeekr источник данных отсутствует' (no data source for Zeekr).
- 1004 = permission denied, invalid token.
- 1005 = permission denied, quota used up or account expired. Expect this after the trial ends on 2026-10-28.
- 1006 = 'Internal server error' per the table. But Tetix saw 1006 with msg 'query no result' from 4006 price for 3 of 4 OE numbers. So for price, 1006 in practice means no record found. Neither the doc nor the observed behaviour supports reading it as a zero price.
- 1007 = interface not available (under development).
Do not confuse response code 1003 with doc section 1003 (login and token instructions), or 1002 with doc section 1002 (balance, action=myapicount).

## Li Auto и Zeekr

- Расшифровка VIN (3001) работает: 15 из 15 тестовых VIN.
- Каталог (5101–5105 = `cata1`, `cata2`, `cata3`, `part`) для Li Auto вернул code 0, для Zeekr code 1003.
- Признак: у всех 7 таких VIN расшифровка вернула `epc_id = "0"` и `matching_mode = in_exact_match`; у всех 8 VIN с каталогом — ненулевой `epc_id` и `exact_match`. Это наблюдение на 15 VIN, поставщик его не подтверждал. В продукте используем его только как предупреждение «каталог, вероятно, недоступен» и направляем заявку в ручной подбор; запрос каталога не блокируем.
- Поставщик (12.10.2026): Li Auto запускают в ноябре для моделей до 2024 года (2024 не подтверждён); источника данных по Zeekr нет.
- 4S-цены (4006) устарели примерно на 2 года — в продукте не используются.

## Что нужно адаптеру

- Поддержать 4-й уровень каталога (`cata4` + `cata3_code`, метод 5104 — существование не подтверждено) и `last_cata_code_level` до 4.
- Сохранять исходный `msg` поставщика и шаблон пути (VIN маскируется) в журнале вызовов.
- Код 1006 с `msg = query no result` трактовать как «нет данных», а не как ошибку сервера.
- Методы-кандидаты для следующих этапов: 5106 (номер есть в каталоге этого VIN → статус «Подходит по VIN»), 5109 (все номера по VIN), 40031 (машины по номеру), 4004 (замены и аналоги), 7001 (детали ТО по VIN), 3002/3003 (VIN с фото).

## Источники

- https://en.17vin.com/doc.html (official API index; search snippets only, the domain is blocked here)
- https://en.17vin.com/doc/5102.html (official 5102 page; search snippets: epc from 3001/3002/3003, cata1_code from 5101, is_last flow to 5105, is_vin_filter_open)
- https://www.17vin.com/doc.html (Chinese index; snippets for 5101-5106, 6001-6005/6101-6106, 7001/7002, 8001-8003, 40031/40032/40072/40073)
- https://www.17vin.com/doc/3001.html (3001 snippets: epc '请求配件数据需要此参数', epc_id, matching_mode)
- https://en.17vin.com/doc/3003.html (OCR+decode)
- https://en.17vin.com/api.html and https://en.17vin.com/faq.html (API activation by customer service, charging per successful result, repeat queries within 3 months free, matching_mode reliability)
- https://www.17vin.com/ (homepage '热门EPC品牌' list incl. Li Auto; snippet)
- https://www.17vin.com/series/93MG4.html (Li Auto L6 series: '无配件目录' for 2024 Pro/Max; snippet)
- https://www.17vin.com/series/xbj1d.html (Zeekr 009 series: '无配件目录' for several trims; snippet)
- https://www.17vin.com/brand/lixiang.html and https://www.17vin.com/brand/zeekr.html (generic brand pages)
- https://raw.githubusercontent.com/rouge2203/endpointsApisRemusa/main/api_analysis/17VIN_API_ANALYSIS.md (third-party transcription: status-code table, method numbers 1002-5112, request formats)
- https://raw.githubusercontent.com/rouge2203/endpointsApisRemusa/main/scripts/plate_to_17vin.py and SistemaRemusa.py (working client code with field names)
- https://raw.githubusercontent.com/cdofenghost/mech_parts/main/backend/routers/car_parser.py (client code incl. cata4/5104, 7001 aftermarket_vin, 40071)
- https://raw.githubusercontent.com/DIMO-Network/device-definitions-api/main/internal/infrastructure/gateways/japan_17vin_api.go (token algorithm, 3001 fields)
- https://zhuanlan.zhihu.com/p/677785730 (7001 VIN码查保养件; snippets only)
- https://zhuanlan.zhihu.com/p/679012557 (7002; snippets only)
- Local: /tmp/claude-0/-home-user-quralhub/9088ab58-3072-50fd-bc85-47f48fc8c8c7/scratchpad/tetix/tetix/app/provider17.ts
- Local: /tmp/claude-0/-home-user-quralhub/9088ab58-3072-50fd-bc85-47f48fc8c8c7/scratchpad/tetix/tetix/app/api-lab.ts
- Local: /tmp/claude-0/-home-user-quralhub/9088ab58-3072-50fd-bc85-47f48fc8c8c7/scratchpad/tetix/tetix/app/reference17.ts (epc / epc_id / matching_mode per test VIN)
- Local: /tmp/claude-0/-home-user-quralhub/9088ab58-3072-50fd-bc85-47f48fc8c8c7/scratchpad/tetix/tetix/docs/17VIN-TEST-RESULTS.md
- Local: /tmp/claude-0/-home-user-quralhub/9088ab58-3072-50fd-bc85-47f48fc8c8c7/scratchpad/tetix/tetix/START-HERE-RU.md
