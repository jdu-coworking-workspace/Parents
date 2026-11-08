import request from 'supertest';
import createApp from '../src/createApp';

jest.mock('../src/utils/db-client', () => ({
    __esModule: true,
    default: {
        query: jest.fn(async () => []),
        execute: jest.fn(async () => ({ insertId: 1 })),
        beginTransaction: jest.fn(async () => ({})),
        commitTransaction: jest.fn(async () => undefined),
        rollbackTransaction: jest.fn(async () => undefined),
        executeWithConnection: jest.fn(async () => ({})),
    },
}));

const faqRow = (overrides: Record<string, unknown> = {}) => ({
    id: 1,
    question: 'Q?',
    answer: 'A.',
    audience: 'parents',
    sort_order: 1,
    created_at: '2026-10-18T10:00:00.000Z',
    edited_at: '2026-10-18T10:00:00.000Z',
    ...overrides,
});

describe('FAQ admin endpoints', () => {
    const app = createApp();
    const DB = require('../src/utils/db-client').default;

    beforeEach(() => {
        jest.clearAllMocks();
        DB.query.mockResolvedValue([]);
        DB.execute.mockResolvedValue({ insertId: 1 });
    });

    test('GET /admin-panel/faq/list filters by audience and school', async () => {
        DB.query.mockResolvedValueOnce([faqRow()]);

        const res = await request(app)
            .get('/admin-panel/faq/list?audience=parents')
            .set('x-test-auth', '1');

        expect(res.status).toBe(200);
        expect(res.body.faqs).toHaveLength(1);
        expect(DB.query).toHaveBeenCalledWith(
            expect.stringContaining('AND audience = :audience'),
            { school_id: 1, audience: 'parents' }
        );
    });

    test('GET /admin-panel/faq/list rejects invalid audience', async () => {
        const res = await request(app)
            .get('/admin-panel/faq/list?audience=teachers')
            .set('x-test-auth', '1');

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_audience');
    });

    test('POST /admin-panel/faq/create appends to end of audience list', async () => {
        DB.query
            .mockResolvedValueOnce([{ next_order: 4 }])
            .mockResolvedValueOnce([
                faqRow({ id: 7, audience: 'students', sort_order: 4 }),
            ]);
        DB.execute.mockResolvedValueOnce({ insertId: 7 });

        const res = await request(app)
            .post('/admin-panel/faq/create')
            .set('x-test-auth', '1')
            .send({ question: '  Q?  ', answer: 'A.', audience: 'students' });

        expect(res.status).toBe(201);
        expect(res.body.faq).toMatchObject({ id: 7, sort_order: 4 });
        expect(DB.execute).toHaveBeenCalledWith(
            expect.stringContaining('INSERT INTO Faq'),
            expect.objectContaining({
                question: 'Q?',
                audience: 'students',
                sort_order: 4,
                school_id: 1,
            })
        );
    });

    test('POST /admin-panel/faq/create validates body', async () => {
        const res = await request(app)
            .post('/admin-panel/faq/create')
            .set('x-test-auth', '1')
            .send({ question: '', answer: 'A.', audience: 'parents' });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_question');
        expect(DB.execute).not.toHaveBeenCalled();
    });

    test('PUT /admin-panel/faq/:id returns 404 for FAQ of another school', async () => {
        DB.query.mockResolvedValueOnce([]);

        const res = await request(app)
            .put('/admin-panel/faq/5')
            .set('x-test-auth', '1')
            .send({ question: 'Q?', answer: 'A.', audience: 'parents' });

        expect(res.status).toBe(404);
        expect(res.body.error).toBe('faq_not_found');
        expect(DB.execute).not.toHaveBeenCalled();
    });

    test('PUT /admin-panel/faq/:id updates FAQ', async () => {
        DB.query
            .mockResolvedValueOnce([faqRow({ id: 5, sort_order: 2 })])
            .mockResolvedValueOnce([faqRow({ id: 5, question: 'New?' })]);

        const res = await request(app)
            .put('/admin-panel/faq/5')
            .set('x-test-auth', '1')
            .send({ question: 'New?', answer: 'A.', audience: 'parents' });

        expect(res.status).toBe(200);
        expect(DB.execute).toHaveBeenCalledWith(
            expect.stringContaining('UPDATE Faq'),
            expect.objectContaining({
                id: 5,
                school_id: 1,
                question: 'New?',
                sort_order: 2,
            })
        );
    });

    test('DELETE /admin-panel/faq/:id deletes FAQ', async () => {
        DB.query.mockResolvedValueOnce([faqRow({ id: 5 })]);

        const res = await request(app)
            .delete('/admin-panel/faq/5')
            .set('x-test-auth', '1');

        expect(res.status).toBe(200);
        expect(DB.execute).toHaveBeenCalledWith(
            expect.stringContaining('DELETE FROM Faq'),
            { id: 5, school_id: 1 }
        );
    });

    test('POST /admin-panel/faq/reorder rejects incomplete id list', async () => {
        DB.query.mockResolvedValueOnce([faqRow({ id: 1 }), faqRow({ id: 2 })]);

        const res = await request(app)
            .post('/admin-panel/faq/reorder')
            .set('x-test-auth', '1')
            .send({ audience: 'parents', ids: [2] });

        expect(res.status).toBe(400);
        expect(res.body.error).toBe('invalid_faq_ids');
        expect(DB.beginTransaction).not.toHaveBeenCalled();
    });

    test('POST /admin-panel/faq/reorder saves new order', async () => {
        DB.query
            .mockResolvedValueOnce([faqRow({ id: 1 }), faqRow({ id: 2 })])
            .mockResolvedValueOnce([
                faqRow({ id: 2, sort_order: 1 }),
                faqRow({ id: 1, sort_order: 2 }),
            ]);

        const res = await request(app)
            .post('/admin-panel/faq/reorder')
            .set('x-test-auth', '1')
            .send({ audience: 'parents', ids: [2, 1] });

        expect(res.status).toBe(200);
        expect(DB.executeWithConnection).toHaveBeenCalledTimes(2);
        expect(DB.executeWithConnection).toHaveBeenNthCalledWith(
            1,
            expect.anything(),
            expect.stringContaining('UPDATE Faq'),
            expect.objectContaining({ id: 2, sort_order: 1 })
        );
        expect(DB.commitTransaction).toHaveBeenCalled();
    });
});

describe('FAQ mobile endpoints', () => {
    test('listForMobile returns audience FAQs with latest edit time', async () => {
        const DB = require('../src/utils/db-client').default;
        DB.query.mockResolvedValueOnce([
            faqRow({ id: 1, edited_at: '2026-10-18T10:00:00.000Z' }),
            faqRow({ id: 2, edited_at: '2026-10-18T12:00:00.000Z' }),
        ]);

        const { faqService } = require('../src/modules/faq/faq.service');
        const result = await faqService.listForMobile(3, 'students');

        expect(DB.query).toHaveBeenCalledWith(
            expect.stringContaining('FROM Faq'),
            { school_id: 3, audience: 'students' }
        );
        expect(result.faqs).toHaveLength(2);
        expect(result.faqs[0]).not.toHaveProperty('audience');
        expect(result.updated_at).toBe('2026-10-18T12:00:00.000Z');
    });

    test('GET /mobile/faq requires auth', async () => {
        const res = await request(createApp()).get('/mobile/faq');
        expect(res.status).toBe(401);
    });

    test('GET /mobile/student/faq requires auth', async () => {
        const res = await request(createApp()).get('/mobile/student/faq');
        expect(res.status).toBe(401);
    });
});
