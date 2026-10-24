-- 궉씨(鴌): 사전에는 "봉" 읽기만 있어 성씨 표(통계청 2015, 궉 183명)에서 빠졌다. 성씨 자리 전용 읽기를 더한다 (2026-10-24 사용자 결정).
-- is_name_hanja = false: 이름 후보(fetchByEum)에는 나오지 않고, 성씨 조회(fetchSurname)에서만 쓴다.
insert into public.hanja_dict (hanja, eum, meaning, stroke_count, radical, element, is_forbidden, forbidden_reason, is_edu, is_name_hanja, hun)
values ('鴌', '궉', null, 15, '鳥', null, false, null, false, false, '성')
on conflict (hanja, eum) do nothing;
