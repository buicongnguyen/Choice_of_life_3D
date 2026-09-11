export type Scores = { health: number; happiness: number; money: number };
export type Facts = Record<string, string>;
export type Option = {
  label: string;
  hint: string;
  effect: Partial<Scores>;
  fact?: [string, string];
  memory: string;
};
export type Encounter = {
  person: string;
  role: string;
  gender: "male" | "female";
  color: number;
  prompt: string;
  context?: (f: Facts) => string;
  options: Option[];
};
export type Chapter = {
  title: string;
  age: string;
  place: string;
  scene: string;
  intro: string;
  scale: number;
  encounters: Encounter[];
  discoveries: [string, string, string];
};
const o = (
  label: string,
  hint: string,
  effect: Partial<Scores>,
  fact: [string, string] | undefined,
  memory: string,
): Option => ({ label, hint, effect, fact, memory });
const e = (
  person: string,
  role: string,
  gender: "male" | "female",
  color: number,
  prompt: string,
  options: Option[],
  context?: (f: Facts) => string,
): Encounter => ({ person, role, gender, color, prompt, options, context });
export const careerFor = (f: Facts) =>
  f.field === "care"
    ? f.education === "university"
      ? "Resident doctor"
      : f.education === "training"
        ? "Community nurse"
        : "Care assistant"
    : f.field === "technology"
      ? "Software engineer"
      : f.field === "enterprise"
        ? "Entrepreneur"
        : "Designer";
export const chapters: Chapter[] = [
  {
    title: "A small beginning",
    age: "0–2",
    place: "The family nursery",
    scene: "home",
    intro:
      "Before you had words, you had a whole world to discover. A familiar voice is waiting on the rug.",
    scale: 1,
    discoveries: [
      "A soft blanket",
      "A favourite rattle",
      "Coins for your first savings",
    ],
    encounters: [
      e(
        "Mum",
        "Your first safe place",
        "female",
        0xe08c77,
        "The room feels enormous. Mum opens her arms. What do you reach for?",
        [
          o(
            "Reach for a cuddle",
            "A little comfort can become a lasting memory.",
            { happiness: 8, health: 3 },
            ["beginning", "comfort"],
            "Mum made the world feel smaller with a cuddle.",
          ),
          o(
            "Follow the little melody",
            "Let curiosity lead, even when it feels new.",
            { happiness: 5, health: 1 },
            ["beginning", "curiosity"],
            "You followed the sound of Mum singing.",
          ),
          o(
            "Curl up for a nap",
            "Rest now; there will be time to explore.",
            { health: 8, happiness: 1 },
            ["beginning", "rest"],
            "A quiet afternoon taught you the comfort of rest.",
          ),
        ],
      ),
      e(
        "Dad",
        "Keeper of small treasures",
        "male",
        0x728eaa,
        "Dad brings a blue tin. “We can keep a little piece of every year in here.” What goes inside first?",
        [
          o(
            "A tiny paper star",
            "A reminder of the people who believe in you.",
            { happiness: 5 },
            ["tin", "star"],
            "A paper star became the first treasure in your blue tin.",
          ),
          o(
            "A smooth garden stone",
            "Even ordinary things can hold a story.",
            { health: 3, happiness: 2 },
            ["tin", "stone"],
            "You kept a smooth stone from the garden.",
          ),
          o(
            "Your first little coin",
            "A beginning for tomorrow.",
            { money: 5 },
            ["tin", "coin"],
            "Dad placed a little coin in your keepsake tin.",
          ),
        ],
      ),
    ],
  },
  {
    title: "A bigger little world",
    age: "3–5",
    place: "Home, on a sunny afternoon",
    scene: "home",
    intro:
      "Your feet can take you places now. Today, a missing toy could be the start of a very long friendship.",
    scale: 0.62,
    discoveries: [
      "A crunchy apple",
      "The missing toy boat",
      "A pocket of saved coins",
    ],
    encounters: [
      e(
        "Rowan",
        "The child next door",
        "male",
        0xe4b451,
        "“I lost my boat,” says Rowan. “Will you help me find it?”",
        [
          o(
            "Search together",
            "A friendship begins with a little time.",
            { happiness: 7, health: -1 },
            ["rowan", "close"],
            "You and Rowan searched for a toy boat together.",
          ),
          o(
            "Invite Rowan to share your toys",
            "There is more than one way to help.",
            { happiness: 6, money: -1 },
            ["rowan", "close"],
            "You made room for Rowan in your games.",
          ),
          o(
            "Ask Dad to help",
            "Getting support is a useful skill too.",
            { health: 4, happiness: 3 },
            ["rowan", "friendly"],
            "Dad helped you and Rowan solve a small problem.",
          ),
        ],
      ),
      e(
        "Mum",
        "Room to grow",
        "female",
        0xe08c77,
        "The garden gate is open, and the afternoon is yours. How will you spend it?",
        [
          o(
            "Look for tiny creatures",
            "The world rewards attention.",
            { health: 5, happiness: 3 },
            ["hobby", "nature"],
            "You learned to notice the small living things.",
          ),
          o(
            "Make something from paper",
            "A small idea can become a whole world.",
            { happiness: 7, money: -2 },
            ["hobby", "making"],
            "Paper, glue, and imagination filled an afternoon.",
          ),
          o(
            "Help put the toys away",
            "A small routine brings a little calm.",
            { health: 3, money: 3 },
            ["hobby", "organising"],
            "You found satisfaction in making things a little better.",
          ),
        ],
        (f) =>
          f.beginning === "comfort"
            ? "Mum still remembers the way you used to reach for her arms."
            : "Mum smiles at the little person you are becoming.",
      ),
    ],
  },
  {
    title: "The first school day",
    age: "6–9",
    place: "The sunny classroom",
    scene: "school",
    intro:
      "New shoes. New names. Somewhere in this room, someone feels just as nervous as you do.",
    scale: 0.7,
    discoveries: [
      "A healthy apple",
      "A library storybook",
      "Savings from a packed lunch",
    ],
    encounters: [
      e(
        "Maya",
        "A new classmate",
        "female",
        0x9b90bc,
        "Maya is sitting alone while everyone chooses a game. There is an empty chair beside her.",
        [
          o(
            "Sit and introduce yourself",
            "A brave hello can change two days.",
            { happiness: 7 },
            ["school", "kindness"],
            "You sat beside Maya on the first day of school.",
          ),
          o(
            "Invite her to your game",
            "Make the circle a little wider.",
            { happiness: 5, health: 3 },
            ["school", "teamwork"],
            "You invited Maya into a game before the bell rang.",
          ),
          o(
            "Offer her a book to share",
            "Quiet company counts too.",
            { happiness: 4, money: 2 },
            ["school", "learning"],
            "A shared book made a new classroom less strange.",
          ),
        ],
      ),
      e(
        "Ms Lin",
        "A teacher who notices",
        "female",
        0x538e8c,
        "“You can choose a project for the class exhibition. What would you like to try?”",
        [
          o(
            "Grow a tiny garden",
            "Care and patience make things grow.",
            { health: 5, happiness: 3 },
            ["project", "garden"],
            "Your first school project brought a little green into the room.",
          ),
          o(
            "Build a cardboard invention",
            "Not every first attempt will work.",
            { happiness: 6, money: -2 },
            ["project", "invention"],
            "You kept trying until your cardboard invention stood up.",
          ),
          o(
            "Organise the class stall",
            "Help everyone find a place.",
            { money: 5, happiness: 1 },
            ["project", "stall"],
            "You helped the class turn small ideas into a busy stall.",
          ),
        ],
      ),
    ],
  },
  {
    title: "Finding your people",
    age: "10–14",
    place: "Clubs after the final bell",
    scene: "school",
    intro:
      "The days are getting busier. You cannot join everything, but you can choose what deserves your time.",
    scale: 0.8,
    discoveries: [
      "Sports practice",
      "A club invitation",
      "A repaired school bag",
    ],
    encounters: [
      e(
        "Rowan",
        "A familiar face",
        "male",
        0xe4b451,
        "“There is one spot left in the club. Come with me?”",
        [
          o(
            "Join the music and arts club",
            "Make something with your friends.",
            { happiness: 8, money: -3 },
            ["club", "arts"],
            "You and Rowan filled the afternoons with music and colour.",
          ),
          o(
            "Try the sports team",
            "Move, practise, and learn to lose well.",
            { health: 8, happiness: 2 },
            ["club", "sport"],
            "You learned that a team can carry you through a difficult day.",
          ),
          o(
            "Start a small coding club",
            "Build a place for your own interests.",
            { money: 4, happiness: 3 },
            ["club", "technology"],
            "Your first coding club began around a borrowed computer.",
          ),
        ],
        (f) =>
          f.rowan === "close"
            ? "Rowan has kept the old toy boat. Some friendships grow quietly alongside you."
            : "Rowan still remembers the games you played next door.",
      ),
      e(
        "Dad",
        "A gentle check-in",
        "male",
        0x728eaa,
        "Homework, friends, and family all want a piece of your week. What will you protect?",
        [
          o(
            "One quiet evening at home",
            "Rest is a choice, not a reward.",
            { health: 7, happiness: 2 },
            ["rhythm", "rest"],
            "You protected a quiet evening in a busy week.",
          ),
          o(
            "Time with your friends",
            "Stay connected while things change.",
            { happiness: 7, health: -2 },
            ["rhythm", "friends"],
            "You made time for the people growing up alongside you.",
          ),
          o(
            "Practise a useful skill",
            "Make a little space for future you.",
            { money: 6, happiness: -2 },
            ["rhythm", "practice"],
            "You practised even when progress felt small.",
          ),
        ],
      ),
    ],
  },
  {
    title: "The exam season",
    age: "15–18",
    place: "A school full of possibilities",
    scene: "school",
    intro:
      "The exam calendar is on the wall. So are invitations, family plans, and a life beyond your grades.",
    scale: 0.92,
    discoveries: ["A proper lunch break", "A note from Rowan", "A weekend job"],
    encounters: [
      e(
        "Ms Lin",
        "More than a report card",
        "female",
        0x538e8c,
        "“There is still time to make a plan. What does a good exam season look like for you?”",
        [
          o(
            "Study intensely",
            "Excellent preparation, with less time to rest.",
            { money: 8, health: -5, happiness: -4 },
            ["grade", "excellent"],
            "You worked hard for excellent exam results.",
          ),
          o(
            "Make a balanced timetable",
            "Steady preparation and room to breathe.",
            { health: 4, happiness: 3, money: 3 },
            ["grade", "good"],
            "You found a study rhythm that left room for life.",
          ),
          o(
            "Work shifts and study when you can",
            "Support your household; keep another route open.",
            { money: 10, happiness: -3 },
            ["grade", "practical"],
            "You balanced paid work with school and learned resilience.",
          ),
        ],
      ),
      e(
        "Rowan",
        "At a crossroads too",
        "male",
        0xe4b451,
        "“Whatever happens after this year, can we keep in touch?”",
        [
          o(
            "Promise a yearly catch-up",
            "Some traditions are worth beginning.",
            { happiness: 6 },
            ["promise", "yearly"],
            "You and Rowan promised to meet at least once a year.",
          ),
          o(
            "Plan a small trip together",
            "Make one more memory before the next chapter.",
            { happiness: 9, money: -5 },
            ["promise", "trip"],
            "A modest trip gave you a story to tell for years.",
          ),
          o(
            "Trade letters when life gets busy",
            "Leave a door open without making a promise you cannot keep.",
            { happiness: 4, health: 2 },
            ["promise", "letters"],
            "You chose letters when life became too busy for visits.",
          ),
        ],
      ),
    ],
  },
  {
    title: "A road of your own",
    age: "18–24",
    place: "The learning quarter",
    scene: "campus",
    intro:
      "There are several doors into adulthood. Explore a way of learning and a kind of work that interests you, in either order.",
    scale: 1,
    discoveries: ["A campus walk", "A new creative idea", "A training bursary"],
    encounters: [
      e(
        "Alex",
        "Your course adviser",
        "female",
        0x7e9fbb,
        "“A qualification is a tool, not a verdict. Which route works for you?”",
        [
          o(
            "University",
            "Longer study opens professional work; it costs money and time.",
            { money: -12, happiness: 5 },
            ["education", "university"],
            "You chose university and a longer road into your profession.",
          ),
          o(
            "Practical training",
            "Earn experience while learning a craft.",
            { money: 3, health: -2, happiness: 3 },
            ["education", "training"],
            "Practical training taught you through real work.",
          ),
          o(
            "Work and learn on the job",
            "Start earning sooner; keep growing along the way.",
            { money: 9, happiness: -2 },
            ["education", "work"],
            "You entered work early and kept learning on the job.",
          ),
        ],
        (f) =>
          f.grade === "excellent"
            ? "Your preparation paid off. Alex sees several open doors."
            : f.grade === "practical"
              ? "Your work experience counts. Alex also offers a supported route into further study."
              : "Your steady preparation has given you several ways forward.",
      ),
      e(
        "Noah",
        "A mentor at the workshop",
        "male",
        0xc59067,
        "“When work is difficult, what makes it feel worthwhile?”",
        [
          o(
            "Caring for people",
            "A future in medicine or community nursing.",
            { happiness: 5, health: -2 },
            ["field", "care"],
            "You chose work that makes room for other people.",
          ),
          o(
            "Solving problems with technology",
            "A future in software and engineering.",
            { money: 5, happiness: 1 },
            ["field", "technology"],
            "You found purpose in solving difficult technical problems.",
          ),
          o(
            "Building a small business",
            "A future with independence and uncertainty.",
            { money: 3, happiness: 3 },
            ["field", "enterprise"],
            "You wanted to build something of your own.",
          ),
        ],
      ),
    ],
  },
  {
    title: "Your first badge",
    age: "25–32",
    place: "A workplace with your name on it",
    scene: "office",
    intro:
      "Your first proper working day. There is a desk, a new name badge, and a person you have not become yet.",
    scale: 1,
    discoveries: [
      "A lunchtime walk",
      "A kind welcome note",
      "Your first savings plan",
    ],
    encounters: [
      e(
        "Sam",
        "A colleague on your first day",
        "male",
        0x85a1b5,
        "“How would you like to begin?”",
        [
          o(
            "Take the challenging assignment",
            "Learn quickly, with pressure and better income.",
            { money: 11, health: -5, happiness: -3 },
            ["work", "ambitious"],
            "You took a demanding first assignment and grew into it.",
          ),
          o(
            "Build steady foundations",
            "A sustainable start with time to learn.",
            { money: 5, health: 3, happiness: 2 },
            ["work", "steady"],
            "You built a working life you could sustain.",
          ),
          o(
            "Help the newest colleague",
            "Invest in trust, even when it slows your own progress.",
            { money: 2, happiness: 7 },
            ["work", "supportive"],
            "You became the colleague someone else could ask for help.",
          ),
        ],
        (f) =>
          `Your ${f.education === "university" ? "university studies" : f.education === "training" ? "practical training" : "work experience"} led here. Your new badge reads: ${careerFor(f)}.`,
      ),
      e(
        "Rowan",
        "Checking in after work",
        "male",
        0xe4b451,
        "“You sound tired. Are you coming out tonight?”",
        [
          o(
            "Finish an extra shift",
            "More security now, at a cost to your evening.",
            { money: 9, health: -4, happiness: -3 },
            ["boundary", "overtime"],
            "You stayed late to build a little financial breathing room.",
          ),
          o(
            "Close the laptop and go",
            "Work can wait until tomorrow.",
            { happiness: 7, health: 3, money: -2 },
            ["boundary", "balance"],
            "You learned to put work down at the end of the day.",
          ),
          o(
            "Invite Rowan for a quiet meal",
            "Connection does not have to be expensive or exhausting.",
            { health: 4, happiness: 4, money: -2 },
            ["boundary", "care"],
            "A simple meal made a difficult week feel lighter.",
          ),
        ],
      ),
    ],
  },
  {
    title: "Someone to come home to",
    age: "33–40",
    place: "An evening in the neighbourhood",
    scene: "town",
    intro:
      "A small gathering in the garden. Some people become partners. Some become chosen family. The shape is yours.",
    scale: 1,
    discoveries: [
      "A shared garden",
      "A favourite song",
      "A sensible housing plan",
    ],
    encounters: [
      e(
        "Jamie",
        "Host of the neighbourhood gathering",
        "female",
        0xb691b7,
        "You meet three people: Avery loves making things, Quinn cares about the community, and Morgan lives for new adventures. Who would you like to know better?",
        [
          o(
            "Spend time with Avery",
            "A patient, creative person who values a shared home.",
            { happiness: 7, money: -2 },
            ["partner", "Avery"],
            "You and Avery began with an easy conversation about making things.",
          ),
          o(
            "Walk around the garden with Quinn",
            "A warm organiser with room for other people.",
            { happiness: 6, health: 2 },
            ["partner", "Quinn"],
            "Quinn showed you how a neighbourhood can become a home.",
          ),
          o(
            "Meet Morgan — or keep things open",
            "An adventurous friendship; commitment can come later.",
            { happiness: 6, money: -1 },
            ["partner", "Morgan"],
            "You and Morgan traded stories about places you hoped to see.",
          ),
        ],
      ),
      e(
        "Dad",
        "A home can take many shapes",
        "male",
        0x728eaa,
        "“There is no one way to build a home. What would you like yours to be?”",
        [
          o(
            "Plan a shared life with a partner",
            "Choose commitment, now or when you meet someone. Share the work of a home.",
            { happiness: 8, money: -7 },
            ["home", "partnered"],
            "You chose to build a shared life, one ordinary day at a time.",
          ),
          o(
            "Stay single and close to friends",
            "Protect your independence and nurture chosen family.",
            { health: 4, happiness: 5 },
            ["home", "friends"],
            "You built an independent life with deep friendships.",
          ),
          o(
            "Make a home in the community",
            "Share time, space, and responsibility with neighbours.",
            { happiness: 6, money: 2 },
            ["home", "community"],
            "Your home grew beyond its walls into the community.",
          ),
        ],
      ),
    ],
  },
  {
    title: "The busy middle",
    age: "41–50",
    place: "Home, between all the things",
    scene: "home",
    intro:
      "A message from work. A call from Mum. A day with only so many hours. You do not have to carry everything alone.",
    scale: 1.02,
    discoveries: [
      "A ten-minute rest",
      "A family photograph",
      "A household budget",
    ],
    encounters: [
      e(
        "Mum",
        "A familiar voice, a little older",
        "female",
        0xe08c77,
        "“I could use some help this month. But I know you have a lot on.”",
        [
          o(
            "Take time away from work",
            "Be present; accept a temporary drop in income.",
            { money: -9, happiness: 6, health: 2 },
            ["care", "present"],
            "You made time to care for Mum when she needed it.",
          ),
          o(
            "Arrange skilled support",
            "Use your resources to share the responsibility.",
            { money: -12, health: 5, happiness: 3 },
            ["care", "support"],
            "You arranged support so no one had to do everything alone.",
          ),
          o(
            "Coordinate with family and neighbours",
            "Ask for help and build a practical rota.",
            { happiness: 7, health: -2, money: -3 },
            ["care", "network"],
            "A small network of people helped your family through a busy season.",
          ),
        ],
        (f) =>
          f.beginning === "comfort"
            ? "You remember how safe Mum made the world feel. Now you can offer some of that comfort back."
            : "The blue tin is still on Mum’s shelf. She has kept every little treasure.",
      ),
      e(
        "Sam",
        "Someone who knows your work",
        "male",
        0x85a1b5,
        "“There is a promotion available. We can also talk about a lighter schedule.”",
        [
          o(
            "Accept the promotion",
            "A larger salary, and a heavier week.",
            { money: 12, health: -6, happiness: -3 },
            ["midlife", "promotion"],
            "You accepted more responsibility at a demanding time.",
          ),
          o(
            "Choose a lighter schedule",
            "Trade some income for time and wellbeing.",
            { money: -5, health: 8, happiness: 4 },
            ["midlife", "time"],
            "You gave yourself permission to make room in the week.",
          ),
          o(
            "Keep your role and ask for flexibility",
            "Protect the work you enjoy and change how you do it.",
            { money: 3, health: 3, happiness: 3 },
            ["midlife", "flexible"],
            "A flexible arrangement helped work fit around your life.",
          ),
        ],
        (f) =>
          f.boundary === "overtime"
            ? "Sam remembers your late shifts. It may be time to decide what that effort should buy you."
            : "The boundaries you practised earlier make this conversation easier.",
      ),
    ],
  },
  {
    title: "What experience gives",
    age: "51–60",
    place: "A place you helped shape",
    scene: "office",
    intro:
      "You know things now that once felt impossible. Someone nearby is starting their own first day.",
    scale: 1.02,
    discoveries: [
      "A stretch between meetings",
      "A thank-you card",
      "A retirement contribution",
    ],
    encounters: [
      e(
        "Leah",
        "A new colleague finding their feet",
        "female",
        0x7e9fbb,
        "“I am worried I am not good enough for this.”",
        [
          o(
            "Make time to mentor",
            "Share the mistakes as well as the successes.",
            { happiness: 8, money: -2 },
            ["legacy", "mentor"],
            "You made another person’s first steps less lonely.",
          ),
          o(
            "Build a guide for the whole team",
            "Turn experience into something others can use.",
            { money: 5, happiness: 4 },
            ["legacy", "builder"],
            "You left a practical guide for the people who came next.",
          ),
          o(
            "Introduce them to a helpful colleague",
            "Connect people while protecting your own energy.",
            { health: 5, happiness: 3 },
            ["legacy", "connector"],
            "You learned that helping sometimes means bringing people together.",
          ),
        ],
      ),
      e(
        "Sam",
        "Looking toward the next chapter",
        "male",
        0x85a1b5,
        "“What do you want the next few years to feel like?”",
        [
          o(
            "One last ambitious project",
            "Build security while the work still excites you.",
            { money: 10, health: -5 },
            ["later", "project"],
            "You gave one final ambitious project your attention.",
          ),
          o(
            "Move to part-time work",
            "Let your days become a little wider.",
            { money: -4, health: 7, happiness: 5 },
            ["later", "parttime"],
            "You found a slower rhythm without leaving work behind entirely.",
          ),
          o(
            "Use your skills in the community",
            "Let experience travel beyond your workplace.",
            { happiness: 8, money: -3 },
            ["later", "community"],
            "You carried your skills into the neighbourhood.",
          ),
        ],
      ),
    ],
  },
  {
    title: "Room to breathe",
    age: "61–72",
    place: "The garden after the rain",
    scene: "garden",
    intro:
      "The calendar has more blank spaces. They are not empty. They are yours.",
    scale: 0.98,
    discoveries: [
      "Fresh garden herbs",
      "A well-loved novel",
      "A careful savings review",
    ],
    encounters: [
      e(
        "Jamie",
        "A neighbour with an invitation",
        "female",
        0xb691b7,
        "“We are starting something in the garden. Would you like to be part of it?”",
        [
          o(
            "Grow food with the neighbours",
            "A gentle routine and something to share.",
            { health: 7, happiness: 5 },
            ["retirement", "garden"],
            "Your retirement grew roots in a community garden.",
          ),
          o(
            "Take a modest journey",
            "See somewhere you have always imagined.",
            { happiness: 10, money: -8 },
            ["retirement", "travel"],
            "You finally took a journey you had talked about for years.",
          ),
          o(
            "Keep a quiet creative routine",
            "Make, read, and enjoy ordinary days.",
            { health: 5, happiness: 5, money: -1 },
            ["retirement", "creative"],
            "You discovered how rich a quiet day could feel.",
          ),
        ],
      ),
      e(
        "Rowan",
        "A very old friend",
        "male",
        0xe4b451,
        "Rowan arrives carrying a faded toy boat. “Do you remember this?”",
        [
          o(
            "Tell the old story again",
            "Remember the people you were together.",
            { happiness: 8 },
            ["reunion", "story"],
            "You and Rowan laughed over a toy boat older than most of your furniture.",
          ),
          o(
            "Make a new memory today",
            "The story is still happening.",
            { health: 4, happiness: 6 },
            ["reunion", "new"],
            "You and Rowan made another memory to sit beside the old ones.",
          ),
          o(
            "Pass the toy on to a child",
            "Some treasures become more valuable when shared.",
            { happiness: 6, money: 2 },
            ["reunion", "share"],
            "You gave the little boat another childhood to sail through.",
          ),
        ],
        (f) =>
          f.promise === "yearly"
            ? "You kept your yearly meeting, sometimes in person and sometimes by phone."
            : f.promise === "letters"
              ? "A stack of letters has kept the years between you small."
              : "Some years were busy, but the friendship still has a familiar shape.",
      ),
    ],
  },
  {
    title: "The things we leave",
    age: "73+",
    place: "A garden full of memories",
    scene: "garden",
    intro:
      "The blue tin is on the table. It was never large enough to hold a whole life. Somehow, it comes close.",
    scale: 0.95,
    discoveries: [
      "The morning sunlight",
      "The blue keepsake tin",
      "A gift for tomorrow",
    ],
    encounters: [
      e(
        "Rowan",
        "One more afternoon together",
        "male",
        0xe4b451,
        "“When you look back, what would you like to hold close?”",
        [
          o(
            "The people who made room for me",
            "A life is built from shared moments.",
            { happiness: 6 },
            ["meaning", "people"],
            "You remembered the people who made room for you.",
          ),
          o(
            "The things I learned to make possible",
            "There was value in trying.",
            { money: 4, happiness: 2 },
            ["meaning", "work"],
            "You remembered the things you helped make possible.",
          ),
          o(
            "The ordinary days I learned to enjoy",
            "A small life can be a full one.",
            { health: 4, happiness: 3 },
            ["meaning", "days"],
            "You remembered the ordinary days, and how much they held.",
          ),
        ],
        (f) =>
          `Inside the tin is the ${f.tin === "star" ? "paper star" : f.tin === "stone" ? "smooth garden stone" : "little coin"} Dad gave you. A whole life has gathered around it.`,
      ),
      e(
        "Maya",
        "The next story begins",
        "female",
        0x9b90bc,
        "“What would you like us to carry forward?”",
        [
          o(
            "Make a place where people belong",
            "Leave a little more room in the world.",
            { happiness: 5, money: -3 },
            ["gift", "belonging"],
            "Your final gift was a place where people could belong.",
          ),
          o(
            "Share what you know",
            "Leave tools, stories, and encouragement.",
            { happiness: 4, money: -1 },
            ["gift", "knowledge"],
            "You passed on your knowledge with kindness.",
          ),
          o(
            "Help someone take their first step",
            "Give tomorrow a little breathing room.",
            { happiness: 5, money: -5 },
            ["gift", "opportunity"],
            "You helped someone else begin their own story.",
          ),
        ],
      ),
    ],
  },
];
