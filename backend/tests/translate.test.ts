import request from 'supertest';
import createApp from '../src/createApp';

jest.mock('../src/utils/db-client', () => ({
    __esModule: true,
    default: { query: jest.fn(async () => []) },
}));

// Skip Cognito/DB parent lookup: treat every request as an authenticated parent
jest.mock('../src/middlewares/mobileAuth', () => {
    const actual = jest.requireActual('../src/middlewares/mobileAuth');
    return {
        ...actual,
        verifyToken: (req: any, _res: any, next: any) => {
            req.user = { id: 1, school_id: 1 };
            next();
        },
        verifyStudentToken: (req: any, _res: any, next: any) => {
            req.user = { id: 2, school_id: 1 };
            next();
        },
    };
});

const azureOk = (items: { text: string; lang?: string }[]) =>
    ({
        ok: true,
        status: 200,
        json: async () =>
            items.map(i => ({
                detectedLanguage: { language: i.lang ?? 'ja', score: 1 },
                translations: [{ text: i.text, to: 'uz' }],
            })),
    }) as any;

describe('POST /mobile/translate (Azure experiment)', () => {
    const app = createApp();
    const fetchMock = jest.fn();

    beforeAll(() => {
        (global as any).fetch = fetchMock;
    });

    beforeEach(() => {
        fetchMock.mockReset();
        process.env.AZURE_TRANSLATOR_KEY = 'test-key';
        process.env.AZURE_TRANSLATOR_REGION = 'japaneast';
        delete process.env.AZURE_TRANSLATOR_ENDPOINT;
    });

    test('returns 503 when Azure is not configured', async () => {
        delete process.env.AZURE_TRANSLATOR_KEY;

        const res = await request(app)
            .post('/mobile/translate')
            .send({ texts: ['こんにちは'], to: 'uz' });

        expect(res.status).toBe(503);
        expect(res.body.error).toBe('translator_not_configured');
        expect(fetchMock).not.toHaveBeenCalled();
    });

    test('translates and sends the right request to Azure', async () => {
        fetchMock.mockResolvedValueOnce(
            azureOk([{ text: 'Salom' }, { text: '<p>Ertaga dars yo‘q</p>' }])
        );

        const res = await request(app)
            .post('/mobile/translate')
            .send({
                texts: ['こんにちは', '<p>明日は休校です</p>'],
                to: 'uz',
                textType: 'html',
            });

        expect(res.status).toBe(200);
        expect(res.body).toEqual({
            to: 'uz',
            translations: [
                { text: 'Salom', detectedLanguage: 'ja', detectedScore: 1 },
                {
                    text: '<p>Ertaga dars yo‘q</p>',
                    detectedLanguage: 'ja',
                    detectedScore: 1,
                },
            ],
        });

        const [url, init] = fetchMock.mock.calls[0];
        expect(url).toBe(
            'https://api.cognitive.microsofttranslator.com/translate?api-version=3.0&to=uz&textType=html'
        );
        expect(init.headers['Ocp-Apim-Subscription-Key']).toBe('test-key');
        expect(init.headers['Ocp-Apim-Subscription-Region']).toBe('japaneast');
        expect(JSON.parse(init.body)).toEqual([
            { Text: 'こんにちは' },
            { Text: '<p>明日は休校です</p>' },
        ]);
    });

    test('student route uses the same translator', async () => {
        fetchMock.mockResolvedValueOnce(azureOk([{ text: 'Salom' }]));

        const res = await request(app)
            .post('/mobile/student/translate')
            .send({ texts: ['こんにちは'], to: 'uz' });

        expect(res.status).toBe(200);
        expect(res.body.translations[0].text).toBe('Salom');
    });

    test('maps Azure errors to 502', async () => {
        fetchMock.mockResolvedValueOnce({
            ok: false,
            status: 401,
            json: async () => ({
                error: { code: 401000, message: 'invalid subscription key' },
            }),
        });

        const res = await request(app)
            .post('/mobile/translate')
            .send({ texts: ['hello'], to: 'ja' });

        expect(res.status).toBe(502);
        expect(res.body.error).toBe('invalid subscription key');
    });

    test.each([
        [{ texts: [], to: 'uz' }, 400, 'invalid_texts'],
        [{ texts: [123], to: 'uz' }, 400, 'invalid_texts'],
        [{ texts: ['hi'], to: 'de' }, 400, 'invalid_target'],
        [{ texts: ['hi'], to: 'uz', textType: 'md' }, 400, 'invalid_text_type'],
        [{ texts: ['x'.repeat(10_001)], to: 'uz' }, 413, 'text_too_long'],
    ])('rejects bad input %#', async (body, status, error) => {
        const res = await request(app).post('/mobile/translate').send(body);
        expect(res.status).toBe(status);
        expect(res.body.error).toBe(error);
        expect(fetchMock).not.toHaveBeenCalled();
    });
});
