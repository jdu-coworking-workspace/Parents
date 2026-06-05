import express, { NextFunction, Request, Response, Router } from 'express';
import rateLimit from 'express-rate-limit';
import { createHash, randomBytes } from 'crypto';

import { verifyToken, ExtendedRequest } from '../../../middlewares/mobileAuth';
import { Parent, Student } from '../../../utils/cognito-client';
import DB from '../../../utils/db-client';
import { IController } from '../../../utils/icontroller';
import { MockCognitoClient } from '../../../utils/mock-cognito-client';
import { config } from '../../../config';
import { ApiError } from '../../../errors/ApiError';

class MobileAuthModuleController implements IController {
    public router: Router = express.Router();
    public cognitoClient: any;
    public studentCognitoClient: any;
    private studentOAuthAttempts = new Map<string, {
        codeVerifier: string;
        expiresAt: number;
    }>();
    private forgotPasswordVerifiedPhones = new Map<string, {
        token: string;
        expiresAt: number
    }>();

    // Add general rate limiting for all auth endpoints
    private authLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 10, // limit each IP to 10 requests per windowMs
        message: {
            error: 'Too many authentication requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Stricter rate limiting for login attempts
    private loginLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 login attempts per windowMs
        message: {
            error: 'Too many login attempts from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Student initiate step has lower risk than password verification,
    // so keep a separate higher limit to avoid blocking multi-step login UX.
    private studentLoginInitiateLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 12,
        message: {
            error: 'Too many login initiation requests from this IP, please try again later.',
        },
        standardHeaders: true,
        legacyHeaders: false,
    });

    // Rate limiter for forgot password endpoint
    private forgotPasswordLimiter = rateLimit({
        windowMs: 15 * 60 * 1000, // 15 minutes
        max: 5, // limit each IP to 5 requests per windowMs
        message: {
            error: 'Too many password reset requests from this IP, please try again later.',
        },
        standardHeaders: true, // Return rate limit info in headers
        legacyHeaders: false, // Disable X-RateLimit-* headers
    });

    constructor() {
        this.cognitoClient = config.USE_MOCK_COGNITO
            ? MockCognitoClient
            : Parent;
        this.studentCognitoClient = config.USE_MOCK_COGNITO
            ? MockCognitoClient
            : Student;
        this.initRoutes();
    }

    initRoutes(): void {
        // Apply rate limiting to login
        this.router.post('/login', this.loginLimiter, this.login);
        this.router.get('/student/google', this.authLimiter, this.studentGoogleLogin);
        this.router.get(
            '/student/google/callback',
            this.authLimiter,
            this.studentGoogleCallback
        );
        this.router.post(
            '/student/login-initiate',
            this.studentLoginInitiateLimiter,
            this.studentLoginInitiate
        );
        this.router.post('/student/login', this.loginLimiter, this.studentLogin);
        this.router.post(
            '/student/change-temp-password',
            this.authLimiter,
            this.studentChangeTemporaryPassword
        );
        this.router.post(
            '/student/refresh-token',
            this.authLimiter,
            this.studentRefreshToken
        );
        this.router.post(
            '/student/change-password',
            this.authLimiter,
            this.studentChangePassword
        );
        this.router.post('/refresh-token', this.authLimiter, this.refreshToken);
        this.router.post(
            '/change-temp-password',
            this.authLimiter,
            this.changeTemporaryPassword
        );
        this.router.post(
            '/change-password',
            this.authLimiter,
            verifyToken,
            this.changePassword
        );
        this.router.post(
            '/device-token',
            this.authLimiter,
            verifyToken,
            this.deviceToken
        );
        this.router.post(
            '/student/device-token',
            this.authLimiter,
            this.studentDeviceToken
        );

        // Apply rate limiting to forgot password endpoints
        this.router.post(
            '/forgot-password-initiate',
            this.forgotPasswordLimiter,
            this.forgotPasswordInitiate
        );
        this.router.post(
            '/forgot-password-verify-code',
            this.forgotPasswordLimiter,
            this.forgotPasswordVerifyCode)
        this.router.post(
            '/forgot-password-set-password',
            this.forgotPasswordLimiter,
            this.forgotPasswordSetPassword)
        this.router.post(
            '/forgot-password-confirm',
            this.authLimiter,
            this.forgotPasswordConfirm
        );
        this.router.post('/verify-otp', this.authLimiter, this.verifyOtp);
    }

    private buildStudentSignInUrl(params: Record<string, string>): string {
        const baseUrl = 'mobilestudents://sign-in';
        const searchParams = new URLSearchParams();

        Object.entries(params).forEach(([key, value]) => {
            searchParams.set(key, value);
        });

        const queryString = searchParams.toString();
        return queryString ? `${baseUrl}?${queryString}` : baseUrl;
    }

    private generateOAuthState(): string {
        return randomBytes(32).toString('base64url');
    }

    private generatePkceCodeVerifier(): string {
        return randomBytes(64).toString('base64url');
    }

    private generatePkceCodeChallenge(codeVerifier: string): string {
        return createHash('sha256')
            .update(codeVerifier)
            .digest('base64url');
    }

    private storeStudentOAuthAttempt(state: string, codeVerifier: string): void {
        this.studentOAuthAttempts.set(state, {
            codeVerifier,
            expiresAt: Date.now() + 10 * 60 * 1000,
        });
    }

    private consumeStudentOAuthAttempt(state: string): string | null {
        const attempt = this.studentOAuthAttempts.get(state);

        if (!attempt) {
            return null;
        }

        this.studentOAuthAttempts.delete(state);

        if (attempt.expiresAt <= Date.now()) {
            return null;
        }

        return attempt.codeVerifier;
    }

    private getStudentCognitoDomain(): string {
        return config.STUDENT_COGNITO_DOMAIN || config.COGNITO_DOMAIN;
    }

    private async getGoogleUserInfo(accessToken: string) {
        const cognitoDomain = this.getStudentCognitoDomain();

        if (!cognitoDomain) {
            throw new Error('COGNITO_DOMAIN not configured');
        }

        const response = await fetch(`${cognitoDomain}/oauth2/userInfo`, {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${accessToken}`,
            },
        });

        if (!response.ok) {
            throw new ApiError(401, 'Access token is invalid.');
        }

        const data = await response.json();
        return {
            email: data.email as string,
            sub_id: data.sub as string,
        };
    }

    studentGoogleLogin = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const cognitoDomain = this.getStudentCognitoDomain();
            const clientId = config.STUDENT_CLIENT_ID;
            const callbackUrl = `${config.BACKEND_URL}/mobile/student/google/callback`;
            const state = this.generateOAuthState();
            const codeVerifier = this.generatePkceCodeVerifier();
            const codeChallenge = this.generatePkceCodeChallenge(codeVerifier);

            if (!cognitoDomain || !clientId || !config.BACKEND_URL) {
                throw new ApiError(500, 'Cognito configuration missing');
            }

            this.storeStudentOAuthAttempt(state, codeVerifier);

            const cognitoUrl =
                `${cognitoDomain}/oauth2/authorize?` +
                `response_type=code&` +
                `client_id=${clientId}&` +
                `redirect_uri=${encodeURIComponent(callbackUrl)}&` +
                `identity_provider=Google&` +
                `prompt=select_account&` +
                `scope=${encodeURIComponent('openid email profile')}&` +
                `state=${encodeURIComponent(state)}&` +
                `code_challenge=${encodeURIComponent(codeChallenge)}&` +
                `code_challenge_method=S256`;

            return res.redirect(cognitoUrl);
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    studentGoogleCallback = async (req: Request, res: Response) => {
        try {
            const { code, error, state } = req.query;

            if (error) {
                const url = this.buildStudentSignInUrl({
                    error: 'oauth_error',
                });
                return res.redirect(url);
            }

            if (!code) {
                throw new ApiError(400, 'Authorization code missing');
            }

            if (!state || typeof state !== 'string') {
                throw new ApiError(400, 'Invalid OAuth state');
            }

            const codeVerifier = this.consumeStudentOAuthAttempt(state);

            if (!codeVerifier) {
                throw new ApiError(400, 'Invalid or expired OAuth state');
            }

            const redirectUri = `${config.BACKEND_URL}/mobile/student/google/callback`;
            const tokenResponse = await this.exchangeCodeForTokens(
                code as string,
                redirectUri,
                config.STUDENT_CLIENT_ID,
                codeVerifier
            );

            if (!tokenResponse.access_token) {
                throw new ApiError(400, 'Failed to get access token');
            }

            const userData = await this.getGoogleUserInfo(
                tokenResponse.access_token
            );

            const students = await DB.query(
                `SELECT
                    st.id,
                    st.email,
                    st.phone_number,
                    st.given_name,
                    st.family_name,
                    st.cognito_sub_id,
                    sc.name AS school_name
                FROM Student AS st
                INNER JOIN School AS sc ON sc.id = st.school_id
                WHERE st.email = :email
                LIMIT 1`,
                { email: userData.email }
            );

            if (students.length <= 0) {
                const url = this.buildStudentSignInUrl({
                    error: 'user_not_found',
                });
                return res.redirect(url);
            }

            const student = students[0];

            await DB.execute(
                `UPDATE Student
                 SET last_login_at = NOW(),
                     cognito_sub_id = CASE
                        WHEN cognito_sub_id IS NULL OR cognito_sub_id = ''
                        THEN :cognito_sub_id
                        ELSE cognito_sub_id
                     END
                 WHERE id = :id`,
                {
                    id: student.id,
                    cognito_sub_id: userData.sub_id,
                }
            );

            const url = this.buildStudentSignInUrl({
                access_token: tokenResponse.access_token,
                ...(tokenResponse.refresh_token
                    ? { refresh_token: tokenResponse.refresh_token }
                    : {}),
                user: JSON.stringify({
                    id: student.id,
                    email: student.email,
                    phone_number: student.phone_number,
                    given_name: student.given_name,
                    family_name: student.family_name,
                }),
                school_name: student.school_name ?? '',
            });

            return res.redirect(url);
        } catch (e: any) {
            console.error('Student Google callback error:', e);
            const url = this.buildStudentSignInUrl({
                error: 'callback_error',
            });
            return res.redirect(url);
        }
    };

    private async exchangeCodeForTokens(
        code: string,
        redirectUri: string,
        clientId: string,
        codeVerifier: string
    ) {
        const cognitoDomain = this.getStudentCognitoDomain();

        if (!cognitoDomain) {
            throw new Error('COGNITO_DOMAIN not configured');
        }

        const tokenUrl = `${cognitoDomain}/oauth2/token`;

        const params = new URLSearchParams({
            grant_type: 'authorization_code',
            client_id: clientId,
            code,
            redirect_uri: redirectUri,
            code_verifier: codeVerifier,
        });

        const response = await fetch(tokenUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
            },
            body: params.toString(),
        });

        if (!response.ok) {
            throw new ApiError(400, 'Failed to exchange code for tokens');
        }

        return response.json();
    }

    forgotPasswordInitiate = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { phone_number } = req.body;

            // Validate phone number
            if (!phone_number) {
                throw new ApiError(400, 'Phone number is required');
            }

            // Clean phone number for database lookup (remove + and any spaces)
            let cleanPhoneNumber = phone_number.replace(/\s+/g, ''); // Remove spaces
            if (cleanPhoneNumber.startsWith('+')) {
                cleanPhoneNumber = cleanPhoneNumber.slice(1); // Remove + for database
            }

            // Check if user exists in database first
            const parents = await DB.query(
                `SELECT phone_number, email FROM Parent WHERE phone_number = :phone_number`,
                {
                    phone_number: cleanPhoneNumber,
                }
            );

            if (parents.length === 0) {
                // For security, we still return success message even if user doesn't exist
                return res
                    .status(200)
                    .json({
                        message_key: 'registrationCodeSent',
                        message:
                            'If this phone number is registered, you will receive a verification code',
                    })
                    .end();
            }

            // Format phone number for Cognito (must have + prefix)
            const cognitoPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            try {
                // First, try to verify the user's phone number if it's not verified
                const verificationStatus =
                    await this.cognitoClient.checkUserVerificationStatus(
                        cognitoPhoneNumber
                    );

                if (!verificationStatus.phoneVerified) {
                    await this.cognitoClient.verifyPhoneNumber(
                        cognitoPhoneNumber
                    );
                } else {
                    console.log('Phone already verified');
                }
            } catch {
                throw new ApiError(
                    400,
                    'Phone number verification failed. Please contact support.'
                );
            }

            // Call Cognito forgot password (this will send SMS)
            const result =
                await this.cognitoClient.forgotPassword(cognitoPhoneNumber);

            return res
                .status(200)
                .json({
                    message: result.message,
                })
                .end();
        } catch (e: any) {
            // Handle specific Cognito errors
            if (e?.name === 'InvalidParameterException') {
                if (
                    e?.message &&
                    e.message.includes('no registered/verified')
                ) {
                    return next(
                        new ApiError(
                            400,
                            'Phone number verification failed. Please contact support.'
                        )
                    );
                }
                return next(new ApiError(400, 'Invalid phone number format'));
            }

            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    forgotPasswordConfirm = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { phone_number, verification_code, new_password } = req.body;

            // Validate required fields
            if (!phone_number || !verification_code || !new_password) {
                throw new ApiError(
                    400,
                    'Phone number, verification code, and new password are required'
                );
            }

            // Format phone number for Cognito
            const fullPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            // Confirm forgot password with Cognito
            const result = await this.cognitoClient.confirmForgotPassword(
                fullPhoneNumber,
                verification_code,
                new_password
            );

            return res
                .status(200)
                .json({
                    message: result.message,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    forgotPasswordVerifyCode = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { phone_number, verification_code } = req.body;

            // ✅ Validation qo'shildi
            if (!phone_number || !verification_code) {
                throw new ApiError(400, 'Phone number and verification code are required');
            }

            // ✅ fullPhoneNumber aniqlandi
            const fullPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            const result = await this.cognitoClient.verifyForgotPasswordCode(
                fullPhoneNumber,
                verification_code
            );

            this.forgotPasswordVerifiedPhones.set(fullPhoneNumber, {
                token: result.resetToken,
                expiresAt: Date.now() + 10 * 60 * 1000,
            });

            return res.status(200).json({
                message_key: 'verificationCodeVerified',
                message: 'Verification code verified successfully',
                reset_token: result.resetToken,
            }).end();

        } catch (e: any) {
            // ✅ Phone enumeration oldini olish
            if (e?.status === 404) {
                return next(new ApiError(400, 'Invalid verification code'));
            }
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    forgotPasswordSetPassword = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { phone_number, new_password, reset_token } = req.body;

            if (!phone_number || !new_password || !reset_token) {
                throw new ApiError(
                    400,
                    'Phone number, new password and reset token are required'
                );
            }

            const fullPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            const stored =
                this.forgotPasswordVerifiedPhones.get(fullPhoneNumber);

            // Token mavjudligi, muddati va qiymati tekshirilmoqda
            if (
                !stored ||
                stored.expiresAt <= Date.now() ||
                stored.token !== reset_token
            ) {
                this.forgotPasswordVerifiedPhones.delete(fullPhoneNumber);
                throw new ApiError(
                    401,
                    'OTP not verified or verification session expired'
                );
            }

            const result =
                await this.cognitoClient.setPasswordAfterForgotPasswordVerification(
                    fullPhoneNumber,
                    new_password
                );

            // Muvaffaqiyatli bo'lgandan keyin o'chirish
            this.forgotPasswordVerifiedPhones.delete(fullPhoneNumber);

            return res.status(200).json({ message: result.message }).end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    private normalizeToken(raw: any): string | null {
        if (!raw) return null;
        if (typeof raw === 'string') return raw.trim();
        if (typeof raw === 'object' && typeof raw.data === 'string')
            return raw.data.trim();
        return null;
    }

    deviceToken = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            if (
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw new ApiError(401, 'Invalid Device Token');
            }

            await DB.execute(`UPDATE Parent SET arn = :arn WHERE id = :id;`, {
                id: req.user.id,
                arn: normalizedToken,
            });

            return res
                .status(200)
                .json({
                    message_key: 'deviceTokenUpdated',
                    message: 'Device token updated successfully',
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    studentDeviceToken = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const authHeader = req.headers['authorization'];

            if (!authHeader || !/^Bearer .+$/.test(authHeader)) {
                return res
                    .status(401)
                    .json({
                        message: 'Access token is missing or invalid.',
                    })
                    .end();
            }

            const accessToken = authHeader.split(' ')[1];
            const authUser = await this.studentCognitoClient.accessToken(
                accessToken
            );
            const students = await DB.query(
                `SELECT st.id
                 FROM Student AS st
                 WHERE st.email = :email
                    OR st.cognito_sub_id = :cognito_sub_id
                 LIMIT 1`,
                {
                    email: authUser.email,
                    cognito_sub_id: authUser.sub_id,
                }
            );

            if (students.length <= 0) {
                return res
                    .status(403)
                    .json({
                        message: 'Student account has not been registered',
                    })
                    .end();
            }

            const { token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            if (
                normalizedToken == null ||
                normalizedToken === '[object Object]'
            ) {
                throw new ApiError(401, 'Invalid Device Token');
            }

            await DB.execute(`UPDATE Student SET arn = :arn WHERE id = :id;`, {
                id: students[0].id,
                arn: normalizedToken,
            });

            return res
                .status(200)
                .json({
                    message_key: 'deviceTokenUpdated',
                    message: 'Device token updated successfully',
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    changePassword = async (
        req: ExtendedRequest,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { previous_password, new_password } = req.body;
            await this.cognitoClient.changePassword(
                req.token,
                previous_password,
                new_password
            );

            return res
                .status(200)
                .json({
                    message_key: 'passwordChangedSuccess',
                    message: 'Password changed successfully',
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    studentChangePassword = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const authHeader = req.headers['authorization'];
            if (!authHeader || !/^Bearer .+$/.test(authHeader)) {
                return res
                    .status(401)
                    .json({
                        message: 'Access token is missing or invalid.',
                    })
                    .end();
            }

            const token = authHeader.split(' ')[1];
            const { previous_password, new_password } = req.body;

            if (!previous_password || !new_password) {
                return res
                    .status(400)
                    .json({
                        message: 'Current password and new password are required',
                    })
                    .end();
            }

            await this.studentCognitoClient.accessToken(token);

            try {
                await this.studentCognitoClient.changePassword(
                    token,
                    previous_password,
                    new_password
                );
            } catch (e: any) {
                if (e?.status === 401) {
                    throw new ApiError(
                        400,
                        'invalidCurrentPassword',
                        'invalidCurrentPassword'
                    );
                }

                throw e;
            }

            return res
                .status(200)
                .json({
                    message_key: 'passwordChangedSuccess',
                    message: 'Password changed successfully',
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    login = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { phone_number, password, token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            const formattedPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;
            // OTP Flow: If no password, initiate phone sign-in
            if (!password) {
                const result =
                    await this.cognitoClient.signInWithPhone(
                        formattedPhoneNumber
                    );
                return res.status(200).json(result).end();
            }

            const authData = await this.cognitoClient.login(
                formattedPhoneNumber,
                password
            );

            const parents = await DB.query(
                `SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`,
                {
                    phone_number: formattedPhoneNumber.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw new ApiError(401, 'Invalid phone_number or password');
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(
                    `UPDATE Parent SET last_login_at = NOW(), arn = :arn WHERE id = :id;`,
                    {
                        id: parent.id,
                        arn: normalizedToken,
                    }
                );
            } catch (error) {
                console.error('Error during updating device token:', error);
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: parent.id,
                        email: parent.email,
                        phone_number: parent.phone_number,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                    },
                    school_name: parent.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status === 401) {
                // Add message_key for login failures so client can translate
                return res.status(401).json({
                    error: e.message,
                    message_key: 'invalidUsernameOrPassword',
                }).end();
            }
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    studentLoginInitiate = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { email } = req.body;

            if (!email) {
                throw new ApiError(400, 'Email is required');
            }

            const students = await DB.query(
                `SELECT st.id, st.email
                FROM Student AS st
                WHERE st.email = :email
                LIMIT 1`,
                { email }
            );

            if (students.length <= 0) {
                throw new ApiError(
                    404,
                    'Email address not found in the system. Please contact your school administrator.'
                );
            }

            try {
                await this.studentCognitoClient.resendTemporaryPassword(email);
            } catch (e: any) {
                if (e?.status === 404) {
                    // User doesn't exist, register them
                    const registeredStudent =
                        await this.studentCognitoClient.register(
                            email,
                            email,
                            ''
                        );

                    await this.syncStudentCognitoSub(email, registeredStudent.sub_id);
                } else if (e?.status === 400) {
                    // User already activated (status is not FORCE_CHANGE_PASSWORD)
                    // Return generic success message so they can proceed to login directly
                } else {
                    throw e;
                }
            }

            return res
                .status(200)
                .json({
                    message_key: 'temporaryPasswordIfRegistered',
                    message:
                        'If the email is registered, a temporary password has been sent.',
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    studentLogin = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { email, password } = req.body;

            if (!email || !password) {
                throw new ApiError(400, 'Email and password are required');
            }

            const students = await DB.query(
                `SELECT
                    st.id,
                    st.email,
                    st.phone_number,
                    st.given_name,
                    st.family_name,
                    sc.name AS school_name
                FROM Student AS st
                INNER JOIN School AS sc ON sc.id = st.school_id
                WHERE st.email = :email
                LIMIT 1`,
                { email }
            );

            if (students.length <= 0) {
                throw new ApiError(401, 'Invalid email or password');
            }

            let authData;
            try {
                authData = await this.studentCognitoClient.login(email, password);
            } catch (e: any) {
                throw e;
            }

            const authUser = await this.studentCognitoClient.accessToken(
                authData.accessToken
            );
            await this.syncStudentCognitoSub(email, authUser.sub_id);

            const student = students[0];

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: student.id,
                        email: student.email,
                        phone_number: student.phone_number,
                        given_name: student.given_name,
                        family_name: student.family_name,
                    },
                    school_name: student.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status === 401) {
                // Add message_key for login failures so client can translate
                return res.status(401).json({
                    error: e.message,
                    message_key: 'invalidUsernameOrPassword',
                }).end();
            }
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    studentChangeTemporaryPassword = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { email, temp_password, new_password } = req.body;

            if (!email || !temp_password || !new_password) {
                throw new ApiError(
                    400,
                    'Email, temp password and new password are required'
                );
            }

            const students = await DB.query(
                `SELECT
                    st.id,
                    st.email,
                    st.phone_number,
                    st.given_name,
                    st.family_name,
                    sc.name AS school_name
                FROM Student AS st
                INNER JOIN School AS sc ON sc.id = st.school_id
                WHERE st.email = :email
                LIMIT 1`,
                { email }
            );

            if (students.length <= 0) {
                throw new ApiError(401, 'Invalid email or password');
            }

            const authData = await this.studentCognitoClient.changeTempPassword(
                email,
                temp_password,
                new_password
            );

            const authUser = await this.studentCognitoClient.accessToken(
                authData.accessToken
            );
            await this.syncStudentCognitoSub(email, authUser.sub_id);

            const student = students[0];

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: student.id,
                        email: student.email,
                        phone_number: student.phone_number,
                        given_name: student.given_name,
                        family_name: student.family_name,
                    },
                    school_name: student.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    syncStudentCognitoSub = async (email: string, cognitoSubId: string) => {
        if (!cognitoSubId) {
            return;
        }

        await DB.execute(
            `UPDATE Student
             SET cognito_sub_id = :cognito_sub_id
             WHERE email = :email
               AND (cognito_sub_id IS NULL OR cognito_sub_id = '')`,
            {
                email,
                cognito_sub_id: cognitoSubId,
            }
        );
    };

    studentRefreshToken = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { refresh_token } = req.body;
            const authData =
                await this.studentCognitoClient.refreshToken(refresh_token);

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: refresh_token,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    refreshToken = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { refresh_token } = req.body;
            const authData =
                await this.cognitoClient.refreshToken(refresh_token);

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: refresh_token,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    changeTemporaryPassword = async (
        req: Request,
        res: Response,
        next: NextFunction
    ) => {
        try {
            const { phone_number, temp_password, new_password, token } =
                req.body;
            const normalizedToken = this.normalizeToken(token);
            const authData = await this.cognitoClient.changeTempPassword(
                phone_number,
                temp_password,
                new_password
            );

            const parents = await DB.query(
                `SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`,
                {
                    phone_number: phone_number.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                throw new ApiError(401, 'Invalid phone number or password');
            }

            const parent = parents[0];

            try {
                // const endpoint = await ParentsSNS.createEndpoint(token)
                await DB.execute(
                    `UPDATE Parent SET arn = :arn WHERE id = :id;`,
                    {
                        id: parent.id,
                        arn: normalizedToken,
                    }
                );
            } catch (error) {
                console.error('Error during updating device token:', error);
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: parent.id,
                        email: parent.email,
                        phone_number: parent.phone_number,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                    },
                    school_name: parent.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };

    verifyOtp = async (req: Request, res: Response, next: NextFunction) => {
        try {
            const { phone_number, code, session, token } = req.body;
            const normalizedToken = this.normalizeToken(token);

            let formattedPhoneNumber = phone_number.startsWith('+')
                ? phone_number
                : `+${phone_number}`;

            const authData = await this.cognitoClient.respondToAuthChallenge(
                formattedPhoneNumber,
                code,
                session
            );

            const parents = await DB.query(
                `SELECT
                pa.id,pa.email,pa.phone_number,
                pa.given_name,pa.family_name,
                sc.name AS school_name
            FROM Parent AS pa
            INNER JOIN School AS sc ON sc.id = pa.school_id
            WHERE pa.phone_number = :phone_number`,
                {
                    phone_number: formattedPhoneNumber.slice(1),
                }
            );

            if (
                parents.length <= 0 ||
                normalizedToken == null ||
                normalizedToken == '[object Object]'
            ) {
                // Note: Auth success but user not found in DB or invalid token
                // In production might want to handle differently
                throw new ApiError(401, 'User not found in database');
            }

            const parent = parents[0];

            try {
                await DB.execute(
                    `UPDATE Parent SET last_login_at = NOW(), arn = :arn WHERE id = :id;`,
                    {
                        id: parent.id,
                        arn: normalizedToken,
                    }
                );
            } catch (error) {
                console.error('Error during updating device token:', error);
            }

            return res
                .status(200)
                .json({
                    access_token: authData.accessToken,
                    refresh_token: authData.refreshToken,
                    user: {
                        id: parent.id,
                        email: parent.email,
                        phone_number: parent.phone_number,
                        given_name: parent.given_name,
                        family_name: parent.family_name,
                    },
                    school_name: parent.school_name,
                })
                .end();
        } catch (e: any) {
            if (e?.status === 401 && e?.session) {
                // Wrong OTP but retries allowed — return new session to client
                return res
                    .status(401)
                    .json({ error: e.message, session: e.session });
            }
            if (e?.status) return next(new ApiError(e.status, e.message));
            return next(e);
        }
    };
}

export default MobileAuthModuleController;
