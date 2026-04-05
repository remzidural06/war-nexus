/**
 * Firestore Web shim — @react-native-firebase/firestore API'sini
 * gerçek Firebase Web SDK (v9 modular) ile sarmalayan uyumluluk katmanı.
 *
 * RN Firebase chainable API: firestore().collection('x').doc('y').get()
 * Web SDK modular API: getDoc(doc(getFirestore(), 'x', 'y'))
 */
import {
  getFirestore,
  collection as fbCollection,
  doc as fbDoc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc as fbDeleteDoc,
  query,
  where as fbWhere,
  limit as fbLimit,
  orderBy as fbOrderBy,
  limitToLast as fbLimitToLast,
  onSnapshot as fbOnSnapshot,
  serverTimestamp,
  increment as fbIncrement,
  type DocumentData,
  type QueryConstraint,
} from 'firebase/firestore';
import app from './firebase';

const _db = getFirestore(app);

/** Wrap a Firestore DocumentSnapshot to match RN Firebase API */
function wrapDocSnap(snap: any) {
  const _exists = snap.exists();
  return {
    exists: () => _exists,
    id: snap.id,
    data: () => snap.data() ?? null,
    ref: snap.ref,
  };
}

/** Wrap a Firestore QuerySnapshot */
function wrapQuerySnap(snap: any) {
  const docs = snap.docs.map((d: any) => wrapDocSnap(d));
  return {
    docs,
    size: snap.size,
    empty: snap.empty,
    forEach: (cb: any) => docs.forEach(cb),
  };
}

/** Creates a chainable doc reference (RN Firebase compat) */
function wrapDocRef(ref: any) {
  return {
    id: ref.id,
    get: async () => wrapDocSnap(await getDoc(ref)),
    set: async (data: any, options?: any) => setDoc(ref, data, options ?? {}),
    update: async (data: any) => updateDoc(ref, data),
    delete: async () => fbDeleteDoc(ref),
    collection: (name: string) => wrapCollectionRef(fbCollection(ref, name)),
    onSnapshot: (cb: any) => fbOnSnapshot(ref, (snap: any) => cb(wrapDocSnap(snap))),
  };
}

/** Creates a chainable collection/query reference (RN Firebase compat) */
function wrapCollectionRef(colRef: any, constraints: QueryConstraint[] = []) {
  const self = {
    doc: (id?: string) => {
      const ref = id ? fbDoc(colRef, id) : fbDoc(colRef);
      return wrapDocRef(ref);
    },
    add: async (data: any) => {
      const ref = await addDoc(colRef, data);
      return { id: ref.id };
    },
    where: (field: string, op: any, value: any) =>
      wrapCollectionRef(colRef, [...constraints, fbWhere(field, op, value)]),
    limit: (n: number) =>
      wrapCollectionRef(colRef, [...constraints, fbLimit(n)]),
    orderBy: (field: string, direction?: 'asc' | 'desc') =>
      wrapCollectionRef(colRef, [...constraints, fbOrderBy(field, direction)]),
    limitToLast: (n: number) =>
      wrapCollectionRef(colRef, [...constraints, fbLimitToLast(n)]),
    get: async () => {
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
      return wrapQuerySnap(await getDocs(q));
    },
    onSnapshot: (cb: any, errorCb?: any) => {
      const q = constraints.length > 0 ? query(colRef, ...constraints) : colRef;
      return fbOnSnapshot(
        q,
        (snap: any) => cb(wrapQuerySnap(snap)),
        (err: any) => {
          console.warn('[Firestore onSnapshot error]', err?.message ?? err);
          if (errorCb) errorCb(err);
        },
      );
    },
  };
  return self;
}

const firestore = () => ({
  collection: (name: string) => wrapCollectionRef(fbCollection(_db, name)),
});

firestore.FieldValue = {
  serverTimestamp: () => serverTimestamp(),
  increment: (n: number) => fbIncrement(n),
};

export default firestore;
export type FirebaseFirestoreTypes = { DocumentData: DocumentData };
