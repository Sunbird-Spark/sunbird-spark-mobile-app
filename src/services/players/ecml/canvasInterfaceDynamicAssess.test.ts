import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import BRIDGE from '../../../../content-player/canvas-interface.js?raw';

const realParse = JSON.parse;

type AnyRecord = Record<string, any>;

const quizBody = (questionIds: string[], extraConfig: AnyRecord = { dynamic_assess: { target: { E: 1 } } }) => ({
  theme: {
    stage: [{
      id: 'stage-1',
      'org.ekstep.questionset': {
        id: 'quiz-1',
        config: { __cdata: JSON.stringify({ total_items: questionIds.length, max_score: questionIds.length, ...extraConfig }) },
        data: { __cdata: JSON.stringify(questionIds.map((id) => ({ identifier: id, max_score: 1 }))) },
        'org.ekstep.question': questionIds.map((id) => ({ id, src: `content-plugins/q/${id}` })),
      },
    }],
  },
});

const quizOf = (body: AnyRecord) => body.theme.stage[0]['org.ekstep.questionset'];
const ids = (body: AnyRecord) => quizOf(body)['org.ekstep.question'].map((q: AnyRecord) => q.id);
const itemIds = (body: AnyRecord) => realParse(quizOf(body).data.__cdata).map((i: AnyRecord) => i.identifier);
const configOf = (body: AnyRecord) => realParse(quizOf(body).config.__cdata);

describe('canvas-interface.js Dynamic Assess index.json filter', () => {
  let pkg: AnyRecord;
  let globalConfig: AnyRecord;
  let originalGetJSON: ReturnType<typeof vi.fn>;

  const loadBridge = () => {
    new Function(BRIDGE)();
    window.dispatchEvent(new MessageEvent('message', { data: { __ecmlPlayerConfig: true, config: {} }, source: window.parent, origin: window.location.origin }));
  };
  const fetchIndex = (url = 'https://cdn.example/content/ecml/do_1-latest/index.json') => {
    let received: AnyRecord | undefined;
    (window as AnyRecord).jQuery.getJSON(url, (json: AnyRecord) => { received = json; });
    return received;
  };

  beforeEach(() => {
    pkg = quizBody(['q1', 'q2', 'q3', 'q4']);
    globalConfig = { metadata: { primaryCategory: 'Dynamic Course Assessment' }, data: JSON.stringify(quizBody(['q2', 'q4'], { dynamic_assess: {}, max_score: 2 })) };
    originalGetJSON = vi.fn((_url: string, cb: (json: AnyRecord) => void) => { cb(pkg); return { fail: vi.fn() }; });
    (window as AnyRecord).jQuery = { getJSON: originalGetJSON };
    (window as AnyRecord).EkstepRendererAPI = { getGlobalConfig: () => globalConfig };
    (window as AnyRecord).initializePreview = vi.fn();
    loadBridge();
  });

  afterEach(() => {
    JSON.parse = realParse;
    delete (window as AnyRecord).jQuery;
    delete (window as AnyRecord).EkstepRendererAPI;
    delete (window as AnyRecord).initializePreview;
  });

  it('keeps only the questions the app drew for Dynamic Course Assessment', () => {
    const body = fetchIndex()!;
    expect(ids(body)).toEqual(['q2', 'q4']);
    expect(itemIds(body)).toEqual(['q2', 'q4']);
    expect(configOf(body).total_items).toBe(2);
    expect(configOf(body).max_score).toBe(2);
    expect(quizOf(body)['org.ekstep.question'][0].src).toBe('content-plugins/q/q2');
    expect((window as AnyRecord).initializePreview).toHaveBeenCalled();
  });

  it('leaves non-Dynamic ECML untouched and calls the original getJSON with the original callback', () => {
    globalConfig.metadata.primaryCategory = 'Learning Resource';
    const cb = vi.fn();
    (window as AnyRecord).jQuery.getJSON('https://cdn.example/x/index.json', cb);
    expect(originalGetJSON).toHaveBeenCalledWith('https://cdn.example/x/index.json', cb);
    expect(ids(cb.mock.calls[0][0])).toEqual(['q1', 'q2', 'q3', 'q4']);
  });

  it('leaves other JSON requests of Dynamic content untouched', () => {
    const cb = vi.fn();
    (window as AnyRecord).jQuery.getJSON('https://localhost/content-player/coreplugins/x/manifest.json', cb);
    expect(originalGetJSON).toHaveBeenCalledWith('https://localhost/content-player/coreplugins/x/manifest.json', cb);
  });

  it('plays no questions when the app passed no drawn body', () => {
    globalConfig.data = undefined;
    const body = fetchIndex()!;
    expect(ids(body)).toEqual([]);
    expect(itemIds(body)).toEqual([]);
    expect(configOf(body).total_items).toBe(0);
  });

  it('leaves a quiz without a dynamic_assess block untouched', () => {
    pkg = quizBody(['q1', 'q2'], {});
    const body = fetchIndex()!;
    expect(ids(body)).toEqual(['q1', 'q2']);
  });

  it('wraps getJSON only once even if the bridge loads again', () => {
    const first = (window as AnyRecord).jQuery.getJSON;
    loadBridge();
    expect((window as AnyRecord).jQuery.getJSON).toBe(first);
  });
});
