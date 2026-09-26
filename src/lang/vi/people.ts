/** Vietnamese names, roles, barks and first-meeting lines for the people of Kitehaven. */
import type { Life } from "../../core";
import type { OverlayText } from "../../localize";
import { pipIsYours } from "../../content";

const people: Record<string, OverlayText> = {
  "p.nana.name": "Bà June",
  "p.nana.role": () => "Giữ ngọn hải đăng suốt bốn mươi năm",
  "p.nana.bark": () => "“Một trăm mười hai bậc mới lên tới đỉnh ngọn hải đăng ấy. Đêm nào bà cũng đếm, suốt bốn mươi năm.”",
  "p.mum.name": "Mẹ",
  "p.mum.role": (l: Life) => (l.chapter >= 8 ? "Vẫn sắc sảo hơn cả ô chữ" : "Y tá bến cảng, lúc nào cũng mệt"),
  "p.mum.bark": () => "“Con ăn gì chưa? Trông con như chưa ăn gì ấy.”",
  "p.dad.name": "Bố",
  "p.dad.role": () => "Làm diều bằng tay, bán diều bằng sự bướng bỉnh",
  "p.dad.bark": () => "“Giấy, tre, hồ dán và kiên nhẫn. Kiên nhẫn là thứ đắt nhất.”",
  "p.rowan.name": "Rowan",
  "p.rowan.role": (l: Life) =>
    l.chapter < 4 ? "Cậu bé bên kia lỗ hổng hàng rào" : l.chapter < 9 ? "Ngư dân, bạn thân, cứng đầu" : "Người bạn lâu năm nhất của bạn",
  "p.rowan.bark": (l: Life) =>
    l.bonds.rowan >= 3 ? "“Cậu đây rồi. Tốt. Tớ đang định một mình làm chuyện ngốc nghếch.”" : "“Ồ. Chào cậu.” Rowan trông như muốn nói thêm, rồi lại thôi.",
  "p.maya.name": "Maya",
  "p.maya.role": (l: Life) => (l.chapter < 5 ? "Cô bạn mới có hộp cơm tên lửa" : "Vẽ những tòa nhà không tưởng, rồi xây chúng lên"),
  "p.maya.bark": () => "“Thứ gì người ta bảo không làm nổi, chỉ là chưa được xây cho đúng cách thôi.”",
  "p.lin.name": "Cô Lin",
  "p.lin.role": () => "Một cô giáo biết để ý",
  "p.lin.bark": () => "“Cứ từ từ thôi em. Một câu hỏi hay đáng được trả lời chậm rãi.”",
  "p.tobias.name": "Tobias Voss",
  "p.tobias.role": (l: Life) =>
    l.chapter < 5 ? "Chưa từng bị ai nói không" : l.chapter < 9 ? "Người thừa kế Tập đoàn Cảng Voss" : "Điều hành Tập đoàn Cảng Voss, chẳng mấy hào hứng",
  "p.tobias.bark": (l: Life) =>
    l.facts.lunchbox === "stood" ? "“Cậu là đứa bị xô ngã mãi vẫn đứng dậy.” Nghe gần như là nể phục." : "Tobias nhìn xuyên qua bạn, như xưa nay vẫn thế.",
  "p.sam.name": "Sam",
  "p.sam.role": () => "Sếp của bạn, công bằng và kiệt sức",
  "p.sam.bark": () => "“Cà phê trước đã. Rồi mới cứu thế giới. Rồi lại cà phê.”",
  "p.avery.name": "Avery",
  "p.avery.role": () => "Thợ mộc chuyên sửa những thứ người khác vứt đi",
  "p.avery.bark": () => "“Cái ghế này có làm sao đâu. Nó chỉ cần có người tin vào nó thôi.”",
  "p.avery.meet":
    "“Mình hay ôm đồm quá nhiều việc cùng lúc,” Avery thú nhận, tay cầm tấm biển dã ngoại xiêu vẹo đang sơn lại dở dang. “Mình thích những buổi tối yên tĩnh và những thứ hỏng hóc còn sửa được. Mình cần một người bảo cho mình biết khi nào mình đang nghĩ ngợi quá nhiều. Như bây giờ chẳng hạn. Xin lỗi nhé.”",
  "p.quinn.name": "Quinn",
  "p.quinn.role": () => "Điều hành khu vườn cộng đồng; thật ra là điều hành mọi thứ",
  "p.quinn.bark": () => "“Mình đăng ký cho bạn một việc rồi. Bạn sẽ thích lắm. Chắc thế.”",
  "p.quinn.meet":
    "“Mình lo tổ chức nửa bữa tiệc này mà quên cả ăn,” Quinn cười, nhón một miếng khoai tây chiên của bạn. “Khu vườn cộng đồng, xổ số gây quỹ tàu cứu hộ, bản kiến nghị về mấy thùng rác. Mình đang học ra rằng lo cho mọi người thì cũng phải lo cho cả chính mình. Học từ từ thôi.”",
  "p.morgan.name": "Morgan",
  "p.morgan.role": () => "Một thủy thủ có con thuyền và không có kế hoạch B",
  "p.morgan.bark": () => "“Bốn mươi mốt bến cảng. Mình viết hết lên mặt trong cánh tay đây này. Muốn xem không?”",
  "p.morgan.meet":
    "“Suýt nữa thì mình bỏ lỡ bữa này để bắt tàu ra bờ biển,” Morgan nói, cháy nắng và cười toe. “Con thuyền gần xong rồi. Mình mê những nơi mới — và muốn có người cùng khám phá. Mình cũng đang học cách ở lại. Khoản đó thì mình dở hơn.”",
  "p.pip.name": "Pip",
  "p.pip.role": (l: Life) => (pipIsYours(l) ? "Con của bạn" : "Con đỡ đầu của bạn — con của Rowan"),
  "p.pip.bark": () => "“Con hỏi một câu hơi kỳ được không? Để làm bài ở trường. Mà cũng là cho con nữa.”",
};
export default people;
