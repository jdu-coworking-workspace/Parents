import { NextFunction, Request, Response } from 'express';
import { Parent, Student } from '../utils/cognito-client';
import { MockCognitoClient } from '../utils/mock-cognito-client';
import DB from '../utils/db-client';
import { config } from '../config/index';

const bearerRegex = /^Bearer .+$/;

export interface ExtendedRequest extends Request {
    [k: string]: any;
}

export const verifyToken = async (
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
    const cognitoClient = config.USE_MOCK_COGNITO ? MockCognitoClient : Parent;

    try {
        let userData;
        try {
            userData = await cognitoClient.accessToken(token);
        } catch (cognitoError: any) {
            // Cognito returned 401 - token invalid or user deleted
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

        const parents = await DB.query(
            `SELECT * FROM Parent as pa
            WHERE pa.phone_number = :phone_number and pa.cognito_sub_id = :sub_id`,
            {
                phone_number: userData.phone_number.slice(1),
                sub_id: userData.sub_id,
            }
        );

        if (parents.length <= 0) {
            // Parent was deleted from database - return 403 Forbidden
            return res
                .status(403)
                .json({
                    message: 'Parent account has been deleted',
                })
                .end();
        }

        const parent = parents[0];

        req.user = parent;
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
            `SELECT st.id,
                    st.email,
                    st.phone_number,
                    st.given_name,
                    st.family_name
             FROM Student AS st
             WHERE st.email = :email
                OR st.cognito_sub_id = :sub_id
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
                    message: 'Student account has not been registered',
                })
                .end();
        }

        req.user = students[0];
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
