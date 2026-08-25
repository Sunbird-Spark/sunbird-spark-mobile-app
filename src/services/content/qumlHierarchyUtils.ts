import _ from 'lodash';

export const QUESTION_MIME = 'application/vnd.sunbird.question';
export const QUESTIONSET_MIME = 'application/vnd.sunbird.questionset';

/**
 * Recursively collects all question identifiers from a questionset hierarchy tree.
 */
export function collectQuestionIds(node: any): string[] {
  if (!node) return [];
  const currentId =
    node.mimeType === QUESTION_MIME && node.identifier ? [node.identifier] : [];
  const childIds = _.flatMap(_.get(node, 'children', []), collectQuestionIds);
  return [...currentId, ...childIds];
}

/**
 * Replaces question stub nodes in the hierarchy with full question objects
 * (body, responseDeclaration, interactions, etc.) from `questionMap`.
 * If a question isn't in the map, the existing node is kept as-is — so this is
 * safe whether questions arrive separately or are already inlined in the tree.
 *
 * Every replaced (or kept) question node gets `applyMaxScore`/
 * `alignResponseDeclarationTypes` applied before being returned, so per-question
 * scoring is correct regardless of whether the question came from the list API
 * or was already inlined in the hierarchy.
 */
export function replaceQuestionsInHierarchy(node: any, questionMap: Map<string, any>): any {
  if (!node) return node;

  if (node.mimeType === QUESTION_MIME && node.identifier) {
    const q = questionMap.get(node.identifier) || node;
    applyMaxScore(q);
    alignResponseDeclarationTypes(q);
    return q;
  }

  const children = _.get(node, 'children');
  if (Array.isArray(children)) {
    node.children = _.map(children, (child) => replaceQuestionsInHierarchy(child, questionMap));
  }

  return node;
}

/** Normalises `outcomeDeclaration` into an object, parsing it if it arrived as a JSON string (some content publishes it that way, and assigning `.maxScore` onto a string throws in strict mode). */
function normaliseOutcomeDeclaration(node: any): Record<string, any> {
  let outcome = _.get(node, 'outcomeDeclaration');
  if (typeof outcome === 'string') {
    try {
      outcome = JSON.parse(outcome);
    } catch {
      outcome = {};
    }
  }
  if (!outcome || typeof outcome !== 'object') outcome = {};
  node.outcomeDeclaration = outcome;
  return outcome;
}

/**
 * Resolve a node's max score using the SAME precedence as the player's own
 * normaliser (top-level `maxScore`, then `outcomeDeclaration.maxScore.defaultValue`,
 * then 1), so filling these in can never change the value it would have computed.
 *
 * The `> 0` tests are deliberate, and a considered change from the older
 * `ensureMaxScore` (which only filled in a MISSING value and so preserved an
 * explicit `0`): a declared max score of `0` makes the player's score-fraction
 * a division by zero, so it is treated as unset rather than honoured. The tests
 * below pin this down (`resolveMaxScore({ maxScore: 0 }) === 1`). If authored
 * `0` ever needs to survive, the score-fraction consumers need a
 * divide-by-zero guard first.
 */
export function resolveMaxScore(node: any): number {
  const top = _.get(node, 'maxScore');
  if (top != null && Number.isFinite(Number(top)) && Number(top) > 0) return Number(top);
  const declared = _.get(node, 'outcomeDeclaration.maxScore.defaultValue');
  if (declared != null && Number.isFinite(Number(declared)) && Number(declared) > 0) {
    return Number(declared);
  }
  return 1;
}

/**
 * Writes the resolved max score to both places it can be read from, so the two
 * never disagree.
 *
 * The player reads them inconsistently: its question normaliser prefers the
 * top-level `maxScore`, while the score-fraction normaliser prefers
 * `outcomeDeclaration.maxScore.defaultValue`. `question/v2/list` typically
 * returns only the latter, so mirroring keeps every code path in the player
 * agreeing on one number.
 */
export function applyMaxScore(node: any): any {
  const outcome = normaliseOutcomeDeclaration(node);
  const maxScore = resolveMaxScore(node);
  // Preserve any cardinality/type the content already declares; only the value
  // and its top-level mirror are ours to fill in.
  node.outcomeDeclaration.maxScore = {
    cardinality: 'single',
    type: 'integer',
    ...outcome.maxScore,
    defaultValue: maxScore,
  };
  node.maxScore = maxScore;
  return node;
}

/**
 * Make a question's declared response type agree with the type of its own
 * interaction option values.
 *
 * This is what makes scoring work. The player scores multiple-choice and boolean
 * questions with a STRICT `===` between `responseDeclaration[key].correctResponse.value`
 * and the selected option's `value`, and it only coerces the correct response to a
 * number when the declaration says `type: 'integer'`. Sunbird content routinely
 * stores `correctResponse.value` as a string (`"0"`) while the interaction options
 * carry numeric values (`0`), so a missing or non-integer `type` leaves the
 * comparison as `0 === "0"` — permanently false. Every answer then scores 0, which
 * is exactly the "Best Score: 0/N even when correct" symptom.
 *
 * Declaring `integer` when the options are numeric lets the player's own
 * normaliser parse the correct response into the matching type. It is a no-op when
 * the declaration already says `integer` or when the options are not numeric.
 */
export function alignResponseDeclarationTypes(node: any): void {
  const responseDeclaration = _.get(node, 'responseDeclaration');
  if (!responseDeclaration || typeof responseDeclaration !== 'object') return;
  const interactions = _.get(node, 'interactions') ?? {};

  Object.keys(responseDeclaration).forEach((key) => {
    const declaration = responseDeclaration[key];
    if (!declaration || typeof declaration !== 'object') return;
    if (String(declaration.type ?? '').toLowerCase() === 'integer') return;

    const options = _.get(interactions, [key, 'options']);
    if (!Array.isArray(options) || options.length === 0) return;
    const allNumeric = options.every((option: any) => typeof option?.value === 'number');
    if (!allNumeric) return;

    declaration.type = 'integer';
  });
}

/**
 * Ensures the questionset metadata has the outcomeDeclaration.maxScore structure
 * the QuML player expects.
 *
 * @deprecated Kept as a thin alias over `applyMaxScore` for existing callers;
 * prefer `applyMaxScore` (and `alignResponseDeclarationTypes`) directly.
 */
export function ensureMaxScore(metadata: any): any {
  return applyMaxScore(metadata);
}
