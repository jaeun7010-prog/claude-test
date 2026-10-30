/** 결과 주소를 그대로 보내지 않도록 안내. 주소는 암호화되어 있어도 받는 사람이 열면 아이 정보가 보인다 */
export function AddressNote() {
  return (
    <p role="note" className="rounded-md bg-secondary p-3 text-sm break-keep">
      이 주소를 보내면 아이 정보도 함께 전달돼요. 공유는 이름 카드로 하세요.
    </p>
  );
}
