import type { ReactNode } from "react";
import type { User } from "@/data/mock";

export interface ReactionEntry {
  emoji: string;
  userIds: string[];
}

export const REACTION_EMOJIS = ["👍", "❤️", "🎉", "🔥", "✅", "👀"] as const;
export const MENTION_QUERY_REGEX = /(?:^|\s)@([a-zA-Z][a-zA-Z\s]*)$/;

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

export const extractMentionedUsers = (text: string, users: User[]) =>
  users.filter((user) => new RegExp(`(^|\\s)@${escapeRegExp(user.name)}(?=\\s|$)`, "i").test(text));

export const insertMentionAtCursor = (value: string, userName: string) =>
  value.replace(MENTION_QUERY_REGEX, (match, _query, offset) => {
    const needsLeadingSpace = offset > 0 && !/^\s/.test(match);
    return `${needsLeadingSpace ? " " : ""}@${userName} `;
  });

export const renderMentionText = (text: string): ReactNode[] => {
  const segments = text.split(/(@[a-zA-Z][a-zA-Z\s]*)/g);
  return segments.filter(Boolean).map((segment, index) => {
    if (/^@[a-zA-Z][a-zA-Z\s]*$/.test(segment)) {
      return (
        <strong key={`${segment}-${index}`} className="font-semibold">
          {segment}
        </strong>
      );
    }
    return segment;
  });
};

export const toggleReactionEntries = (
  reactions: ReactionEntry[] | undefined,
  userId: string,
  emoji: string
) => {
  const current = reactions ?? [];
  const alreadySelected = current.some((entry) => entry.emoji === emoji && entry.userIds.includes(userId));
  const withoutUser = current
    .map((entry) => ({
      ...entry,
      userIds: entry.userIds.filter((entryUserId) => entryUserId !== userId),
    }))
    .filter((entry) => entry.userIds.length > 0);

  if (alreadySelected) return withoutUser;

  const match = withoutUser.find((entry) => entry.emoji === emoji);
  if (match) {
    return withoutUser.map((entry) =>
      entry.emoji === emoji ? { ...entry, userIds: [...entry.userIds, userId] } : entry
    );
  }

  return [...withoutUser, { emoji, userIds: [userId] }];
};
