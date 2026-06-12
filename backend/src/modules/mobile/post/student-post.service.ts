import { mobileStudentPostRepository } from './student-post.repository';
import { config } from '../../../config';

export class MobileStudentPostService {
    async listPosts(params: {
        studentId: number;
        lastPostId: number;
        lastSentAt: string;
        readPostIds?: number[];
    }) {
        if (params.readPostIds && params.readPostIds.length > 0) {
            const viewedPosts =
                await mobileStudentPostRepository.listUnreadPostStudentIds({
                    studentId: params.studentId,
                    postIds: params.readPostIds,
                });

            if (viewedPosts.length > 0) {
                await mobileStudentPostRepository.markViewedByIds(
                    viewedPosts.map((p: any) => p.id)
                );
            }
        }

        return await mobileStudentPostRepository.listPosts({
            studentId: params.studentId,
            lastPostId: params.lastPostId,
            lastSentAt: params.lastSentAt,
            limit: config.PER_PAGE,
        });
    }

    async getPost(params: { postStudentId: string; studentId: number }) {
        return await mobileStudentPostRepository.findPostById(params);
    }

    async viewPost(params: { postStudentId: number; studentId: number }) {
        const post = await mobileStudentPostRepository.findPostStudentForView({
            postStudentId: params.postStudentId,
            studentId: params.studentId,
        });

        if (post.length === 0) {
            throw {
                status: 404,
                message: 'Post not Found',
            };
        }

        if (!post[0].viewed_at) {
            await mobileStudentPostRepository.markViewedByIds([params.postStudentId]);
        }
    }

    async viewExtended(params: {
        postStudentIds: number[];
        studentId: number;
    }) {
        const posts = await mobileStudentPostRepository.listUnreadPostStudentIds({
            studentId: params.studentId,
            postIds: params.postStudentIds,
        });

        if (posts.length === 0) {
            throw {
                status: 404,
                message: 'Post not Found',
            };
        }

        await mobileStudentPostRepository.markViewedByIds(
            posts.map((p: any) => p.id)
        );
    }

    async getUnreadCount(studentId: number) {
        return await mobileStudentPostRepository.countUnread(studentId);
    }
}

export const mobileStudentPostService = new MobileStudentPostService();
