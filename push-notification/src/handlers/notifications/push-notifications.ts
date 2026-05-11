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
            // Use the new method that gets both ARN and non-ARN users
            const posts = await this.dbQueries.fetchAllNotificationPosts();
            console.timeEnd('db-fetch');

            if (!posts.length) {
                console.log('📭 No notifications to process (queue empty).');
                console.log(
                    '   ℹ️  Bu xato emas — servis ishga tushdi, DB dan 0 ta kutilayotgan xabar topildi.'
                );
                console.log(
                    '   Student push: Post (audience=students) + PostStudent (push=0, viewed_at NULL) + Student.arn (Expo token) kerak.'
                );
                console.log(
                    '   Agar Post bor-yu PostStudent yo‘q bo‘lsa — avval backend orqali qabul qiluvchilarni yuboring (students/groups).'
                );
                return { message: 'no notifications', count: 0, total: 0 };
            }

            // Separate posts into push-enabled and SMS-only
            const pushPosts = posts.filter(
                post => post.arn && post.arn.trim() !== ''
            );
            const smsOnlyPosts = posts.filter(
                post => (!post.arn || post.arn.trim() === '') && post.sms
            );

            console.log(`📋 Processing ${posts.length} total notifications:`);
            console.log(`   📱 ${pushPosts.length} with push tokens (ARN)`);
            console.log(`   📧 ${smsOnlyPosts.length} SMS-only (no ARN)`);

            console.time('send-notifications');
            const results = await this.sendMixedNotifications(
                pushPosts,
                smsOnlyPosts
            );
            console.timeEnd('send-notifications');

            if (results.successful.length) {
                console.time('db-update');
                await this.dbQueries.updateProcessedPosts(results.successful);
                console.timeEnd('db-update');
            }

            console.log(
                `✅ Successfully processed ${results.successful.length}/${posts.length} notifications`
            );
            console.log(`   📱 Push notifications: ${results.pushCount}`);
            console.log(`   📧 SMS notifications: ${results.smsCount}`);

            return {
                message: 'success',
                count: results.successful.length,
                total: posts.length,
                push_count: results.pushCount,
                sms_only_count: results.smsOnlyCount,
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
        successful: NotificationPost[];
        pushCount: number;
        smsCount: number;
        smsOnlyCount: number;
    }> {
        const results = {
            successful: [] as NotificationPost[],
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
                        console.log(
                            `📱 Push sent: postStudentId=${post.id} studentId=${post.student_id} arn=${post.arn}`
                        );
                    } else {
                        console.error(
                            `❌ Push FAILED: postStudentId=${post.id} studentId=${post.student_id} arn=${post.arn} — push=false remains`
                        );
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

                    return hasSuccessfulNotification ? post : null;
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
            ) as NotificationPost[];
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

                    return hasSuccessfulNotification ? post : null;
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
            ) as NotificationPost[];
            results.successful.push(...successfulSmsOnlyIds);
        }

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
                    description: post.description,
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
