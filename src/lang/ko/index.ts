import type { Overlay } from "../../localize";
import ui from "./ui";
import lexicon from "./lexicon";
import story1 from "./story-1";
import story2 from "./story-2";
import people from "./people";

const overlay: Overlay = { code: "ko", ui, lexicon, text: { ...story1, ...story2, ...people } };
export default overlay;
