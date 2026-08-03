export type RedeemCommentRow = {
  id: string;
  codeId: string;
  codeTitle: string;
  author: string;
  body: string;
  likes: number;
  createdLabel: string;
  isHidden: boolean;
};

export const REDEEM_COMMENT_DEMO: RedeemCommentRow[] = [
  {
    id: "c1",
    codeId: "1",
    codeTitle: "Google Play ₹50",
    author: "Aryan",
    body: "Claimed in 2 mins, code worked on Play Store.",
    likes: 12,
    createdLabel: "2h ago",
    isHidden: false,
  },
  {
    id: "c2",
    codeId: "2",
    codeTitle: "Google Play ₹100",
    author: "Neha",
    body: "Weekly streak reward is fair. Waiting for next drop.",
    likes: 8,
    createdLabel: "5h ago",
    isHidden: false,
  },
  {
    id: "c3",
    codeId: "1",
    codeTitle: "Google Play ₹50",
    author: "SpamBot",
    body: "FREE DIAMONDS CLICK HERE http://scam.example",
    likes: 0,
    createdLabel: "1d ago",
    isHidden: true,
  },
  {
    id: "c4",
    codeId: "3",
    codeTitle: "Play Gift low stock",
    author: "Ravi",
    body: "Stock finished before I could redeem. Add more please.",
    likes: 4,
    createdLabel: "1d ago",
    isHidden: false,
  },
  {
    id: "c5",
    codeId: "2",
    codeTitle: "Google Play ₹100",
    author: "ToxicUser",
    body: "This app is trash, waste of time!!!!",
    likes: 1,
    createdLabel: "2d ago",
    isHidden: false,
  },
];
