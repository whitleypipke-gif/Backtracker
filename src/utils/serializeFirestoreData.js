/**
 * Converts Firestore-specific values into plain JSON-safe values before they
 * enter Redux. Firestore itself should continue storing native Timestamps.
 */
const isObject = (value) => value !== null && typeof value === "object";

const isFirestoreTimestamp = (value) =>
  isObject(value) &&
  typeof value.toDate === "function" &&
  typeof value.seconds === "number" &&
  typeof value.nanoseconds === "number";

const isFirestoreGeoPoint = (value) =>
  isObject(value) &&
  value.constructor?.name === "GeoPoint" &&
  typeof value.latitude === "number" &&
  typeof value.longitude === "number";

const isFirestoreDocumentReference = (value) =>
  isObject(value) &&
  value.constructor?.name === "DocumentReference" &&
  typeof value.path === "string";

const isFirestoreBytes = (value) =>
  isObject(value) &&
  value.constructor?.name === "Bytes" &&
  typeof value.toBase64 === "function";

export const serializeFirestoreData = (value) => {
  if (!isObject(value)) return value;

  if (value instanceof Date) {
    return value.toISOString();
  }

  if (isFirestoreTimestamp(value)) {
    return value.toDate().toISOString();
  }

  if (isFirestoreGeoPoint(value)) {
    return {
      latitude: value.latitude,
      longitude: value.longitude,
    };
  }

  if (isFirestoreDocumentReference(value)) {
    return value.path;
  }

  if (isFirestoreBytes(value)) {
    return value.toBase64();
  }

  if (Array.isArray(value)) {
    return value.map(serializeFirestoreData);
  }

  return Object.fromEntries(
    Object.entries(value).map(([key, nestedValue]) => [
      key,
      serializeFirestoreData(nestedValue),
    ]),
  );
};

export default serializeFirestoreData;