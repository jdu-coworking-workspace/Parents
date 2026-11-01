/**
 * Poll Service
 *
 * Business logic: natijalarni hisoblash, foiz, ovoz berish qoidalari
 */

import { pollRepository, VoterType } from './poll.repository';
import { postRepository } from '../post/post.repository';
import { ApiError } from '../../errors/ApiError';
import type { PollResult } from '../post/types/post.dto';

export interface Viewer {
    type: VoterType;
    id: number;
}

export class PollService {
    /**
     * Postlar uchun poll natijalari.
     * viewer berilmasa (admin) natija doim ko'rinadi.
     * viewer berilsa, natija (ovoz soni va foiz) faqat ovoz bergandan keyin ko'rinadi.
     * Ovoz olib tashlansa, natija yana yashiriladi.
     */
    async getForPosts(
        postIds: number[],
        viewer?: Viewer
    ): Promise<Map<number, PollResult>> {
        const result = new Map<number, PollResult>();
        const uniqueIds = Array.from(new Set(postIds.filter(Boolean)));
        if (uniqueIds.length === 0) return result;

        const rows = await pollRepository.findResultsByPostIds(uniqueIds);
        if (rows.length === 0) return result;

        const myVotes = new Map<number, number>();
        if (viewer) {
            const votes = await pollRepository.findVotesByVoter(
                uniqueIds,
                viewer.type,
                viewer.id
            );
            votes.forEach(v => myVotes.set(v.post_id, v.option_id));
        }

        // post_id bo'yicha guruhlash
        const grouped = new Map<number, typeof rows>();
        for (const row of rows) {
            const list = grouped.get(row.post_id) ?? [];
            list.push(row);
            grouped.set(row.post_id, list);
        }

        grouped.forEach((optionRows, postId) => {
            const myOptionId = myVotes.get(postId) ?? null;
            const visible = !viewer || myOptionId !== null;
            const total = optionRows.reduce((s, r) => s + Number(r.votes), 0);

            result.set(postId, {
                id: optionRows[0].poll_id,
                my_option_id: myOptionId,
                results_visible: visible,
                total_votes: visible ? total : null,
                options: optionRows.map(r => {
                    const votes = Number(r.votes);
                    return {
                        id: r.option_id,
                        text: r.option_text,
                        votes: visible ? votes : null,
                        percent: visible
                            ? total > 0
                                ? Math.round((votes / total) * 1000) / 10
                                : 0
                            : null,
                    };
                }),
            });
        });

        return result;
    }

    /**
     * Mobil ro'yxat/detal qatorlariga `poll` maydonini qo'shadi (joyida o'zgartiradi).
     * Har bir qatorda `post_id` bo'lishi kerak.
     */
    async attachToRows(rows: any[], viewer: Viewer): Promise<any[]> {
        const postIds = rows.map(r => Number(r.post_id)).filter(Boolean);
        const polls = await this.getForPosts(postIds, viewer);
        for (const row of rows) {
            row.poll = polls.get(Number(row.post_id)) ?? null;
        }
        return rows;
    }

    /**
     * Admin uchun: post natijalari (doim ko'rinadi)
     */
    async getAdminResults(postId: number, schoolId: number) {
        const post = await postRepository.findById(postId, schoolId);
        if (!post) {
            throw new ApiError(404, 'post_not_found');
        }
        const polls = await this.getForPosts([postId]);
        return { poll: polls.get(postId) ?? null };
    }

    /**
     * Postga ruxsat bormi (ota-ona yoki o'quvchiga yuborilganmi)
     */
    private async assertAccess(
        postId: number,
        voterType: VoterType,
        voterId: number
    ) {
        const hasAccess =
            voterType === 'parent'
                ? await pollRepository.parentHasPost(postId, voterId)
                : await pollRepository.studentHasPost(postId, voterId);
        if (!hasAccess) {
            throw new ApiError(403, 'poll_forbidden');
        }
    }

    /**
     * Ovoz berish yoki ovozni almashtirish (ota-ona yoki o'quvchi).
     * Agar avval ovoz bergan bo'lsa, yangi variantga o'tkaziladi.
     */
    async vote(params: {
        postId: number;
        optionId: number;
        voterType: VoterType;
        voterId: number;
    }) {
        const { postId, optionId, voterType, voterId } = params;

        await this.assertAccess(postId, voterType, voterId);

        const option = await pollRepository.findOption(postId, optionId);
        if (!option) {
            throw new ApiError(404, 'poll_option_not_found');
        }

        await pollRepository.upsertVote({
            poll_id: option.poll_id,
            option_id: optionId,
            voter_type: voterType,
            voter_id: voterId,
        });

        const polls = await this.getForPosts([postId], {
            type: voterType,
            id: voterId,
        });
        return { poll: polls.get(postId) ?? null };
    }

    /**
     * Ovozni olib tashlash.
     * Ovoz bermagan bo'lsa ham xato bermaydi (idempotent).
     * Natija: results_visible=false, votes/percent=null.
     */
    async removeVote(params: {
        postId: number;
        voterType: VoterType;
        voterId: number;
    }) {
        const { postId, voterType, voterId } = params;

        await this.assertAccess(postId, voterType, voterId);

        await pollRepository.deleteVote(postId, voterType, voterId);

        const polls = await this.getForPosts([postId], {
            type: voterType,
            id: voterId,
        });
        return { poll: polls.get(postId) ?? null };
    }
}

export const pollService = new PollService();