import { DatabaseQueries } from '../../services/database/queries';
import { UnifiedPushService } from '../../services/unified/push';
import { PlayMobileService } from '../../services/playmobile/api';
import { AwsSmsService } from '../../services/aws/sms';
import { TelegramService } from '../../services/telegram/bot';
import { SmsTemplateService } from '../../services/sms/template-service';
import { buildParentNotificationMessageUrl } from '../../utils/parent-app-links';
import { getUzbekistanOperatorRouting } from '../../utils/validation';
import { NotificationPost } from '../../types/events';
import { NotificationResult } from 'types/responses';

export class NotificationProcessor {
    private telegramService: TelegramService;
    private smsTemplateService: SmsTemplateService;

    constructor(
        private dbQueries: DatabaseQueries,
        private unifiedPushService: UnifiedPushService,
        private playMobileService: PlayMobileService,
        private awsSmsService: AwsSmsService
    ) {
        this.telegramService = new TelegramService();
        this.smsTemplateService = new SmsTemplateService();
    }

    async processNotifications(): Promise<NotificationResult> {
        console.time('total-execution');

        try {
            console.time('db-fetch');
            const [parentPosts, studentPosts] = await Promise.all([
                this.dbQueries.fetchAllNotificationPosts(),
                this.dbQueries.fetchStudentNotificationPosts(),
            ]);
            console.timeEnd('db-fetch');

            const totalPosts = parentPosts.length + studentPosts.length;

            if (!totalPosts) {
                console.log('📭 No notifications to process');
                return { message: 'no notifications', count: 0, total: 0 };
            }

            // Separate posts into push-enabled and SMS-only
            const pushPosts = parentPosts.filter(
                post => post.arn && post.arn.trim() !== ''
            );
            const smsOnlyPosts = parentPosts.filter(
                post => (!post.arn || post.arn.trim() === '') && post.sms
            );

            console.log(`📋 Processing ${totalPosts} total notifications:`);
            console.log(`   📱 ${pushPosts.length} parent push tokens (ARN)`);
            console.log(
                `   📧 ${smsOnlyPosts.length} parent SMS-only (no ARN)`
            );
            console.log(
                `   🎓 ${studentPosts.length} student push notifications`
            );

            console.time('send-notifications');
            const parentResults = await this.sendMixedNotifications(
                pushPosts,
                smsOnlyPosts
            );
            const studentResults =
                await this.sendStudentNotifications(studentPosts);
            console.timeEnd('send-notifications');

            const successfulParentIds = parentResults.successful.map(id =>
                parseInt(id, 10)
            );
            const successfulStudentIds = studentResults.successful.map(id =>
                parseInt(id, 10)
            );

            if (successfulParentIds.length) {
                console.time('db-update');
                await this.dbQueries.updateProcessedPosts(successfulParentIds);
                console.timeEnd('db-update');
            }

            if (successfulStudentIds.length) {
                console.time('db-update-students');
                await this.dbQueries.updateProcessedStudentPosts(
                    successfulStudentIds
                );
                console.timeEnd('db-update-students');
            }

            const successfulTotal =
                successfulParentIds.length + successfulStudentIds.length;

            console.log(
                `✅ Successfully processed ${successfulTotal}/${totalPosts} notifications`
            );
            console.log(
                `   📱 Push notifications: ${parentResults.pushCount + studentResults.pushCount}`
            );
            console.log(`   📧 SMS notifications: ${parentResults.smsCount}`);

            return {
                message: 'success',
                count: successfulTotal,
                total: totalPosts,
                push_count: parentResults.pushCount + studentResults.pushCount,
                sms_only_count: parentResults.smsOnlyCount,
            };
        } catch (e) {
            console.error('❌ Error in processNotifications:', e);
            return { message: 'error', count: 0, total: 0, error: String(e) };
        } finally {
            console.timeEnd('total-execution');
        }
    }

    private async sendMixedNotifications(
        pushPosts: NotificationPost[],
        smsOnlyPosts: NotificationPost[]
    ): Promise<{
        successful: string[];
        pushCount: number;
        smsCount: number;
        smsOnlyCount: number;
    }> {
        const results = {
            successful: [] as string[],
            pushCount: 0,
            smsCount: 0,
            smsOnlyCount: 0,
        };

        // Process push-enabled posts (can have both push + SMS)
        if (pushPosts.length > 0) {
            console.log(
                `🔄 Processing ${pushPosts.length} push-enabled notifications...`
            );

            const pushPromises = pushPosts.map(async post => {
                try {
                    let hasSuccessfulNotification = false;

                    // Send Telegram notification
                    const telegramSuccess =
                        await this.telegramService.sendNotification(post);
                    if (telegramSuccess) {
                        hasSuccessfulNotification = true;
                    }

                    // Send push notification (these have ARN) using unified service
                    const pushSuccess =
                        await this.unifiedPushService.sendPushNotification(
                            post
                        );
                    if (pushSuccess) {
                        hasSuccessfulNotification = true;
                        results.pushCount++;
                        console.log(`📱 Push sent to post ${post.id}`);
                    }

                    // Send SMS if enabled for this priority level
                    if (post.sms && post.phone_number) {
                        const smsSuccess = await this.sendSMS(post);
                        if (smsSuccess) {
                            hasSuccessfulNotification = true;
                            results.smsCount++;
                            console.log(
                                `📧 SMS sent to post ${post.id} (with ARN)`
                            );
                        }
                    }

                    return hasSuccessfulNotification ? post.id : null;
                } catch (error) {
                    console.error(
                        `❌ Error processing push post ${post.id}:`,
                        error
                    );
                    return null;
                }
            });

            const pushResults = await Promise.all(pushPromises);
            const successfulPushIds = pushResults.filter(
                id => id !== null
            ) as string[];
            results.successful.push(...successfulPushIds);
        }

        // Process SMS-only posts (no ARN, SMS only)
        if (smsOnlyPosts.length > 0) {
            console.log(
                `🔄 Processing ${smsOnlyPosts.length} SMS-only notifications...`
            );

            const smsOnlyPromises = smsOnlyPosts.map(async post => {
                try {
                    let hasSuccessfulNotification = false;

                    // Send Telegram notification
                    const telegramSuccess =
                        await this.telegramService.sendNotification(post);
                    if (telegramSuccess) {
                        hasSuccessfulNotification = true;
                    }

                    // Send SMS (these don't have ARN, so SMS only)
                    if (post.phone_number) {
                        const smsSuccess = await this.sendSMS(post);
                        if (smsSuccess) {
                            hasSuccessfulNotification = true;
                            results.smsOnlyCount++;
                            console.log(
                                `📧 SMS-only sent to post ${post.id} (no ARN)`
                            );
                        }
                    }

                    return hasSuccessfulNotification ? post.id : null;
                } catch (error) {
                    console.error(
                        `❌ Error processing SMS-only post ${post.id}:`,
                        error
                    );
                    return null;
                }
            });

            const smsOnlyResults = await Promise.all(smsOnlyPromises);
            const successfulSmsOnlyIds = smsOnlyResults.filter(
                id => id !== null
            ) as string[];
            results.successful.push(...successfulSmsOnlyIds);
        }

        return results;
    }

    private async sendStudentNotifications(
        posts: NotificationPost[]
    ): Promise<{ successful: string[]; pushCount: number }> {
        const results = {
            successful: [] as string[],
            pushCount: 0,
        };

        if (!posts.length) {
            return results;
        }

        console.log(
            `🔄 Processing ${posts.length} student push notifications...`
        );

        const pushPromises = posts.map(async post => {
            try {
                const pushSuccess =
                    await this.unifiedPushService.sendPushNotification(post);

                if (pushSuccess) {
                    results.pushCount++;
                    console.log(`🎓 Push sent to student post ${post.id}`);
                    return post.id;
                }

                return null;
            } catch (error) {
                console.error(
                    `❌ Error processing student post ${post.id}:`,
                    error
                );
                return null;
            }
        });

        const pushResults = await Promise.all(pushPromises);
        const successfulIds = pushResults.filter(id => id !== null) as string[];
        results.successful.push(...successfulIds);

        return results;
    }

    private async sendSMS(post: NotificationPost): Promise<boolean> {
        if (!post.phone_number) {
            console.log(`❌ No phone number for post ${post.id}`);
            return false;
        }

        try {
            const routing = getUzbekistanOperatorRouting(post.phone_number);

            // Generate SMS using template service with automatic shortening
            const studentName = `${post.given_name} ${post.family_name}`;
            const link = buildParentNotificationMessageUrl(
                post.student_id,
                post.id
            );

            const text = this.smsTemplateService.generateNotificationSms(
                {
                    title: post.title,
                    description: post.description ?? undefined,
                    studentName: studentName,
                    link: link,
                },
                {
                    language: (post.language as 'ja' | 'uz') || 'uz',
                }
            );

            // Analyze message for cost optimization
            const analysis = this.smsTemplateService.analyzeMessage(text);
            console.log(
                `📊 SMS Analysis: ${analysis.length} chars, ${analysis.encoding}, ${analysis.parts} part(s)`
            );

            // Send with AWS SMS for non-Uzbekistan numbers
            if (!routing.isUzbekistan) {
                console.log(
                    `🌍 International number detected: ${post.phone_number}`
                );
                let formattedPhoneNumber = post.phone_number;
                if (!formattedPhoneNumber.startsWith('+')) {
                    formattedPhoneNumber = `+${formattedPhoneNumber}`;
                }
                return await this.awsSmsService.sendSms(
                    formattedPhoneNumber,
                    text
                );
            }

            console.log(
                `🇺🇿 Uzbekistan number detected: ${post.phone_number} (${routing.operator})`
            );

            // All Uzbekistan numbers use PlayMobile
            console.log(`📤 Routing ${routing.operator} via PlayMobile API`);
            return await this.playMobileService.sendSms(
                post.phone_number,
                text,
                post.id
            );
        } catch (error) {
            console.error(`❌ Error sending SMS for post ${post.id}:`, error);
            return false;
        }
    }
}