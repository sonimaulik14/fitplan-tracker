-- Remove the social "Ranks"/leaderboard feature: the Follow table only ever
-- backed the cross-user leaderboard, which has been removed.
DROP TABLE IF EXISTS "Follow";
