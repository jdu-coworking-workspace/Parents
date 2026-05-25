import { NextFunction, Request, Response } from 'express';
import { Student } from '../utils/cognito-client';
import { MockCognitoClient } from '../utils/mock-cognito-client';
import DB from '../utils/db-client';
import { config } from '../config';

const bearerRegex = /^Bearer .+$/;

export interface ExtendedRequest extends Request {
    [k: string]: any;
}

export const verifyStudentToken = async (
    req: ExtendedRequest,
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
        let userData;
        try {
            userData = await cognitoClient.accessToken(token);
        } catch (cognitoError: any) {
            if (cognitoError.status === 401) {
                return res
                    .status(401)
                    .json({
                        message: cognitoError.message,
                    })
                    .end();
            }

            throw cognitoError;
        }

        const students = await DB.query(
            `SELECT
                st.*,
                sc.name AS school_name
             FROM Student AS st
             INNER JOIN School AS sc ON sc.id = st.school_id
             WHERE st.email = :email
               AND (st.cognito_sub_id IS NULL OR st.cognito_sub_id = '' OR st.cognito_sub_id = :sub_id)`,
            {
                email: userData.email,
                sub_id: userData.sub_id,
            }
        );

        if (students.length <= 0) {
            return res
                .status(403)
                .json({
                    message:
                        'Student account has been deleted or is not linked',
                })
                .end();
        }

        const student = students[0];

        req.user = student;
        req.token = token;
        return next();
    } catch (e: any) {
        if (e.status) {
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
