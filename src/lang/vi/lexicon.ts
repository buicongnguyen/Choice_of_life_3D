/** Vietnamese lexicon: the words used by the rules, the journal and the ending. */
import type { Life } from "../../core";
import { career, kiteName, partnered, partnerName, type Lexicon } from "../../content";

/** Careers are stored capitalised (for the journal); inside a sentence they start lower-case. */
const lc = (s: string) => s.charAt(0).toLowerCase() + s.slice(1);

const lexicon: Lexicon = {
  kite: { red: "đỏ bình minh", blue: "xanh ngọc biển", yellow: "vàng chanh" },
  career: {
    "build.city": "Kỹ sư kết cấu", "build.home": "Thợ đóng thuyền", "build.sea": "Kỹ sư máy tàu",
    "draw.city": "Nhà thiết kế", "draw.home": "Thợ làm diều", "draw.sea": "Họa sĩ minh họa rong ruổi",
    "care.city": "Bác sĩ", "care.home": "Y tá bến cảng", "care.sea": "Y sĩ tuần duyên",
  },
  ally: {
    rowan: "hợp tác xã đánh cá của Rowan", maya: "những bản vẽ của Maya", quinn: "Nghị viên Quinn",
    record: "uy tín của chính bạn", tobias: "sự nể phục bất đắc dĩ của Tobias", rally: "những người hàng xóm bạn đã vận động",
  },
  keepsake: {
    kiteTitle: (l: Life) => `Con diều ${kiteName(l)} của bạn`,
    kiteText: "Quà của bà June. Nó hiểu bạn suốt một đời.",
    medalTitle: "Huy chương đua diều thiếu nhi",
    medalText: "Nặng trĩu, thật sự, và khắc tên bạn.",
    rosetteTitle: "Chiếc nơ giải thưởng của Rowan",
    rosetteText: "Giải ba. Cậu ấy đã tặng nó cho bạn.",
    keyTitle: "Chìa khóa ngọn hải đăng",
    keyText: "“Phải có người giữ ngọn đèn sáng chứ.”",
  },
  archetype: {
    keeper: ["Người Giữ Đèn", "Cầu Tàu Cũ vẫn đứng, ngọn hải đăng vẫn quay, và thị trấn bạn yêu vẫn là thị trấn bạn yêu."],
    heart: ["Trái Tim Của Mái Nhà", "Mọi căn bếp bạn từng đứng đều chật người, ồn ã, và là của bạn."],
    wanderer: ["Kẻ Lãng Du", "Bạn đã đi khắp thế gian, và thế gian cứ mãi gửi bạn về nhà."],
    builder: ["Người Kiến Tạo", "Bạn đã dựng nên những thứ sẽ còn đứng khi bạn không còn — và mãi về sau mới biết cái giá của chúng."],
    friend: ["Người Bạn", "Có hai người đã biết bạn suốt cả đời, và lần nào cũng chọn bạn."],
    ordinary: ["Một Đời Bình Thường, Trọn Vẹn", "Không tượng đài nào cả. Chỉ có cả một thị trấn đầy những người vui vì từng có bạn."],
  },
  /** The epilogue: one line per turning point, in the order of a life. */
  endingLines: (l: Life): string[] => {
    const f = l.facts;
    const lines: string[] = [];
    lines.push(`Mọi chuyện bắt đầu với một con diều ${kiteName(l)} và một tràng cười cứ chín giây lại vang lên.`);
    lines.push(
      f.boat === "truth"
        ? "Năm bốn tuổi, bạn nói thật về một chiếc thuyền đồ chơi, và biết được niềm tin có thể lớn nhanh đến nhường nào."
        : f.boat === "confessed"
          ? "Rốt cuộc bạn cũng nói thật với Rowan về chiếc thuyền của cậu ấy. Cậu ấy vẫn luôn biết."
          : f.boat === "cat"
            ? "Ở đâu đó, một con mèo đã bị đổ oan vì chiếc thuyền nó chưa từng lấy. Nó không bao giờ tha thứ cho bạn."
            : "Bạn mang theo suốt đời một bí mật to bằng chiếc thuyền đồ chơi.",
    );
    lines.push(
      f.lunchbox === "stood"
        ? "Bạn đã đứng lên chống lại Tobias Voss dù phải trả giá, và Tobias không bao giờ quên điều đó."
        : f.lunchbox === "teacher"
          ? "Khi Maya cần giúp đỡ, bạn đã chạy đi tìm người giúp."
          : "Có lần, giữa sân trường, bạn đã cúi nhìn đôi giày của mình. Bạn mất rất lâu để bù đắp cho điều đó.",
    );
    lines.push(
      f.storm === "saved"
        ? "Đêm bão năm ấy, bạn đã lao ra cầu phao vì Rowan."
        : f.storm === "pulled"
          ? "Đêm bão năm ấy, bạn đã chọn Rowan thay vì con thuyền."
          : "Đêm bão năm ấy, bạn đã chọn tương lai của mình. Mọi chuyện hóa ra tốt đẹp; nó cũng khiến bạn mất đi một điều gì đó.",
    );
    if (f.road) lines.push(`Bạn trở thành ${lc(career(l))}${f.road === "city" ? " ở thành phố" : f.road === "sea" ? " trên biển" : " ở Kitehaven"}.`);
    if (f.pier)
      lines.push(
        f.pier === "restored"
          ? "Cầu Tàu Cũ lại đứng vững, từng tấm ván một, vì bạn đã lên tiếng cho nó."
          : f.pier === "shared"
            ? "Giờ bến cảng có cả bến du thuyền lẫn cầu tàu, nằm cạnh nhau, vì bạn đã cho ý tưởng của Maya một sân khấu."
            : f.vote === "marina"
              ? "Bến du thuyền lấp lánh nơi Cầu Tàu Cũ từng đứng. Bạn đã ủng hộ nó, và thị trấn có được việc làm."
              : "Bến du thuyền lấp lánh nơi Cầu Tàu Cũ từng đứng. Bạn đã đấu tranh cho cầu tàu và thua, và Rowan vẫn nhớ rằng bạn đã cố.",
      );
    lines.push(partnered(l) ? `Bạn đã xây nên một cuộc đời cùng ${partnerName(l)}${f.dream === "backed" ? ", và ủng hộ giấc mơ của người ấy đến tận cùng" : ""}.` : "Bạn bè chính là gia đình của bạn, và thế là đủ.");
    if (f.care) lines.push(f.care === "home" ? "Khi mẹ cần bạn, bạn đã đưa mẹ về nhà." : f.care === "shared" ? "Khi mẹ cần bạn, bạn đã không phải gánh vác một mình." : "Khi mẹ cần người chăm sóc, bạn đã trả tiền cho nơi tốt nhất bạn tìm được, và đến thăm vào mỗi Chủ nhật.");
    if (f.shop) lines.push(f.shop === "reopened" ? "Cửa hàng diều của bố lại có những chiếc mũi trẻ con dí sát vào ô kính." : f.shop === "given" ? "Giờ Pip trông coi cửa hàng diều, theo một cách bạn không hoàn toàn hiểu nổi." : "Bạn đã bán cửa hàng và gửi bưu thiếp về nhà từ mọi bến cảng.");
    lines.push(
      f.final === "rowan"
        ? "Ở lễ hội cuối cùng, bạn cùng Rowan giữ sợi dây diều."
        : f.final === "partner"
          ? `Ở lễ hội cuối cùng, bạn cùng ${partnerName(l)} giữ sợi dây diều.`
          : f.final === "pip"
            ? "Ở lễ hội cuối cùng, bạn trao sợi dây diều vào tay Pip."
            : f.final === "maya"
              ? "Ở lễ hội cuối cùng, Maya giảng giải cho bạn về con diều của bạn, sai bét."
              : "Ở lễ hội cuối cùng, bạn mở bàn tay và để con diều bay đi.",
    );
    const st = l.stats;
    lines.push(
      st.health >= 60 ? "Đến cuối đời bạn vẫn còn leo con đường trên vách đá, và vờ như chuyện đó dễ ợt." : st.health >= 30 ? "Cơ thể bạn ghi nhớ từng cơn bão và từng giờ làm thêm, và bạn đã học được cách nghỉ ngơi." : "Cuối đời bạn yếu đi nhiều, mà vẫn là chính mình, mãnh liệt như xưa.",
    );
    lines.push(st.joy >= 65 ? "Phần lớn thời gian, bạn đã hạnh phúc. Bạn nhận ra điều đó ngay khi nó đang diễn ra — chuyện hiếm hơn người ta tưởng nhiều." : st.joy >= 40 ? "Bạn có phần mình những ngày xám xịt, và phần mình những cánh diều." : "Có những năm thật khó mà thương nổi. Bạn vẫn mang chúng theo.");
    return lines;
  },
};
export default lexicon;
