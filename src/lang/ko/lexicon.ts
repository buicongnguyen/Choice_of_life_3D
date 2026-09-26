import type { Life } from "../../core";
import { kiteName, career, partnered, partnerName, type Lexicon } from "../../content";
import { iga, wa } from "./josa";

const lexicon: Lexicon = {
  // Kite colours read as adjectives: “해돋이빛 빨간 연”.
  kite: { red: "해돋이빛 빨간", blue: "바다유리빛 파란", yellow: "레몬빛 노란" },
  career: {
    "build.city": "구조 엔지니어", "build.home": "배 목수", "build.sea": "선박 기관사",
    "draw.city": "디자이너", "draw.home": "연 장인", "draw.sea": "여행 일러스트레이터",
    "care.city": "의사", "care.home": "항구 간호사", "care.sea": "해경 응급구조사",
  },
  ally: {
    rowan: "로완의 어업 협동조합", maya: "마야의 설계도", quinn: "퀸 의원",
    record: "떳떳하게 살아온 지난날", tobias: "토비아스의 마지못한 존경", rally: "직접 불러 모은 이웃들",
  },
  keepsake: {
    kiteTitle: (l: Life) => `${kiteName(l)} 연`,
    kiteText: "준 할머니의 선물. 평생 당신을 알아봐 주었다.",
    medalTitle: "어린이 연 경주 메달",
    medalText: "묵직하고, 진짜이고, 당신 이름이 새겨져 있다.",
    rosetteTitle: "로완의 입상 리본",
    rosetteText: "3등. 로완이 당신에게 건네주었다.",
    keyTitle: "등대 열쇠",
    keyText: "“누군가는 불을 밝혀 둬야지.”",
  },
  archetype: {
    keeper: ["빛을 지킨 사람", "옛 부두는 서 있고, 등대는 돌고, 당신이 사랑한 마을은 여전히 당신이 사랑한 그 마을이다."],
    heart: ["집의 심장", "당신이 서 있던 부엌은 언제나 북적이고, 시끄럽고, 당신의 것이었다."],
    wanderer: ["방랑자", "세상을 보았고, 세상은 자꾸만 당신을 집으로 돌려보냈다."],
    builder: ["짓는 사람", "당신보다 오래 남을 것들을 지었다. 그리고 뒤늦게, 그 대가가 무엇이었는지 배웠다."],
    friend: ["친구", "두 사람이 평생 당신을 알았고, 매번 빠짐없이 당신을 택했다."],
    ordinary: ["온전하고 평범한 인생", "기념비는 없다. 당신이 있어서 다행이었다고 여기는 사람들로 가득한 마을이 있을 뿐."],
  },
  /** The epilogue: one line per turning point, in the order of a life (same logic as the English). */
  endingLines: (l: Life): string[] => {
    const f = l.facts;
    const lines: string[] = [];
    lines.push(`모든 것은 ${kiteName(l)} 연 하나와, 구 초마다 터지던 웃음에서 시작되었다.`);
    lines.push(
      f.boat === "truth"
        ? "네 살 때 장난감 배에 대해 사실대로 말했고, 믿음이 얼마나 빨리 자랄 수 있는지 배웠다."
        : f.boat === "confessed"
          ? "결국 로완에게 그 배의 진실을 털어놓았다. 로완은 처음부터 알고 있었다."
          : f.boat === "cat"
            ? "어딘가에는 가져가지도 않은 배 때문에 누명을 쓴 고양이가 있었다. 그 고양이는 끝내 당신을 용서하지 않았다."
            : "장난감 배만 한 비밀을 평생 품고 살았다.",
    );
    lines.push(
      f.lunchbox === "stood"
        ? "대가를 치르면서도 토비아스 보스에게 맞섰고, 그는 그 일을 평생 잊지 않았다."
        : f.lunchbox === "teacher"
          ? "마야에게 도움이 필요했을 때, 달려가서 도움을 데려왔다."
          : "한번은 운동장에서 신발 끝만 내려다보았다. 그 일을 만회하는 데 오랜 세월이 걸렸다.",
    );
    lines.push(
      f.storm === "saved"
        ? "폭풍이 치던 밤, 로완을 위해 부잔교로 나갔다."
        : f.storm === "pulled"
          ? "폭풍이 치던 밤, 배 대신 로완을 택했다."
          : "폭풍이 치던 밤, 당신은 미래를 택했다. 결과는 좋았다. 대가도 있었다.",
    );
    if (f.road) lines.push(`${f.road === "city" ? "도시에서" : f.road === "sea" ? "바다 위에서" : "카이트헤이븐에서"} ${iga(career(l))} 되었다.`);
    if (f.pier)
      lines.push(
        f.pier === "restored"
          ? "당신이 목소리를 내 준 덕분에, 옛 부두는 널빤지 하나하나 다시 일어섰다."
          : f.pier === "shared"
            ? "마야의 구상에 무대를 마련해 준 덕분에, 이제 항구에는 마리나와 부두가 나란히 있다."
            : f.vote === "marina"
              ? "옛 부두가 있던 자리에 마리나가 반짝인다. 당신은 마리나를 지지했고, 마을은 일자리를 얻었다."
              : "옛 부두가 있던 자리에 마리나가 반짝인다. 부두를 위해 싸웠고 졌지만, 로완은 당신이 애썼다는 걸 기억한다.",
      );
    lines.push(
      partnered(l)
        ? f.dream === "backed"
          ? `${wa(partnerName(l))} 함께 삶을 일구었고, 그 꿈을 끝까지 밀어주었다.`
          : `${wa(partnerName(l))} 함께 삶을 일구었다.`
        : "친구들이 곧 가족이었고, 그걸로 충분했다.",
    );
    if (f.care) lines.push(f.care === "home" ? "엄마가 당신을 필요로 했을 때, 엄마를 집으로 모셨다." : f.care === "shared" ? "엄마가 당신을 필요로 했을 때, 혼자 짊어지지 않았다." : "엄마에게 돌봄이 필요했을 때, 찾을 수 있는 가장 좋은 곳에 모시고 일요일마다 찾아갔다.");
    if (f.shop) lines.push(f.shop === "reopened" ? "아빠의 연 가게 유리창에 다시 아이들의 코가 납작하게 눌려 붙는다." : f.shop === "given" ? "이제 연 가게는 핍이 꾸려 간다. 당신으로서는 다 알 수 없는 방식으로." : "가게를 팔고, 들르는 항구마다 집으로 엽서를 보냈다.");
    lines.push(
      f.final === "rowan"
        ? "마지막 축제에서, 로완과 함께 연줄을 잡았다."
        : f.final === "partner"
          ? `마지막 축제에서, ${wa(partnerName(l))} 함께 연줄을 잡았다.`
          : f.final === "pip"
            ? "마지막 축제에서, 연줄을 핍의 손에 쥐여 주었다."
            : f.final === "maya"
              ? "마지막 축제에서, 마야가 당신의 연이 나는 원리를 설명해 주었다. 전부 틀리게."
              : "마지막 축제에서, 두 손을 펴고 연을 날려 보냈다.",
    );
    const st = l.stats;
    lines.push(
      st.health >= 60 ? "마지막까지 절벽 길을 걸었고, 하나도 힘들지 않은 척했다." : st.health >= 30 ? "몸은 폭풍과 야근을 하나하나 헤아려 두었고, 당신은 쉬는 법을 배웠다." : "마지막에는 몸이 쇠약했지만, 누구보다 당신다웠다.",
    );
    lines.push(st.joy >= 65 ? "대체로 행복했다. 행복이 일어나는 동안 그걸 알아차렸다. 생각보다 드문 일이다." : st.joy >= 40 ? "잿빛 날들도 제 몫만큼, 연을 날린 날들도 제 몫만큼 있었다." : "사랑하기 힘든 해들도 있었다. 그래도 그 해들을 짊어지고 걸었다.");
    return lines;
  },
};

export default lexicon;
