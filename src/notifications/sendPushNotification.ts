import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";

import type { User } from "../types";

import { USER_COLLECTION } from "../index";

interface ISendPushNotification {
  playerIds: string | string[];
  title: string;
  body: string;
}

/**
 * A function that takes care of getting users FCM tokens and then sends notifications
 *  to the specified users
 *
 * @param An object containing
 *      1. ID or IDs of players to notify
 *      2. title of notification
 *      3. body of notification
 */
const sendPushNotification = async ({
  playerIds,
  title,
  body,
}: ISendPushNotification) => {
  const MESSAGING = getMessaging();
  const tokens = await getPlayerFCMTokens(playerIds);

  if (tokens.length === 0) return;

  const message: MulticastMessage = {
    notification: {
      title,
      body,
    },
    tokens,
  };

  MESSAGING.sendMulticast(message);
};

/**
 * Returns a single FCM token, or array of FCM tokens, to send messages to.
 *
 * @param players List of playerIds/UIDS
 *
 * @returns FCM token or array of FCM tokens
 */
const getPlayerFCMTokens = async (
  playerIds: string | string[]
): Promise<string[]> => {
  if (Array.isArray(playerIds)) {
    // Query to get users with uid in the game
    const userQuery = USER_COLLECTION.where("uid", "in", playerIds);

    // Get docs
    const userDocs = await userQuery.get().then((querySnap) => querySnap.docs);
    if (userDocs.length === 0) return [];
    const users = userDocs.map((doc) => doc.data()) as User[];
    return users.map(({ fcmToken }) => fcmToken);
  } else {
    const userDoc = USER_COLLECTION.doc(playerIds);
    const userData = (await userDoc.get().then((doc) => doc.data())) as User;
    return [userData.fcmToken];
  }
};

export default sendPushNotification;
