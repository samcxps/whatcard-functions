import { getMessaging, type MulticastMessage } from "firebase-admin/messaging";

import type { User } from "../types";

import { USER_COLLECTION } from "../index";

interface ISendPushNotification {
  players: string | string[];
  title: string;
  body: string;
}

const sendPushNotification = async ({
  players,
  title,
  body,
}: ISendPushNotification) => {
  const MESSAGING = getMessaging();
  const tokens = await getPlayerFCMTokens(players);

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
  players: string | string[]
): Promise<string[]> => {
  if (Array.isArray(players)) {
    // Query to get users with uid in the game
    const userQuery = USER_COLLECTION.where("uid", "in", players);

    // Get docs
    const userDocs = await userQuery.get().then((querySnap) => querySnap.docs);
    if (userDocs.length === 0) return [];
    const users = userDocs.map((doc) => doc.data()) as User[];
    return users.map(({ fcmToken }) => fcmToken);
  } else {
    const userDoc = USER_COLLECTION.doc(players);
    const userData = (await userDoc.get().then((doc) => doc.data())) as User;
    return [userData.fcmToken];
  }
};

export default sendPushNotification;
