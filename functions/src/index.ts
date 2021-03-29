import * as functions from "firebase-functions";

export const multiply = functions.https.onCall((data) => {
  const result = data.a * data.b;
  functions.logger.info(`${data.a}*${data.b}=${result}`, {
    structuredData: true,
  });
  return result;
});
