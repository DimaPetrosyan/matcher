import type { Dictionary } from "./translate.mts"

export const en: Dictionary = {
  denied:
    "<b>This bot is invite-only</b>\n" +
    "\n" +
    "It works only for members of closed communities. " +
    "It looks like you are not in any of the ones I serve.",

  deniedInCommunity:
    "<b>This bot is invite-only</b>\n" +
    "\n" +
    'It works only for members of "{community}". ' +
    "You are not in there — ask whoever invited you for the link.",

  welcome:
    "<b>Hi. I find people from your community to go out with</b>\n" +
    "\n" +
    "Mark once what you are into and when you are usually free. " +
    "After that I will suggest a specific meetup — activity, day, area.\n" +
    "\n" +
    "<i>Nothing gets published. Nothing goes to the group chat.</i>",

  welcomeInCommunity:
    '<b>Hi. I find people from "{community}" to go out with</b>\n' +
    "\n" +
    "Mark once what you are into and when you are usually free. " +
    "After that I will suggest a specific meetup — activity, day, area.\n" +
    "\n" +
    "<i>Nothing gets published. Nothing goes to the group chat.</i>",

  interestsTitle:
    "<b>Step 1 of 3 · What are you into?</b>\n" +
    "\n" +
    "Mark everything that fits. You can change it later.\n" +
    "\n" +
    "<i>Nothing here fits — just type your own.</i>",

  interestsOwn: "<i>Your own: {items}</i>",

  interestsLimit: "Five of your own is plenty. Pick something from the list.",

  interestsTooLong: "Too long — keep it under {limit} characters.",

  interestBar: "Bar",
  interestRun: "Running",
  interestMovie: "Cinema",
  interestExpo: "Exhibitions",
  interestBike: "Cycling",
  interestVolley: "Volleyball",
  interestKaraoke: "Karaoke",
  interestTennis: "Tennis",
  interestPadel: "Padel",
  interestBilliards: "Billiards",

  availabilityStub:
    "<b>Step 2 of 3 · When are you usually free?</b>\n" +
    "\n" +
    "A weekly grid will show up here soon.",

  buttonNext: "Next →",

  alertPickOne: "Pick at least one",

  buttonConsent: "Let's go",
  buttonPolicy: "How I handle your data",

  alertConsentSaved: "Saved",
  alertStaleButton: "This button is out of date",

  communityLost:
    '<b>I am no longer in "{community}"</b>\n' +
    "\n" +
    "I was removed from the chat, so I can no longer verify who belongs there — " +
    "and I only let members in.\n" +
    "\n" +
    "Ask an admin to add me back and everything will keep working: " +
    "your answers are still saved.",

  unverifiable:
    "I cannot check your community membership right now. Please try again in a few minutes.",

  groupIntro:
    "<b>Hi! I help members of this chat go out together</b>\n" +
    "\n" +
    "People mark once in a private chat with me what they are into and when they are usually " +
    "free. After that I look for overlaps myself and suggest a specific meetup — activity, day, " +
    "area. Nobody has to post anything or ask anyone.\n" +
    "\n" +
    "<b>To make me work, promote me to administrator.</b>\n" +
    "No permissions needed — the status itself is what matters: without it Telegram will not let " +
    "me check who is in the chat, and I should only let in your people.\n" +
    "\n" +
    "<i>I barely write here — everything happens in private chats.</i>",

  groupReady:
    "<b>All set, I am live</b>\n" +
    "\n" +
    "Tap “Get started” — I will ask about your interests and free evenings. Three screens, under " +
    "a minute. After that I will suggest a meetup once there are overlaps.\n" +
    "\n" +
    "<i>Only for members of this chat.</i>",

  groupStartButton: "Get started",

  connectDone:
    "<b>Chat connected</b>\n" +
    "\n" +
    "Here is the link for members — it tells the bot where they came from:\n" +
    "{link}\n" +
    "\n" +
    "<i>It only works for people who are in this chat.</i>",

  connectButton: "Open the bot",

  connectNotAdmin: "Only a chat administrator can connect this chat.",

  genericError: "Something went wrong. Please try again",
}
