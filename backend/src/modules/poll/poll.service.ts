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

        grouped.forEach((allOptionRows, postId) => {
            const firstPollId = allOptionRows[0].poll_id;
            const optionRows = allOptionRows.filter(
                r => r.poll_id === firstPollId
            );
            const myOptionId = myVotes.get(postId) ?? null;
            const visible = !viewer || myOptionId !== null;
            const total = optionRows.reduce((s, r) => s + Number(r.votes), 0);

            result.set(postId, {
                id: firstPollId,
                question: optionRows[0].question ?? null,
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
     * Barcha postlar uchun barcha poll natijalari (har bir postga massiv)
     */
    async getAllForPosts(
        postIds: number[],
        viewer?: Viewer
    ): Promise<Map<number, PollResult[]>> {
        const result = new Map<number, PollResult[]>();
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
            votes.forEach(v =>
                myVotes.set(Number(v.poll_id), Number(v.option_id))
            );
        }

        const pollGrouped = new Map<
            number,
            { postId: number; rows: typeof rows }
        >();
        for (const row of rows) {
            const existing = pollGrouped.get(row.poll_id);
            if (existing) {
                existing.rows.push(row);
            } else {
                pollGrouped.set(row.poll_id, {
                    postId: Number(row.post_id),
                    rows: [row],
                });
            }
        }

        pollGrouped.forEach(({ postId, rows: optionRows }, pollId) => {
            const myOptionId = myVotes.get(pollId) ?? null;
            const visible = !viewer || myOptionId !== null;
            const total = optionRows.reduce((s, r) => s + Number(r.votes), 0);

            const pollItem: PollResult = {
                id: pollId,
                question: optionRows[0].question ?? null,
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
            };

            const list = result.get(postId) ?? [];
            list.push(pollItem);
            result.set(postId, list);
        });

        return result;
    }

    /**
     * Mobil ro'yxat/detal qatorlariga `poll` maydonini qo'shadi (joyida o'zgartiradi).
     * Har bir qatorda `post_id` bo'lishi kerak.
     */
    async attachToRows(rows: any[], viewer: Viewer): Promise<any[]> {
        const postIds = rows
            .map(r => Number(r.post_id ?? r.id))
            .filter(Boolean);
        const polls = await this.getForPosts(postIds, viewer);
        const allPolls = await this.getAllForPosts(postIds, viewer);
        for (const row of rows) {
            const pId = Number(row.post_id ?? row.id);
            row.poll = polls.get(pId) ?? null;
            row.polls = allPolls.get(pId) ?? [];
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
        const allPolls = await this.getAllForPosts([postId]);
        const voters = await pollRepository.findVotersByPostId(postId);

        const votersByOption = new Map<number, any[]>();
        for (const v of voters) {
            const list = votersByOption.get(v.option_id) ?? [];
            list.push({
                voter_type: v.voter_type,
                voter_id: v.voter_id,
                given_name: v.given_name,
                family_name: v.family_name,
                email: v.email,
                student_number: v.student_number,
                created_at: v.created_at,
            });
            votersByOption.set(v.option_id, list);
        }

        const pollList = (allPolls.get(postId) ?? []).map(p => ({
            ...p,
            options: p.options.map(opt => ({
                ...opt,
                voters: votersByOption.get(opt.id) ?? [],
            })),
        }));

        const singlePoll = polls.get(postId);
        const pollWithVoters = singlePoll
            ? {
                  ...singlePoll,
                  options: singlePoll.options.map(opt => ({
                      ...opt,
                      voters: votersByOption.get(opt.id) ?? [],
                  })),
              }
            : null;

        return {
            poll: pollWithVoters,
            polls: pollList,
        };
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

        const allPolls = await this.getAllForPosts([postId], {
            type: voterType,
            id: voterId,
        });
        const pollList = allPolls.get(postId) ?? [];
        const currentPoll =
            pollList.find(p => p.id === option.poll_id) ?? pollList[0] ?? null;
        return {
            poll: currentPoll,
            polls: pollList,
        };
    }

    /**
     * Ovozni olib tashlash.
     * Ovoz bermagan bo'lsa ham xato bermaydi (idempotent).
     * Natija: results_visible=false, votes/percent=null.
     */
    async removeVote(params: {
        postId: number;
        pollId?: number;
        voterType: VoterType;
        voterId: number;
    }) {
        const { postId, pollId, voterType, voterId } = params;

        await this.assertAccess(postId, voterType, voterId);

        await pollRepository.deleteVote(postId, voterType, voterId, pollId);

        const allPolls = await this.getAllForPosts([postId], {
            type: voterType,
            id: voterId,
        });
        const pollList = allPolls.get(postId) ?? [];
        return {
            poll: pollList[0] ?? null,
            polls: pollList,
        };
    }
}

export const pollService = new PollService();