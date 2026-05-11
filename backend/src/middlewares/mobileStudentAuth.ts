import { NextFunction, Request, Response } from 'express';
import { Student } from '../utils/cognito-client';
import { MockCognitoClient } from '../utils/mock-cognito-client';
import DB from '../utils/db-client';
import { config } from '../config/index';

const bearerRegex = /^Bearer .+$/;

export interface ExtendedStudentRequest extends Request {
    [k: string]: any;
}

export const verifyStudentToken = async (
    req: ExtendedStudentRequest,
    res: Response,
    next: NextFunction
) => {
    const authHeader = req.headers['authorization'];

    if (!authHeader || !bearerRegex.test(authHeader)) {
        return res
            .status(401)
            .json({
                error: 'Access token is missing or invalid.',
            })
            .end();
    }

    const token = authHeader.split(' ')[1];
    const cognitoClient = config.USE_MOCK_COGNITO ? MockCognitoClient : Student;

    try {
        const userData = await cognitoClient.accessToken(token);

        const students = await DB.query(
            `SELECT * FROM Student AS st
             WHERE st.email = :email AND st.cognito_sub_id = :sub_id
             LIMIT 1`,
            {
                email: userData.email,
                sub_id: userData.sub_id,
            }
        );

        if (students.length <= 0) {
            return res
                .status(403)
                .json({
                    message: 'Student account has been deleted',
                })
                .end();
        }

        req.user = students[0];
        req.token = token;
        return next();
    } catch (e: any) {
        if (e?.status) {
            return res
                .status(e.status)
                .json({
                    message: e.message,
                })
                .end();
        }

        return res
            .status(500)
            .json({
                message: 'Internal server error',
            })
            .end();
    }
};
