// IndexedDB persistence. Replaces the Android Room database.
//
// Stores mirror the Room entities one-for-one, plus a `photos` store that the
// Android app did not have (it wrote captures to the device gallery, which a
// browser cannot do - see docs/FEATURE-MATRIX.md).
//
// Schema changes: bump DB_VERSION and add an upgrade branch. Never delete a
// store in an upgrade without migrating the data out first - unsynchronised
// field data must survive an application update.

const DB_NAME = 'site_reporter';
const DB_VERSION = 1;

let dbPromise = null;

function open() {
  if (dbPromise) return dbPromise;
  dbPromise = new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (event) => {
      const db = req.result;
      if (event.oldVersion < 1) {
        db.createObjectStore('answers', { keyPath: 'questionId' });
        db.createObjectStore('surveys', { keyPath: 'id' });
        const questions = db.createObjectStore('questions', { keyPath: 'id' });
        questions.createIndex('surveyId', 'surveyId');
        const photos = db.createObjectStore('photos', { keyPath: 'id' });
        photos.createIndex('questionId', 'questionId');
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
    req.onblocked = () => reject(new Error('Database upgrade blocked by another open tab'));
  });
  return dbPromise;
}

/** Runs fn(store) inside a transaction and resolves once the transaction commits. */
async function tx(storeNames, mode, fn) {
  const db = await open();
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeNames, mode);
    let result;
    transaction.oncomplete = () => resolve(result);
    transaction.onerror = () => reject(transaction.error);
    transaction.onabort = () => reject(transaction.error || new Error('Transaction aborted'));
    const stores = Array.isArray(storeNames)
      ? storeNames.map((n) => transaction.objectStore(n))
      : transaction.objectStore(storeNames);
    Promise.resolve(fn(stores))
      .then((r) => { result = r; })
      .catch((e) => { try { transaction.abort(); } catch (_) { /* already done */ } reject(e); });
  });
}

const wrap = (request) => new Promise((resolve, reject) => {
  request.onsuccess = () => resolve(request.result);
  request.onerror = () => reject(request.error);
});

// ---------------------------------------------------------------------------
// Answers
// ---------------------------------------------------------------------------

/** All answers as a { questionId: answer } map. */
export async function loadAnswers() {
  const rows = await tx('answers', 'readonly', (s) => wrap(s.getAll()));
  return Object.fromEntries(rows.map((r) => [r.questionId, r]));
}

export function putAnswer(answer) {
  return tx('answers', 'readwrite', (s) => wrap(s.put({ ...answer, timestamp: Date.now() })));
}

export function deleteAnswer(questionId) {
  return tx('answers', 'readwrite', (s) => wrap(s.delete(questionId)));
}

/** Clears every answer and every attached photo. */
export function clearAnswers() {
  return tx(['answers', 'photos'], 'readwrite', ([answers, photos]) =>
    Promise.all([wrap(answers.clear()), wrap(photos.clear())]));
}

// ---------------------------------------------------------------------------
// Surveys
// ---------------------------------------------------------------------------

export function loadSurveys() {
  return tx('surveys', 'readonly', async (s) => {
    const rows = await wrap(s.getAll());
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  });
}

export function putSurvey(survey) {
  return tx('surveys', 'readwrite', (s) => wrap(s.put(survey)));
}

export function loadQuestions(surveyId) {
  return tx('questions', 'readonly', async (s) => {
    const rows = await wrap(s.index('surveyId').getAll(surveyId));
    return rows.sort((a, b) => a.sortOrder - b.sortOrder);
  });
}

export async function countQuestions(surveyId) {
  return tx('questions', 'readonly', (s) => wrap(s.index('surveyId').count(surveyId)));
}

export function replaceQuestions(surveyId, questions) {
  return tx('questions', 'readwrite', async (s) => {
    const existing = await wrap(s.index('surveyId').getAllKeys(surveyId));
    await Promise.all(existing.map((k) => wrap(s.delete(k))));
    await Promise.all(questions.map((q) => wrap(s.put(q))));
  });
}

export function deleteSurvey(surveyId) {
  return tx(['surveys', 'questions'], 'readwrite', async ([surveys, questions]) => {
    const keys = await wrap(questions.index('surveyId').getAllKeys(surveyId));
    await Promise.all(keys.map((k) => wrap(questions.delete(k))));
    await wrap(surveys.delete(surveyId));
  });
}

// ---------------------------------------------------------------------------
// Photos
// ---------------------------------------------------------------------------

export function addPhoto(questionId, blob) {
  const record = {
    id: `${questionId}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    questionId,
    blob,
    createdAt: Date.now(),
  };
  return tx('photos', 'readwrite', (s) => wrap(s.put(record))).then(() => record);
}

export function loadPhotos(questionId) {
  return tx('photos', 'readonly', async (s) => {
    const rows = await wrap(s.index('questionId').getAll(questionId));
    return rows.sort((a, b) => a.createdAt - b.createdAt);
  });
}

export function countPhotos(questionId) {
  return tx('photos', 'readonly', (s) => wrap(s.index('questionId').count(questionId)));
}

export function deletePhoto(id) {
  return tx('photos', 'readwrite', (s) => wrap(s.delete(id)));
}

export function countAllPhotos() {
  return tx('photos', 'readonly', (s) => wrap(s.count()));
}

export function countAllAnswers() {
  return tx('answers', 'readonly', (s) => wrap(s.count()));
}
