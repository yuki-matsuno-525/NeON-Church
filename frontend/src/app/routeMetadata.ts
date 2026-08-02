import type { Metadata } from "next";

const privateRoute = { index: false, follow: false } as const;

export const routeMetadata = {
  articles: {
    title: "Articles",
    description: "Read essays and studies that connect texts, interpretations, and the history of Christianity.",
  },
  article: {
    title: "Article",
    description: "Read an article and join its discussion on NeON Church.",
  },
  newArticle: {
    title: "Write an Article",
    description: "Create a new article for the NeON Church community.",
    robots: privateRoute,
  },
  editArticle: {
    title: "Edit Article",
    description: "Update an article you published on NeON Church.",
    robots: privateRoute,
  },
  bookmarks: {
    title: "Favorites",
    description: "Review the passages, comments, and translation projects you added to your favorites.",
    robots: privateRoute,
  },
  forgotPassword: {
    title: "Reset Password",
    description: "Request a secure NeON Church password reset link.",
    robots: privateRoute,
  },
  login: {
    title: "Sign In",
    description: "Sign in to your NeON Church account.",
    robots: privateRoute,
  },
  notifications: {
    title: "Notifications",
    description: "Review replies, reactions, and translation mentions for your account.",
    robots: privateRoute,
  },
  profile: {
    title: "Your Profile",
    description: "Manage your NeON Church profile and review your contributions.",
    robots: privateRoute,
  },
  qa: {
    title: "Q&A",
    description: "Ask and answer questions about biblical and early Christian texts.",
  },
  read: {
    title: "Read",
    description: "Browse canonical and non-canonical Christian texts, then read and discuss them chapter by chapter.",
  },
  register: {
    title: "Create Account",
    description: "Create a NeON Church account to comment, ask questions, and collaborate on translations.",
    robots: privateRoute,
  },
  resetPassword: {
    title: "Choose a New Password",
    description: "Complete a secure password reset for your NeON Church account.",
    robots: privateRoute,
  },
  search: {
    title: "Search",
    description: "Search across texts, book titles, and community comments on NeON Church.",
    robots: privateRoute,
  },
  settings: {
    title: "Account Settings",
    description: "Manage account details, notification preferences, active sessions, and account security.",
    robots: privateRoute,
  },
  translations: {
    title: "Translations",
    description: "Browse collaborative translation projects and discover new ways to read historic texts.",
  },
  newTranslation: {
    title: "New Translation Project",
    description: "Start a collaborative translation project on NeON Church.",
    robots: privateRoute,
  },
  translationProject: {
    title: "Translation Project",
    description: "Review a collaborative translation project, its progress, and its discussion.",
  },
  translationReader: {
    title: "Read Translation",
    description: "Read a community translation project in a focused chapter view.",
  },
  translationChapter: {
    title: "Translation Chapter",
    description: "Read and discuss a chapter from a community translation project.",
  },
  demo: {
    title: "Interface Demo",
    description: "Preview NeON Church interface components and layout patterns.",
    robots: privateRoute,
  },
} satisfies Record<string, Metadata>;
